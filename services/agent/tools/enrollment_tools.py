"""
Tools inscription/élèves — Phase 1.
Mix lecture (RLS via JWT) + proposition d'action (HITL via hitl.propose_action).
"""

from google.adk.tools import FunctionTool
from core.auth import AgentContext, get_supabase_client_for_user
from core.hitl import propose_action


def search_student(query: str, ctx: AgentContext) -> list[dict]:
    """
    Recherche un élève par nom dans la table students ET dans les inscriptions
    en attente (candidats créés par l'agent sans student_id encore).
    RLS : uniquement dans le tenant de l'utilisateur.

    Args:
        query: Nom ou prénom de l'élève (ex: "Yassine", "Alaoui")
        ctx: Contexte agent

    Returns:
        Liste d'élèves/candidats correspondants (max 10).
        type="student" → élève confirmé avec payment_items.
        type="pending_candidate" → inscription en attente, pas encore d'élève créé.
    """
    client = get_supabase_client_for_user(ctx.user_jwt)

    # 1. Recherche dans la table students
    result = client.table("students") \
        .select("id, first_name, last_name, class_id, classes(name)") \
        .eq("tenant_id", ctx.tenant_id) \
        .or_(f"first_name.ilike.%{query}%,last_name.ilike.%{query}%") \
        .limit(10) \
        .execute()

    students = [
        {
            "id": r["id"],
            "name": f"{r['first_name']} {r['last_name']}",
            "class_name": r["classes"]["name"] if r.get("classes") else None,
            "class_id": r["class_id"],
            "type": "student",
        }
        for r in (result.data or [])
    ]

    # 2. Recherche dans les inscriptions en attente créées par l'agent (student_id NULL)
    pending_result = client.table("enrollments") \
        .select("id, candidate_first_name, candidate_last_name, new_class, academic_year_id") \
        .eq("tenant_id", ctx.tenant_id) \
        .eq("status", "pending") \
        .is_("student_id", "null") \
        .or_(f"candidate_first_name.ilike.%{query}%,candidate_last_name.ilike.%{query}%") \
        .limit(10) \
        .execute()

    candidates = [
        {
            "enrollment_id": r["id"],
            "name": f"{r.get('candidate_first_name', '')} {r.get('candidate_last_name', '')}".strip(),
            "class_name": r.get("new_class"),
            "type": "pending_candidate",
            "note": "Inscription en attente de validation — l'élève sera créé à la validation. Utilisez propose_enrollment_validate avec cet enrollment_id.",
        }
        for r in (pending_result.data or [])
        if r.get("candidate_first_name")
    ]

    return students + candidates


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
            id, status, enrollment_fee, tuition_fee, new_class, created_at,
            academic_year_id, student_id, candidate_first_name, candidate_last_name,
            students(first_name, last_name)
        """) \
        .eq("tenant_id", ctx.tenant_id) \
        .eq("status", "pending") \
        .gte("created_at", date.today().isoformat()) \
        .order("created_at", desc=True) \
        .limit(50) \
        .execute()

    rows = []
    for r in (result.data or []):
        s = r.get("students")
        if s:
            student_name = f"{s['first_name']} {s['last_name']}"
        else:
            fn = r.get("candidate_first_name") or ""
            ln = r.get("candidate_last_name") or ""
            student_name = f"{fn} {ln}".strip() or "Candidat"
        rows.append({
            "id": r["id"],
            "student_name": student_name,
            "is_candidate": not bool(r.get("student_id")),
            "class_name": r.get("new_class"),
            "academic_year_id": r.get("academic_year_id"),
            "enrollment_fee": r["enrollment_fee"],
            "tuition_fee": r["tuition_fee"],
            "created_at": r["created_at"],
        })
    return rows


async def propose_enrollment_create(
    first_name: str,
    last_name: str,
    class_name: str,
    enrollment_fee: float,
    tuition_fee: float,
    ctx: AgentContext,
    academic_year_id: str = "",
    first_name_ar: str = "",
    last_name_ar: str = "",
    date_of_birth: str = "",
    gender: str = "",
    parent_name: str = "",
    phone: str = "",
) -> dict:
    """
    HITL — Propose la création d'une inscription pour un NOUVEL élève.
    L'élève n'a pas besoin d'exister au préalable — il sera créé (statut 'pending')
    lors de la confirmation. Il passe 'confirmed' au premier paiement validé.

    Args:
        first_name: Prénom de l'élève
        last_name: Nom de famille de l'élève
        class_name: Nom de la classe (ex: "CE2", "CM1") — l'UUID est résolu automatiquement
        enrollment_fee: Frais d'inscription (MAD)
        tuition_fee: Frais de scolarité mensuel (MAD)
        academic_year_id: UUID de l'année scolaire (optionnel — année active par défaut)
        first_name_ar: Prénom en arabe (optionnel)
        last_name_ar: Nom en arabe (optionnel)
        date_of_birth: Date de naissance YYYY-MM-DD (optionnel)
        gender: Sexe 'M' ou 'F' (optionnel)
        parent_name: Nom du parent/tuteur (optionnel)
        phone: Téléphone du parent (optionnel)
        ctx: Contexte agent

    Returns:
        {"action_log_id": "...", "canvas_type": "enrollment.create", "preview": {...}}
    """
    import traceback as _tb
    try:
        return await _propose_enrollment_create_impl(
            first_name=first_name, last_name=last_name, class_name=class_name,
            enrollment_fee=enrollment_fee, tuition_fee=tuition_fee, ctx=ctx,
            academic_year_id=academic_year_id, first_name_ar=first_name_ar,
            last_name_ar=last_name_ar, date_of_birth=date_of_birth,
            gender=gender, parent_name=parent_name, phone=phone,
        )
    except Exception as e:
        import structlog as _sl
        _sl.get_logger().error("propose_enrollment_create_error", error=str(e), traceback=_tb.format_exc())
        return {"error": f"Erreur lors de la création de l'inscription : {e}"}


async def _propose_enrollment_create_impl(
    first_name: str,
    last_name: str,
    class_name: str,
    enrollment_fee: float,
    tuition_fee: float,
    ctx: AgentContext,
    academic_year_id: str = "",
    first_name_ar: str = "",
    last_name_ar: str = "",
    date_of_birth: str = "",
    gender: str = "",
    parent_name: str = "",
    phone: str = "",
) -> dict:
    client = get_supabase_client_for_user(ctx.user_jwt)

    # Resolve class name → UUID : exact match d'abord, puis fuzzy
    name = class_name.strip()
    class_result = client.table("classes") \
        .select("id, name") \
        .eq("tenant_id", ctx.tenant_id) \
        .ilike("name", name) \
        .limit(1) \
        .execute()
    if not class_result.data:
        # Fuzzy : contient le nom saisi
        class_result = client.table("classes") \
            .select("id, name") \
            .eq("tenant_id", ctx.tenant_id) \
            .ilike("name", f"%{name}%") \
            .limit(1) \
            .execute()
    if not class_result.data:
        # Retourner les classes disponibles pour aider l'agent
        all_classes = client.table("classes").select("name") \
            .eq("tenant_id", ctx.tenant_id).order("name").execute()
        available = [c["name"] for c in (all_classes.data or [])]
        return {
            "error": f"Classe '{class_name}' introuvable.",
            "available_classes": available,
        }
    class_ = class_result.data[0]
    class_id = class_["id"]

    # Resolve academic year — essaie is_active, puis start_date, puis n'importe quelle année
    year_data = None
    if academic_year_id:
        r = client.table("academic_years").select("id, year").eq("id", academic_year_id).single().execute()
        year_data = r.data
    else:
        # Essaie is_active (colonne ajoutée par migration — peut être absente)
        try:
            r = client.table("academic_years").select("id, year") \
                .eq("tenant_id", ctx.tenant_id).eq("is_active", True).limit(1).execute()
            year_data = r.data[0] if r.data else None
        except Exception:
            pass

        if not year_data:
            # Fallback : tri par start_date (peut aussi être absent)
            try:
                r = client.table("academic_years").select("id, year") \
                    .eq("tenant_id", ctx.tenant_id).order("start_date", desc=True).limit(1).execute()
                year_data = r.data[0] if r.data else None
            except Exception:
                pass

        if not year_data:
            # Dernier recours : première année du tenant sans condition de colonne
            r = client.table("academic_years").select("id, year") \
                .eq("tenant_id", ctx.tenant_id).limit(1).execute()
            year_data = r.data[0] if r.data else None

    if not year_data:
        return {"error": "Aucune année scolaire trouvée pour ce tenant. Créez-en une d'abord."}

    payload = {
        "first_name": first_name,
        "last_name": last_name,
        "first_name_ar": first_name_ar,
        "last_name_ar": last_name_ar,
        "date_of_birth": date_of_birth,
        "gender": gender,
        "parent_name": parent_name,
        "phone": phone,
        "class_id": class_id,
        "class_name": class_["name"],
        "academic_year_id": year_data["id"],
        "enrollment_fee": enrollment_fee,
        "tuition_fee": tuition_fee,
    }

    action_log_id = await propose_action(
        action_type="enrollment.create",
        payload=payload,
        snapshot_before=None,
        agent_id="school-agent/enrollment",
        ctx=ctx,
    )

    return {
        "action_log_id": action_log_id,
        "canvas_type": "enrollment.create",
        "preview": {
            "student_name": f"{first_name} {last_name}",
            "class_name": class_["name"],
            "academic_year": year_data["year"],
            "enrollment_fee": enrollment_fee,
            "tuition_fee": tuition_fee,
            "estimated_total": enrollment_fee + (tuition_fee * 10),  # 10 mois
            "note": "L'élève sera créé avec statut 'en attente' — actif après premier paiement.",
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

    # Récupère les détails pour le canvas (LEFT JOIN pour inclure les candidats agent)
    enrollments_data = client.table("enrollments") \
        .select("id, new_class, student_id, candidate_first_name, candidate_last_name, students(first_name, last_name)") \
        .in_("id", enrollment_ids) \
        .eq("tenant_id", ctx.tenant_id) \
        .execute().data or []

    previews = []
    for e in enrollments_data:
        s = e.get("students")
        if s:
            student_name = f"{s['first_name']} {s['last_name']}"
        else:
            fn = e.get("candidate_first_name") or ""
            ln = e.get("candidate_last_name") or ""
            student_name = f"{fn} {ln}".strip() or "Candidat"
        previews.append({
            "id": e["id"],
            "student_name": student_name,
            "class_name": e.get("new_class"),
        })

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
