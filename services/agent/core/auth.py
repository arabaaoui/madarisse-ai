"""
JWT validation & AgentContext.
L'agent opère TOUJOURS avec le JWT de l'utilisateur final → RLS hérité.
"""

from dataclasses import dataclass
import jwt
from fastapi import HTTPException
from supabase import create_client, Client

from .config import settings


@dataclass
class AgentContext:
    """Contexte utilisateur extrait du JWT — passé à tous les tools."""
    user_id: str
    tenant_id: str
    role: str          # admin | secretariat | directeur | professeur | parent | eleve
    user_jwt: str      # JWT original — utilisé pour créer le client Supabase
    email: str


async def verify_jwt_token(token: str) -> AgentContext:
    """
    Valide le JWT Supabase et extrait le contexte utilisateur.
    Ne crée PAS un client service_role — on vérifie avec le JWT secret.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase n'utilise pas audience standard
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing sub")

    # Le tenant_id et le rôle sont dans les user_metadata (mis à jour par les triggers Supabase)
    user_meta = payload.get("user_metadata", {})
    app_meta = payload.get("app_metadata", {})

    tenant_id = user_meta.get("tenant_id") or app_meta.get("tenant_id")
    role = user_meta.get("role") or app_meta.get("role", "eleve")
    email = payload.get("email", "")

    if not tenant_id:
        try:
            tenant_id = await _fetch_tenant_from_db(user_id, token)
        except HTTPException:
            raise
        except Exception:
            # profiles table absente ou inaccessible — fallback user_id comme tenant
            tenant_id = user_id

    return AgentContext(
        user_id=user_id,
        tenant_id=tenant_id,
        role=role,
        user_jwt=token,
        email=email,
    )


async def _fetch_tenant_from_db(user_id: str, user_jwt: str) -> str:
    """Fallback : récupère le tenant_id depuis la table profiles via JWT user."""
    client = get_supabase_client_for_user(user_jwt)
    result = client.table("profiles").select("tenant_id").eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=403, detail="User profile not found")
    return result.data["tenant_id"]


def get_supabase_client_for_user(user_jwt: str) -> Client:
    """
    Crée un client Supabase avec le JWT utilisateur.
    → Les requêtes héritent du RLS de l'utilisateur (pas service_role).
    RÈGLE : tous les tools agent utilisent ce client, jamais service_role.
    """
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    # Override le header Authorization avec le JWT utilisateur
    client.postgrest.auth(user_jwt)
    return client


def get_supabase_system_client() -> Client:
    """
    Client service_role — UNIQUEMENT pour les tâches système contrôlées :
    - Enregistrement dans agent_action_logs (après validation HITL)
    - Cron / tâches planifiées
    NE PAS utiliser dans les tools agent standards.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
