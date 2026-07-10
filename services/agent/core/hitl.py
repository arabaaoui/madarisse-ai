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
    """
    Crée uniquement l'inscription en attente (status=pending, student_id=NULL).
    Le nom du candidat est stocké dans candidate_first_name/candidate_last_name.
    L'élève est créé lors de la validation par l'admin (enrollment.validate).
    Le trigger payment n'est pas déclenché car student_id est NULL.
    """
    enrollment_result = user_client.table("enrollments").insert({
        "tenant_id": ctx.tenant_id,
        "candidate_first_name": payload["first_name"],
        "candidate_last_name": payload["last_name"],
        "new_class": payload.get("class_name"),
        "academic_year_id": payload["academic_year_id"],
        "enrollment_fee": payload.get("enrollment_fee", 0),
        "tuition_fee": payload.get("tuition_fee", 0),
        "status": "pending",
        "enrollment_type": "new",
    }).execute()

    if not enrollment_result.data:
        raise RuntimeError("Échec création de l'inscription")

    enrollment = enrollment_result.data[0]
    logger.info("enrollment_pending_created", enrollment_id=enrollment.get("id"), tenant_id=ctx.tenant_id)
    return {"enrollment": enrollment}


async def _execute_enrollment_validate(payload: dict, user_client, ctx: AgentContext) -> dict:
    """
    Valide des inscriptions (status → confirmed) et génère l'échéancier.
    Pour les inscriptions agent sans student_id : crée l'élève depuis candidate_first/last_name.
    """
    from datetime import date
    from dateutil.relativedelta import relativedelta

    SCHEDULE_MONTHS = 10
    enrollment_ids = payload["enrollment_ids"]

    raw = user_client.table("enrollments") \
        .select("id, student_id, enrollment_fee, tuition_fee, candidate_first_name, candidate_last_name, new_class, academic_year_id") \
        .in_("id", enrollment_ids) \
        .eq("tenant_id", ctx.tenant_id) \
        .execute().data or []

    enrollments = []
    for e in raw:
        sid = e.get("student_id")

        # Inscription créée par l'agent : student_id est NULL → créer l'élève maintenant
        if not sid and e.get("candidate_first_name"):
            class_id = None
            if e.get("new_class"):
                cls_res = user_client.table("classes") \
                    .select("id") \
                    .eq("tenant_id", ctx.tenant_id) \
                    .eq("academic_year_id", e["academic_year_id"]) \
                    .ilike("name", e["new_class"]) \
                    .limit(1).execute()
                if cls_res.data:
                    class_id = cls_res.data[0]["id"]

            student_insert: dict = {
                "tenant_id": ctx.tenant_id,
                "first_name": e["candidate_first_name"],
                "last_name": e["candidate_last_name"],
                "class": e.get("new_class") or "",
                "annual_status": "pending",
                "academic_year_id": e["academic_year_id"],
            }
            if class_id:
                student_insert["class_id"] = class_id

            s_res = user_client.table("students").insert(student_insert).execute()
            if s_res.data:
                sid = s_res.data[0]["id"]
                user_client.table("enrollments").update({"student_id": sid}) \
                    .eq("id", e["id"]).eq("tenant_id", ctx.tenant_id).execute()
                logger.info("student_created_on_validate", student_id=sid, enrollment_id=e["id"])

        enrollments.append({**e, "student_id": sid})

    # Confirme toutes les inscriptions
    result = user_client.table("enrollments").update({"status": "confirmed"}) \
        .in_("id", enrollment_ids) \
        .eq("tenant_id", ctx.tenant_id) \
        .execute()

    # Génère les payment_items uniquement si le trigger ne l'a pas déjà fait
    today = date.today()
    items = []
    for e in enrollments:
        sid = e.get("student_id")
        if not sid:
            continue
        # Vérifie que le trigger n'a pas déjà créé les échéances (enrollments UI)
        existing = user_client.table("payment_items") \
            .select("id") \
            .eq("enrollment_id", e["id"]) \
            .limit(1).execute()
        if existing.data:
            continue

        if (e.get("enrollment_fee") or 0) > 0:
            items.append({
                "tenant_id": ctx.tenant_id,
                "student_id": sid,
                "enrollment_id": e["id"],
                "item_type": "enrollment_fee",
                "amount": e["enrollment_fee"],
                "paid_amount": 0,
                "remaining_amount": e["enrollment_fee"],
                "status": "pending",
                "due_date": today.isoformat(),
            })
        if (e.get("tuition_fee") or 0) > 0:
            for i in range(1, SCHEDULE_MONTHS + 1):
                due = (today + relativedelta(months=i)).replace(day=1)
                items.append({
                    "tenant_id": ctx.tenant_id,
                    "student_id": sid,
                    "enrollment_id": e["id"],
                    "item_type": "schedule",
                    "amount": e["tuition_fee"],
                    "paid_amount": 0,
                    "remaining_amount": e["tuition_fee"],
                    "status": "pending",
                    "due_date": due.isoformat(),
                })

    if items:
        user_client.table("payment_items").insert(items).execute()
        logger.info("payment_schedule_generated", count=len(items), tenant_id=ctx.tenant_id)

    return {"validated_count": len(result.data or []), "schedule_items_created": len(items)}


async def _execute_payment_record(payload: dict, user_client, ctx: AgentContext) -> dict:
    """Enregistre un paiement et met à jour l'échéance imputée."""
    from datetime import date

    amount = payload["amount"]
    payment_item_id = payload.get("payment_item_id")

    # Insert de la transaction
    tx_result = user_client.table("accounting_transactions").insert({
        "tenant_id": ctx.tenant_id,
        "student_id": payload["student_id"],
        "amount": amount,
        "payment_method": payload.get("payment_method", "cash"),
        "transaction_date": payload.get("transaction_date") or date.today().isoformat(),
        "payment_item_id": payment_item_id,
        "notes": payload.get("notes"),
    }).execute()

    transaction = tx_result.data[0] if tx_result.data else {}

    # Met à jour l'échéance imputée
    if payment_item_id:
        item = user_client.table("payment_items") \
            .select("amount, paid_amount, item_type, student_id") \
            .eq("id", payment_item_id) \
            .eq("tenant_id", ctx.tenant_id) \
            .single().execute().data

        if item:
            new_paid = round((item["paid_amount"] or 0) + amount, 2)
            new_remaining = round(item["amount"] - new_paid, 2)
            if new_remaining <= 0:
                new_status = "paid"
                new_remaining = 0
            elif new_paid > 0:
                new_status = "partial"
            else:
                new_status = "pending"

            user_client.table("payment_items").update({
                "paid_amount": new_paid,
                "remaining_amount": new_remaining,
                "status": new_status,
            }).eq("id", payment_item_id).execute()

            logger.info("payment_item_updated", payment_item_id=payment_item_id,
                        new_status=new_status, tenant_id=ctx.tenant_id)

            # Premier paiement de frais d'inscription → élève devient confirmed
            if new_status == "paid" and item.get("item_type") == "enrollment_fee":
                student_id = item.get("student_id") or payload.get("student_id")
                if student_id:
                    user_client.table("students").update({"annual_status": "confirmed"}) \
                        .eq("id", student_id) \
                        .eq("tenant_id", ctx.tenant_id) \
                        .eq("annual_status", "pending") \
                        .execute()
                    logger.info("student_activated", student_id=student_id, tenant_id=ctx.tenant_id)

    return transaction
