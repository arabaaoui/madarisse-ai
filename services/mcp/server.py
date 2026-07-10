"""
Madarisse MCP Server — exposes read-only school management tools for Claude Desktop / Cursor.
Uses FastMCP + Supabase service_role (internal use only, no user JWT).
Auth: X-MCP-Key header check at the start of each tool call.
"""

import os
from datetime import date

from fastmcp import FastMCP
from supabase import create_client, Client

from config import settings

mcp = FastMCP("madarisse")


def _get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _check_api_key(provided_key: str) -> bool:
    """Validate the MCP API key supplied by the caller."""
    return provided_key == settings.mcp_api_key


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@mcp.tool()
def search_students(query: str, tenant_id: str, api_key: str) -> list[dict]:
    """
    Search students by first or last name (case-insensitive).

    Args:
        query: Search term (partial match on first_name or last_name).
        tenant_id: School tenant UUID.
        api_key: MCP API key for authentication.

    Returns:
        List of matching students with id, first_name, last_name, class info.
    """
    if not _check_api_key(api_key):
        return [{"error": "Unauthorized — invalid api_key"}]

    sb = _get_supabase()
    result = (
        sb.table("students")
        .select("id, first_name, last_name, class_id, classes(name)")
        .eq("tenant_id", tenant_id)
        .or_(f"first_name.ilike.%{query}%,last_name.ilike.%{query}%")
        .limit(50)
        .execute()
    )
    return result.data or []


@mcp.tool()
def get_student_detail(student_id: str, tenant_id: str, api_key: str) -> dict:
    """
    Get full details for a single student including class, enrollments, and payment summary.

    Args:
        student_id: UUID of the student.
        tenant_id: School tenant UUID.
        api_key: MCP API key for authentication.

    Returns:
        Student record with nested class and enrollment info, or error dict.
    """
    if not _check_api_key(api_key):
        return {"error": "Unauthorized — invalid api_key"}

    sb = _get_supabase()
    result = (
        sb.table("students")
        .select(
            "id, first_name, last_name, date_of_birth, gender, phone, email, "
            "class_id, classes(name), "
            "enrollments(id, status, academic_year_id)"
        )
        .eq("id", student_id)
        .eq("tenant_id", tenant_id)
        .single()
        .execute()
    )
    if not result.data:
        return {"error": f"Student {student_id} not found"}
    return result.data


@mcp.tool()
def get_class_list(tenant_id: str, api_key: str) -> list[dict]:
    """
    Return all classes for the tenant.

    Args:
        tenant_id: School tenant UUID.
        api_key: MCP API key for authentication.

    Returns:
        List of classes with id, name, level, capacity.
    """
    if not _check_api_key(api_key):
        return [{"error": "Unauthorized — invalid api_key"}]

    sb = _get_supabase()
    result = (
        sb.table("classes")
        .select("id, name, level, capacity")
        .eq("tenant_id", tenant_id)
        .order("name")
        .execute()
    )
    return result.data or []


