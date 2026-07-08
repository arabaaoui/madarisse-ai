"""
Human-in-the-loop (HITL) — exécution des actions après confirmation.

Pattern :
1. L'agent propose une action → INSERT agent_action_logs (status=pending)
2. Le front affiche le canvas → l'humain clique Valider ou Annuler
3. /action/confirm → execute_action() → UPDATE status=confirmed
4. /action/cancel  → UPDATE status=cancelled

Toutes les écritures sensibles passent par ce module.
"""

import json
from datetime import datetime, timezone
from fastapi import HTTPException
import structlog

from .auth import AgentContext, get_supabase_system_client, get_supabase_client_for_user

logger = structlog.get_logger()


async def propose_action(
    action_type: str,
    payload: dict,
    snapshot_before: dict | None,
    agent_id: str,
    ctx: AgentContext,
) -> str:
    """
    Enregistre une action proposée dans agent_action_logs (status=pending).
    Retourne l'UUID du log pour que le front puisse confirmer/annuler.
    """
    system_client = get_supabase_system_client()
    result = system_client.table("agent_action_logs").insert({
        "tenant_id": ctx.tenant_id,
        "user_id": ctx.user_id,
        "agent_id": agent_id,
        "action_type": action_type,
        "payload": payload,
        "snapshot_before": snapshot_before,
        "status": "pending",
    }).execute()

    if not result.data:
        raise RuntimeError("Failed to create agent_action_log")

    action_log_id = result.data[0]["id"]
    logger.info("action_proposed", action_type=action_type, action_log_id=action_log_id)
    return action_log_id


async def confirm_action_log(action_log_id: str, ctx: AgentContext) -> dict:
    """
    Confirme une action HITL :
    1. Récupère le log (vérifie tenant + statut pending)
    2. Exécute l'action réelle (appel RPC Supabase avec JWT user)
    3. Met à jour le log (status=confirmed, snapshot_after)
    """
    system_client = get_supabase_system_client()

    # Récupère le log
    result = system_client.table("agent_action_logs").select("*") \
        .eq("id", action_log_id) \
        .eq("tenant_id", ctx.tenant_id) \
        .single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Action log not found")

    log = result.data
    if log["status"] != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Action already {log['status']}"
        )

    # Exécute l'action avec le JWT utilisateur (RLS hérité)
    user_client = get_supabase_client_for_user(ctx.user_jwt)
    try:
        snapshot_after = await _dispatch_action(log["action_type"], log["payload"], user_client, ctx)

        # Marque comme confirmé
        system_client.table("agent_action_logs").update({
            "status": "confirmed",
            "snapshot_after": snapshot_after,
            "confirmed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", action_log_id).execute()

        logger.info("action_confirmed", action_type=log["action_type"], action_log_id=action_log_id)
        return {"status": "confirmed", "snapshot_after": snapshot_after}

    except Exception as e:
        # Marque comme failed
        system_client.table("agent_action_logs").update({
            "status": "failed",
            "error_message": str(e),
        }).eq("id", action_log_id).execute()
        logger.error("action_failed", action_type=log["action_type"], error=str(e))
        raise HTTPException(status_code=500, detail=f"Action execution failed: {e}")


async def cancel_action_log(action_log_id: str, ctx: AgentContext) -> dict:
    """Annule une action HITL (status → cancelled)."""
    system_client = get_supabase_system_client()
    result = system_client.table("agent_action_logs").update({"status": "cancelled"}) \
        .eq("id", action_log_id) \
        .eq("tenant_id", ctx.tenant_id) \
        .eq("status", "pending") \
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Pending action log not found")

    logger.info("action_cancelled", action_log_id=action_log_id)
    return {"status": "cancelled"}


async def _dispatch_action(action_type: str, payload: dict, user_client, ctx: AgentContext) -> dict:
    """
    Dispatche l'exécution réelle selon le type d'action.
    Chaque handler appelle la RPC Supabase correspondante avec le client JWT user.
    """
    # Actions Phase 1 (à compléter par phase)
    handlers = {
        "enrollment.create": _execute_enrollment_create,
        "enrollment.validate": _execute_enrollment_validate,
        "payment.record": _execute_payment_record,
        # Phase 2+
        # "relance.send": _execute_relance_send,
        # "academic_year.clone": _execute_year_clone,
    }

    handler = handlers.get(action_type)
    if not handler:
        raise ValueError(f"Unknown action type: {action_type}")

    return await handler(payload, user_client, ctx)


async def _execute_enrollment_create(payload: dict, user_client, ctx: AgentContext) -> dict:
    """Crée une inscription via Supabase (avec RLS user)."""
    result = user_client.table("enrollments").insert({
        "tenant_id": ctx.tenant_id,
        "student_id": payload["student_id"],
        "class_id": payload["class_id"],
        "academic_year_id": payload["academic_year_id"],
        "enrollment_fee": payload.get("enrollment_fee", 0),
        "tuition_fee": payload.get("tuition_fee", 0),
        "status": "pending",
    }).execute()
    return result.data[0] if result.data else {}


async def _execute_enrollment_validate(payload: dict, user_client, ctx: AgentContext) -> dict:
    """Valide une inscription (status → confirmed)."""
    enrollment_ids = payload["enrollment_ids"]
    result = user_client.table("enrollments").update({"status": "confirmed"}) \
        .in_("id", enrollment_ids) \
        .eq("tenant_id", ctx.tenant_id) \
        .execute()
    return {"validated_count": len(result.data or [])}


async def _execute_payment_record(payload: dict, user_client, ctx: AgentContext) -> dict:
    """Enregistre un paiement."""
    result = user_client.table("accounting_transactions").insert({
        "tenant_id": ctx.tenant_id,
        "student_id": payload["student_id"],
        "amount": payload["amount"],
        "payment_method": payload.get("payment_method", "cash"),
        "transaction_date": payload.get("transaction_date"),
        "payment_item_id": payload.get("payment_item_id"),
        "notes": payload.get("notes"),
    }).execute()
    return result.data[0] if result.data else {}
