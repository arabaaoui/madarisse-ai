"""
Tools de lecture paiement — Phase 0 (read-only, RLS hérité via JWT user).
Ces tools sont la démonstration de la Phase 0 : pas d'écriture, RLS prouvé.
"""

import structlog
from google.adk.tools import FunctionTool
from core.auth import AgentContext, get_supabase_client_for_user
from core.hitl import propose_action

log = structlog.get_logger()

VALID_PAYMENT_METHODS = {"cash", "transfer", "check"}


def get_payment_stats(class_id: str | None, ctx: AgentContext) -> dict:
    """
    Retourne les statistiques de paiement pour une classe ou le tenant entier.
    Appelle la RPC existante `get_payment_schedules_with_stats`.
    RLS appliqué via JWT user → accès limité au tenant de l'utilisateur.

    Args:
        class_id: UUID de la classe (optionnel, None = tout le tenant)
        ctx: Contexte agent avec JWT utilisateur

    Returns:
        Dictionnaire avec total_attendu, total_encaissé, taux_recouvrement, count_en_retard
    """
    client = get_supabase_client_for_user(ctx.user_jwt)

    params = {"p_tenant_id": ctx.tenant_id}
    if class_id:
        params["p_class_id"] = class_id

    result = client.rpc("get_payment_schedules_with_stats", params).execute()

    if not result.data:
        return {
            "total_attendu": 0,
            "total_encaisse": 0,
            "taux_recouvrement": 0,
            "count_en_retard": 0,
        }

    data = result.data
    total_attendu = sum(r.get("amount", 0) for r in data)
    total_encaisse = sum(
        r.get("amount", 0) for r in data if r.get("status") == "paid"
    )
    count_en_retard = sum(1 for r in data if r.get("status") == "overdue")

    return {
        "total_attendu": total_attendu,
        "total_encaisse": total_encaisse,
        "taux_recouvrement": round(total_encaisse / total_attendu * 100, 1) if total_attendu > 0 else 0,
        "count_en_retard": count_en_retard,
        "detail": data[:50],  # limité pour éviter les tokens excessifs
    }


def get_unpaid_students(class_id: str | None, overdue_only: bool, ctx: AgentContext) -> list[dict]:
    """
    Retourne la liste des élèves avec des paiements non encaissés.
    RLS : uniquement les élèves du tenant de l'utilisateur.

    Args:
        class_id: Filtrer par classe (optionnel)
        overdue_only: Si True, uniquement les retards (échéance dépassée)
        ctx: Contexte agent

    Returns:
        Liste d'élèves avec leurs montants dus
    """
    client = get_supabase_client_for_user(ctx.user_jwt)

    query = client.table("payment_items") \
        .select("""
            id, amount, due_date, status,
            students!fk_payment_items_student_id(id, first_name, last_name),
            classes!inner(id, name)
        """) \
        .eq("tenant_id", ctx.tenant_id) \
        .eq("item_type", "schedule") \
        .neq("status", "paid") \
        .neq("status", "cancelled")

    if class_id:
        query = query.eq("students.class_id", class_id)

    if overdue_only:
        from datetime import date
        query = query.lt("due_date", date.today().isoformat())

    result = query.limit(100).execute()

    return [
        {
            "student_id": r["students"]["id"],
            "student_name": f"{r['students']['first_name']} {r['students']['last_name']}",
            "class_name": r["classes"]["name"],
            "amount_due": r["amount"],
            "due_date": r["due_date"],
            "status": r["status"],
        }
        for r in (result.data or [])
    ]


