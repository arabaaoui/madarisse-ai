"""
Tools inscription/élèves — Phase 1.
Mix lecture (RLS via JWT) + proposition d'action (HITL via hitl.propose_action).
"""

from google.adk.tools import FunctionTool
from core.auth import AgentContext, get_supabase_client_for_user
from core.hitl import propose_action


def search_student(query: str, ctx: AgentContext) -> list[dict]:
    """
    Recherche un élève par nom (fuzzy search côté Supabase).
    RLS : uniquement dans le tenant de l'utilisateur.

    Args:
        query: Nom ou prénom de l'élève (ex: "Yassine", "Alaoui")
        ctx: Contexte agent

    Returns:
        Liste d'élèves correspondants (max 10)
    """
    client = get_supabase_client_for_user(ctx.user_jwt)

    # Recherche insensible à la casse sur nom ou prénom
    result = client.table("students") \
        .select("id, first_name, last_name, class_id, classes(name)") \
        .eq("tenant_id", ctx.tenant_id) \
        .or_(f"first_name.ilike.%{query}%,last_name.ilike.%{query}%") \
        .limit(10) \
        .execute()

    return [
        {
            "id": r["id"],
            "name": f"{r['first_name']} {r['last_name']}",
            "class_name": r["classes"]["name"] if r.get("classes") else None,
            "class_id": r["class_id"],
        }
        for r in (result.data or [])
    ]


def get_pending_enrollments(ctx: AgentContext) -> list[dict]:
    """
    Retourne les inscriptions en attente de validation du jour.
    RLS : uniquement dans le tenant de l'utilisateur.

    Returns:
        Liste des inscriptions en attente avec détails élève/classe
    """
    from datetime import date
    client = get_supabase_client_for_user(ctx.user_jwt)

    result = client.table("enrollments") \
        .select("""
            id, status, enrollment_fee, tuition_fee, created_at,
            students!inner(first_name, last_name),
            classes!inner(name),
            academic_years!inner(year)
        """) \
        .eq("tenant_id", ctx.tenant_id) \
        .eq("status", "pending") \
        .gte("created_at", date.today().isoformat()) \
        .order("created_at", desc=True) \
        .limit(50) \
        .execute()

    return [
        {
            "id": r["id"],
            "student_name": f"{r['students']['first_name']} {r['students']['last_name']}",
            "class_name": r["classes"]["name"],
            "academic_year": r["academic_years"]["year"],
            "enrollment_fee": r["enrollment_fee"],
            "tuition_fee": r["tuition_fee"],
            "created_at": r["created_at"],
        }
        for r in (result.data or [])
    ]


async def propose_enrollment_create(
    student_id: str,
    class_id: str,
    academic_year_id: str,
    enrollment_fee: float,
    tuition_fee: float,
    ctx: AgentContext,
) -> dict:
    """
    HITL — Propose la création d'une inscription.
    Ne crée PAS encore l'inscription — retourne un action_log_id pour que
    le front affiche le canvas de confirmation.

    Args:
        student_id: UUID de l'élève
        class_id: UUID de la classe
        academic_year_id: UUID de l'année scolaire
        enrollment_fee: Frais d'inscription (MAD)
        tuition_fee: Frais de scolarité mensuel (MAD)
        ctx: Contexte agent

    Returns:
        {"action_log_id": "...", "canvas_type": "enrollment.create", "preview": {...}}
    """
    client = get_supabase_client_for_user(ctx.user_jwt)

    # Récupère les détails pour le canvas
    student = client.table("students").select("first_name, last_name").eq("id", student_id).single().execute()
    class_ = client.table("classes").select("name").eq("id", class_id).single().execute()
    year = client.table("academic_years").select("year").eq("id", academic_year_id).single().execute()

    payload = {
        "student_id": student_id,
        "class_id": class_id,
        "academic_year_id": academic_year_id,
        "enrollment_fee": enrollment_fee,
        "tuition_fee": tuition_fee,
    }

    # Snapshot de l'état actuel (pour réversibilité)
    snapshot_before = {
        "existing_enrollments": client.table("enrollments")
            .select("id, status").eq("student_id", student_id).eq("academic_year_id", academic_year_id)
            .execute().data or []
    }

    action_log_id = await propose_action(
        action_type="enrollment.create",
        payload=payload,
        snapshot_before=snapshot_before,
        agent_id="school-agent/enrollment",
        ctx=ctx,
    )

    return {
        "action_log_id": action_log_id,
        "canvas_type": "enrollment.create",
        "preview": {
            "student_name": f"{student.data['first_name']} {student.data['last_name']}",
            "class_name": class_.data["name"],
            "academic_year": year.data["year"],
            "enrollment_fee": enrollment_fee,
            "tuition_fee": tuition_fee,
            "estimated_total": enrollment_fee + (tuition_fee * 10),  # 10 mois
        },
    }


async def propose_enrollment_validate(
    enrollment_ids: list[str],
    ctx: AgentContext,
) -> dict:
    """
    HITL — Propose la validation d'une liste d'inscriptions en attente.
    Ne valide PAS encore — retourne un action_log_id pour le canvas de confirmation.

    Args:
        enrollment_ids: Liste d'UUIDs des inscriptions à valider
        ctx: Contexte agent

    Returns:
        {"action_log_id": "...", "canvas_type": "enrollment.validate", "preview": {...}}
    """
    import structlog
    log = structlog.get_logger()

    if not enrollment_ids:
        raise ValueError("enrollment_ids ne peut pas être vide")

    client = get_supabase_client_for_user(ctx.user_jwt)

    # Récupère les détails pour le canvas
    enrollments_data = client.table("enrollments") \
        .select("id, students!inner(first_name, last_name), classes!inner(name)") \
        .in_("id", enrollment_ids) \
        .eq("tenant_id", ctx.tenant_id) \
        .execute().data or []

    previews = [
        {
            "id": e["id"],
            "student_name": f"{e['students']['first_name']} {e['students']['last_name']}",
            "class_name": e["classes"]["name"],
        }
        for e in enrollments_data
    ]

    payload = {
        "enrollment_ids": enrollment_ids,
        "count": len(enrollment_ids),
    }

    action_log_id = await propose_action(
        action_type="enrollment.validate",
        payload=payload,
        snapshot_before={"enrollment_ids": enrollment_ids},
        agent_id="school-agent/enrollment",
        ctx=ctx,
    )

    log.info("enrollment_validate_proposed", count=len(enrollment_ids), tenant_id=ctx.tenant_id)

    return {
        "action_log_id": action_log_id,
        "canvas_type": "enrollment.validate",
        "preview": {
            "count": len(enrollment_ids),
            "enrollments": previews,
        },
    }


# ADK FunctionTools
search_student_tool = FunctionTool(func=search_student)
pending_enrollments_tool = FunctionTool(func=get_pending_enrollments)
propose_enrollment_tool = FunctionTool(func=propose_enrollment_create)
propose_enrollment_validate_tool = FunctionTool(func=propose_enrollment_validate)
