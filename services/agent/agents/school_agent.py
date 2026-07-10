"""
SchoolAgent — agent orchestrateur principal.
Utilise Google ADK, streame en SSE compatible Vercel AI SDK.
"""

from typing import AsyncIterator
import json
import os
import inspect
import structlog
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from core.auth import AgentContext
from core.config import settings

logger = structlog.get_logger()

# Expose la clé Gemini à ADK dès l'import du module
if settings.GEMINI_API_KEY:
    os.environ.setdefault("GOOGLE_API_KEY", settings.GEMINI_API_KEY)
    os.environ.setdefault("GEMINI_API_KEY", settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """
Tu es l'assistant de gestion scolaire de madarisse.com.
Tu aides le secrétariat et le directeur à gérer leur école au quotidien.

RÈGLES IMPORTANTES :
1. Tu opères dans le contexte du tenant {tenant_id} uniquement.
2. Pour TOUTE action d'écriture (inscription, paiement, validation), tu dois PROPOSER l'action
   via le tool approprié — tu ne fais JAMAIS d'écriture directe.
3. Tu affiches les montants en MAD (dirham marocain).
4. Tu réponds en français par défaut, en arabe si l'utilisateur écrit en arabe.
5. Tu ne révèles jamais les données d'un autre tenant.
6. Si tu as un doute sur l'identité d'un élève (homonyme), tu demandes confirmation.

MODULE ACTIF : {active_module}
Tu peux adapter tes suggestions au module que l'utilisateur consulte actuellement.

Si le module actif est "paiements" :
- Utilise get_student_payment_summary pour l'état de paiement d'un élève spécifique.
- Utilise get_unpaid_students pour lister les élèves avec des impayés.
- Utilise propose_payment_record (HITL) pour enregistrer un paiement — JAMAIS sans canvas de confirmation.
- Utilise get_recovery_rate pour le taux de recouvrement (par classe et/ou mois YYYY-MM).
- Affiche tous les montants en MAD. Génère des liens vers les fiches élèves : [Prénom Nom](/eleves/UUID_ELEVE)
- Si l'élève n'est pas trouvé, utilise search_student et présente les candidats.
- Mode de paiement par défaut = 'cash' (espèces) si non précisé — le mentionner dans le canvas.

Si le module actif est "inscriptions" :
- FLUX PRINCIPAL : une inscription se fait SANS élève préexistant. L'élève est créé automatiquement
  (statut 'en attente') lors de la confirmation de l'inscription. Il passe 'actif' au premier paiement validé.
- Pour inscrire un nouvel élève : collecte prénom, nom, classe, frais d'inscription et frais mensuel,
  puis utilise propose_enrollment_create (HITL) — NE cherche PAS d'abord un élève existant.
  IMPORTANT : le paramètre s'appelle class_name (ex: "CM1", "CE2"), PAS class_id. Passe directement le nom de la classe.
  L'année scolaire est résolue automatiquement — ne demande pas academic_year_id.
- Pour un élève qui s'est déjà inscrit les années précédentes (renouvellement) : utilise search_student
  pour retrouver le dossier existant avant de proposer une inscription.
- Utilise get_pending_enrollments pour lister les inscriptions en attente.
- Utilise propose_enrollment_validate (HITL) pour valider une ou plusieurs inscriptions en attente.
- Génère des liens vers les fiches élèves au format : [Prénom Nom](/eleves/UUID_ELEVE)
- Pour toute ambiguïté (homonyme, classe introuvable), DEMANDE confirmation avant d'agir.
- Rappelle toujours que l'élève reste 'en attente' jusqu'au premier paiement des frais d'inscription.

Si le module actif est "eleves" :
- Utilise get_student_detail pour répondre aux questions sur un élève spécifique.
- Utilise get_student_payment_summary pour les questions de paiement liées à un élève.
- Utilise search_student pour retrouver un élève par nom.
- Dans tes réponses, génère des liens vers les fiches élèves au format : [Prénom Nom](/eleves/UUID_ELEVE)
- Utilise get_unpaid_students pour lister les élèves en retard de paiement.
"""


class SchoolAgent:
    """Agent scolaire principal. Crée une instance ADK par requête."""

    def __init__(self, ctx: AgentContext, active_module: str | None = None):
        self.ctx = ctx
        self.active_module = active_module or "dashboard"

        system = SYSTEM_PROMPT.format(
            tenant_id=ctx.tenant_id,
            active_module=self.active_module,
        )

        self._agent = Agent(
            name="school_agent",
            model=settings.STRONG_MODEL,
            instruction=system,
            tools=self._bind_tools(),
        )

        self._session_service = InMemorySessionService()
        self._runner = Runner(
            agent=self._agent,
            session_service=self._session_service,
            app_name="madarisse-ai",
        )

    def _bind_tools(self) -> list:
        """
        Crée des wrappers sans `ctx` dans leur signature visible.
        ADK inspecte la signature pour générer le schéma JSON des tools —
        ctx ne doit pas apparaître comme paramètre LLM.
        """
        ctx = self.ctx

        from tools.payment_tools import get_payment_stats, get_unpaid_students, propose_payment_record, get_recovery_rate
        from tools.enrollment_tools import (
            search_student, get_pending_enrollments, propose_enrollment_create,
            propose_enrollment_validate,
        )
        from tools.student_tools import get_student_detail, get_student_payment_summary
        from google.adk.tools import FunctionTool

        def bind(fn):
            """
            Retourne un FunctionTool dont la signature exclut `ctx`.
            ADK génère le schéma depuis la signature → ctx absent = non exposé au LLM.
            """
            # Signature sans ctx
            sig = inspect.signature(fn)
            params_without_ctx = [
                p for name, p in sig.parameters.items() if name != "ctx"
            ]
            new_sig = sig.replace(parameters=params_without_ctx)

            def wrapper(**kwargs):
                return fn(**kwargs, ctx=ctx)

            wrapper.__name__ = fn.__name__
            wrapper.__doc__ = fn.__doc__
            wrapper.__signature__ = new_sig  # type: ignore[attr-defined]

            return FunctionTool(func=wrapper)

        return [
            bind(get_payment_stats),
            bind(get_unpaid_students),
            bind(search_student),
            bind(get_pending_enrollments),
            bind(propose_enrollment_create),
            bind(propose_enrollment_validate),
            bind(get_student_detail),
            bind(get_student_payment_summary),
            bind(propose_payment_record),
            bind(get_recovery_rate),
        ]

    async def stream(self, messages: list[dict]) -> AsyncIterator[str]:
        """
        Streame la réponse en format AI SDK v6 UI Message Stream (SSE).
        DefaultChatTransport attend : data: {type, ...}\\n\\n
        """
        import uuid as _uuid

        session = await self._session_service.create_session(
            app_name="madarisse-ai",
            user_id=self.ctx.user_id,
        )

        # Extrait le texte du dernier message (supporte content et parts)
        last = messages[-1] if messages else {}
        user_message = (
            last.get("content")
            or next(
                (p.get("text", "") for p in last.get("parts", []) if p.get("type") == "text"),
                "",
            )
        )

        message_id = str(_uuid.uuid4())
        text_id = str(_uuid.uuid4())

        def sse(chunk: dict) -> str:
            return f"data: {json.dumps(chunk)}\n\n"

        yield sse({"type": "start", "messageId": message_id})
        yield sse({"type": "start-step"})
        yield sse({"type": "text-start", "id": text_id})

        try:
            async for event in self._runner.run_async(
                user_id=self.ctx.user_id,
                session_id=session.id,
                new_message=_to_adk_content(user_message),
            ):
                if event.is_final_response():
                    text = event.content.parts[0].text if event.content else ""
                    if text:
                        yield sse({"type": "text-delta", "id": text_id, "delta": text})
                elif hasattr(event, "content") and event.content:
                    for part in event.content.parts:
                        if hasattr(part, "text") and part.text:
                            yield sse({"type": "text-delta", "id": text_id, "delta": part.text})

        except Exception as e:
            logger.error("agent_stream_error", error=str(e), user_id=self.ctx.user_id)
            err_msg = "Désolé, une erreur s'est produite. Veuillez réessayer."
            yield sse({"type": "text-delta", "id": text_id, "delta": err_msg})

        yield sse({"type": "text-end", "id": text_id})
        yield sse({"type": "finish-step"})
        yield sse({"type": "finish", "finishReason": "stop"})
        yield "data: [DONE]\n\n"


def _to_adk_content(text: str):
    from google.genai.types import Content, Part
    return Content(role="user", parts=[Part(text=text)])
