"""
Tools lecture élèves — fiche détail + résumé paiements.
Lecture seule — pas de HITL sur ce module.
"""

from datetime import date
import structlog
from google.adk.tools import FunctionTool
from core.auth import AgentContext, get_supabase_client_for_user

log = structlog.get_logger()


def get_student_detail(student_id: str, ctx: AgentContext) -> dict:
    """
    Retourne les informations complètes d'un élève (données + inscription active).
    RLS : uniquement les élèves du tenant de l'utilisateur.

    Args:
        student_id: UUID de l'élève
        ctx: Contexte agent

    Returns:
        Dict avec id, name, name_ar, class_name, date_of_birth, annual_status,
        enrollment_status, phone, email. {"error": ...} si introuvable.
    """
    client = get_supabase_client_for_user(ctx.user_jwt)

    result = (
        client.table("students")
        .select(
            "id, first_name, last_name, first_name_ar, last_name_ar, "
            "date_of_birth, gender, annual_status, phone, email, classes(name)"
        )
        .eq("id", student_id)
        .eq("tenant_id", ctx.tenant_id)
        .single()
        .execute()
    )

    if not result.data:
        log.warning("student_detail_not_found", student_id=student_id, tenant_id=ctx.tenant_id)
        return {"error": "Élève introuvable dans ce tenant"}

    s = result.data
    log.info("student_detail", student_id=student_id, tenant_id=ctx.tenant_id)

    enrollment = (
        client.table("enrollments")
        .select("id, status, academic_years(year)")
        .eq("student_id", student_id)
        .eq("tenant_id", ctx.tenant_id)
        .eq("status", "confirmed")
        .limit(1)
        .execute()
    )

    enrollment_status = enrollment.data[0]["status"] if enrollment.data else None

    name_ar_parts = [s.get("first_name_ar") or "", s.get("last_name_ar") or ""]
    name_ar = " ".join(p for p in name_ar_parts if p).strip() or None

    return {
        "id": s["id"],
        "name": f"{s['first_name']} {s['last_name']}",
        "name_ar": name_ar,
        "class_name": s["classes"]["name"] if s.get("classes") else None,
        "date_of_birth": s["date_of_birth"],
        "annual_status": s["annual_status"] or "pending",
        "enrollment_status": enrollment_status,
        "phone": s.get("phone"),
        "email": s.get("email"),
    }


def get_student_payment_summary(student_id: str, ctx: AgentContext) -> dict:
    """
    Résumé des paiements d'un élève (total dû, payé, retards, prochaine échéance).
    RLS : uniquement les paiements du tenant de l'utilisateur.

    Args:
        student_id: UUID de l'élève
        ctx: Contexte agent

    Returns:
        Dict avec total_due, total_paid, total_overdue, overdue_count, next_due_date.
    """
    client = get_supabase_client_for_user(ctx.user_jwt)

    items_result = (
        client.table("payment_items")
        .select("amount, paid_amount, status, due_date")
        .eq("student_id", student_id)
        .eq("tenant_id", ctx.tenant_id)
        .eq("item_type", "schedule")
        .neq("status", "cancelled")
        .execute()
    )

    items = items_result.data or []
    log.info("student_payment_summary", student_id=student_id, item_count=len(items))

    total_due = sum(r.get("amount") or 0 for r in items)
    total_paid = sum(r.get("paid_amount") or 0 for r in items)

    overdue_items = [r for r in items if r.get("status") == "overdue"]
    total_overdue = sum(
        (r.get("amount") or 0) - (r.get("paid_amount") or 0) for r in overdue_items
    )

    today = date.today().isoformat()
    pending_items = [
        r for r in items
        if r.get("status") == "pending" and r.get("due_date") and r["due_date"] >= today
    ]
    next_due_date = (
        sorted(pending_items, key=lambda r: r["due_date"])[0]["due_date"]
        if pending_items else None
    )

    return {
        "total_due": total_due,
        "total_paid": total_paid,
        "total_overdue": total_overdue,
        "overdue_count": len(overdue_items),
        "next_due_date": next_due_date,
    }


student_detail_tool = FunctionTool(func=get_student_detail)
student_payment_tool = FunctionTool(func=get_student_payment_summary)