@mcp.tool()
def get_pending_enrollments(tenant_id: str, api_key: str) -> list[dict]:
    """
    Return all enrollments with status=pending for the tenant.

    Args:
        tenant_id: School tenant UUID.
        api_key: MCP API key for authentication.

    Returns:
        List of pending enrollment records with student and class info.
    """
    if not _check_api_key(api_key):
        return [{"error": "Unauthorized — invalid api_key"}]

    sb = _get_supabase()
    result = (
        sb.table("enrollments")
        .select(
            "id, status, created_at, "
            "students(id, first_name, last_name), "
            "classes(id, name)"
        )
        .eq("tenant_id", tenant_id)
        .eq("status", "pending")
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return result.data or []


@mcp.tool()
def get_payment_stats(tenant_id: str, api_key: str, class_id: str | None = None) -> dict:
    """
    Get payment statistics for the tenant, optionally filtered by class.

    Args:
        tenant_id: School tenant UUID.
        api_key: MCP API key for authentication.
        class_id: Optional class UUID to filter.

    Returns:
        Dict with totalDue, totalPaid, rate, overdueCount.
    """
    if not _check_api_key(api_key):
        return {"error": "Unauthorized — invalid api_key"}

    sb = _get_supabase()
    query = (
        sb.table("payment_items")
        .select("amount, paid_amount, status, due_date, students!inner(class_id)")
        .eq("tenant_id", tenant_id)
        .eq("item_type", "schedule")
        .neq("status", "cancelled")
    )

    if class_id:
        query = query.eq("students.class_id", class_id)

    result = query.limit(2000).execute()
    items = result.data or []

    today = date.today().isoformat()
    total_due = sum(r["amount"] for r in items)
    total_paid = sum(r.get("paid_amount") or 0 for r in items)
    overdue_count = sum(
        1 for r in items
        if r["status"] == "overdue" or (
            r.get("due_date") and r["due_date"] < today and r["status"] != "paid"
        )
    )

    return {
        "totalDue": round(total_due, 2),
        "totalPaid": round(total_paid, 2),
        "rate": round(total_paid / total_due * 100, 1) if total_due > 0 else 0,
        "overdueCount": overdue_count,
    }


@mcp.tool()
def get_unpaid_students(
    tenant_id: str,
    api_key: str,
    overdue_only: bool = False,
) -> list[dict]:
    """
    Return students who have unpaid payment items.

    Args:
        tenant_id: School tenant UUID.
        api_key: MCP API key for authentication.
        overdue_only: If True, only return items past their due_date.

    Returns:
        List of dicts with student name, class, amount due, due date, status.
    """
    if not _check_api_key(api_key):
        return [{"error": "Unauthorized — invalid api_key"}]

    sb = _get_supabase()
    query = (
        sb.table("payment_items")
        .select(
            "id, amount, remaining_amount, due_date, status, "
            "students!inner(id, first_name, last_name, classes!inner(name))"
        )
        .eq("tenant_id", tenant_id)
        .eq("item_type", "schedule")
        .neq("status", "paid")
        .neq("status", "cancelled")
    )

    if overdue_only:
        query = query.lt("due_date", date.today().isoformat())

    result = query.limit(200).execute()
    items = result.data or []

    return [
        {
            "student_id": r["students"]["id"],
            "student_name": f"{r['students']['first_name']} {r['students']['last_name']}",
            "class_name": r["students"]["classes"]["name"],
            "amount_due": r.get("remaining_amount") or r["amount"],
            "due_date": r["due_date"],
            "status": r["status"],
        }
        for r in items
    ]


@mcp.tool()
def get_recovery_rate(
    tenant_id: str,
    api_key: str,
    month: str | None = None,
) -> dict:
    """
    Calculate the payment recovery rate for the tenant for a given month.

    Args:
        tenant_id: School tenant UUID.
        api_key: MCP API key for authentication.
        month: Month in YYYY-MM format. Defaults to current month if None.

    Returns:
        Dict with totalDue, totalPaid, rate (%), overdueCount, month.
    """
    if not _check_api_key(api_key):
        return {"error": "Unauthorized — invalid api_key"}

    if month is None:
        month = date.today().strftime("%Y-%m")

    year, m = month.split("-")
    month_start = f"{month}-01"
    if int(m) == 12:
        next_month = f"{int(year) + 1}-01-01"
    else:
        next_month = f"{year}-{int(m) + 1:02d}-01"

    sb = _get_supabase()
    result = (
        sb.table("payment_items")
        .select("amount, paid_amount, remaining_amount, status, due_date")
        .eq("tenant_id", tenant_id)
        .eq("item_type", "schedule")
        .neq("status", "cancelled")
        .gte("due_date", month_start)
        .lt("due_date", next_month)
        .limit(1000)
        .execute()
    )
    items = result.data or []

    today = date.today().isoformat()
    total_due = sum(r["amount"] for r in items)
    total_paid = sum(r.get("paid_amount") or 0 for r in items)
    overdue_count = sum(
        1 for r in items
        if r["status"] == "overdue" or (
            r.get("due_date") and r["due_date"] < today and r["status"] != "paid"
        )
    )

    return {
        "month": month,
        "totalDue": round(total_due, 2),
        "totalPaid": round(total_paid, 2),
        "rate": round(total_paid / total_due * 100, 1) if total_due > 0 else 0,
        "overdueCount": overdue_count,
    }


if __name__ == "__main__":
    mcp.run()