async def propose_payment_record(
    student_id: str,
    payment_item_id: str,
    amount: float,
    payment_method: str,
    ctx: AgentContext,
) -> dict:
    """
    HITL — Propose l'enregistrement d'un paiement pour une échéance donnée.
    Ne crée PAS le paiement — retourne action_log_id pour canvas de confirmation.

    Args:
        student_id: UUID de l'élève
        payment_item_id: UUID de l'échéance à imputer
        amount: Montant versé (MAD)
        payment_method: 'cash' | 'transfer' | 'check'
        ctx: Contexte agent
    """
    if payment_method not in VALID_PAYMENT_METHODS:
        raise ValueError(f"payment_method invalide : '{payment_method}'. Valeurs : {VALID_PAYMENT_METHODS}")

    client = get_supabase_client_for_user(ctx.user_jwt)

    item = client.table("payment_items") \
        .select("id, amount, paid_amount, remaining_amount, students!fk_payment_items_student_id(first_name, last_name)") \
        .eq("id", payment_item_id) \
        .eq("tenant_id", ctx.tenant_id) \
        .single().execute().data

    if not item:
        raise ValueError(f"Échéance introuvable : {payment_item_id}")

    student_name = f"{item['students']['first_name']} {item['students']['last_name']}"
    remaining = item["remaining_amount"]
    excess = round(amount - remaining, 2) if amount > remaining else 0

    payload = {
        "student_id": student_id,
        "payment_item_id": payment_item_id,
        "amount": amount,
        "payment_method": payment_method,
    }

    action_log_id = await propose_action(
        action_type="payment.record",
        payload=payload,
        snapshot_before={"payment_item": {"id": item["id"], "remaining_amount": remaining}},
        agent_id="school-agent/payment",
        ctx=ctx,
    )

    log.info("payment_proposed", student_id=student_id, amount=amount, tenant_id=ctx.tenant_id)

    preview: dict = {
        "student_name": student_name,
        "amount": amount,
        "payment_method": payment_method,
        "remaining_before": remaining,
        "remaining_after": max(0, round(remaining - amount, 2)),
    }
    if excess > 0:
        preview["overpayment_warning"] = True
        preview["excess"] = excess

    return {
        "action_log_id": action_log_id,
        "canvas_type": "payment.record",
        "preview": preview,
    }


def get_recovery_rate(
    class_id: str | None,
    month: str | None,
    ctx: AgentContext,
) -> dict:
    """
    Calcule le taux de recouvrement par classe et/ou mois.
    Lecture seule — RLS via JWT.

    Args:
        class_id: UUID de la classe (None = tout le tenant)
        month: Mois au format YYYY-MM (None = tout)
        ctx: Contexte agent

    Returns:
        { total_due, total_paid, rate, overdue_count, overdue_students }
    """
    from datetime import date

    client = get_supabase_client_for_user(ctx.user_jwt)

    query = client.table("payment_items") \
        .select("id, amount, paid_amount, remaining_amount, status, due_date, students!fk_payment_items_student_id(id, first_name, last_name, class_id)") \
        .eq("tenant_id", ctx.tenant_id) \
        .eq("item_type", "schedule") \
        .neq("status", "cancelled")

    if month:
        month_start = f"{month}-01"
        year, m = month.split("-")
        next_month = f"{year}-{int(m)+1:02d}-01" if int(m) < 12 else f"{int(year)+1}-01-01"
        query = query.gte("due_date", month_start).lt("due_date", next_month)

    if class_id:
        query = query.eq("students.class_id", class_id)

    items = query.limit(500).execute().data or []

    today = date.today().isoformat()
    total_due = sum(r["amount"] for r in items)
    total_paid = sum(r["paid_amount"] or 0 for r in items)
    overdue = [r for r in items if r["status"] == "overdue" or (
        r["due_date"] and r["due_date"] < today and r["status"] not in ("paid", "cancelled")
    )]

    # Agrège les impayés par élève
    overdue_by_student: dict[str, dict] = {}
    for r in overdue:
        sid = r["students"]["id"]
        if sid not in overdue_by_student:
            overdue_by_student[sid] = {
                "studentId": sid,
                "studentName": f"{r['students']['first_name']} {r['students']['last_name']}",
                "amountDue": 0,
            }
        overdue_by_student[sid]["amountDue"] += r["remaining_amount"] or r["amount"]

    log.info("recovery_rate_computed", tenant_id=ctx.tenant_id, month=month, class_id=class_id)

    return {
        "total_due": total_due,
        "total_paid": total_paid,
        "rate": round(total_paid / total_due * 100, 1) if total_due > 0 else 0,
        "overdue_count": len(overdue),
        "overdue_students": list(overdue_by_student.values()),
    }


# Wrap pour ADK FunctionTool
payment_stats_tool = FunctionTool(func=get_payment_stats)
unpaid_students_tool = FunctionTool(func=get_unpaid_students)
propose_payment_record_tool = FunctionTool(func=propose_payment_record)
get_recovery_rate_tool = FunctionTool(func=get_recovery_rate)
