"""
Tools de lecture paiement — Phase 0 (read-only, RLS hérité via JWT user).
Ces tools sont la démonstration de la Phase 0 : pas d'écriture, RLS prouvé.
"""

from google.adk.tools import FunctionTool
from core.auth import AgentContext, get_supabase_client_for_user


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
            students!inner(id, first_name, last_name),
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


# Wrap pour ADK FunctionTool
payment_stats_tool = FunctionTool(func=get_payment_stats)
unpaid_students_tool = FunctionTool(func=get_unpaid_students)
