"""
SchoolAgent — agent orchestrateur principal.
Utilise Google ADK, streame en SSE compatible Vercel AI SDK.
"""

from typing import AsyncIterator
import json
import structlog
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from core.auth import AgentContext
from core.config import settings
from tools.payment_tools import payment_stats_tool, unpaid_students_tool, propose_payment_record_tool, get_recovery_rate_tool
from tools.enrollment_tools import (
    search_student_tool,
    pending_enrollments_tool,
    propose_enrollment_tool,
    propose_enrollment_validate_tool,
)
from tools.student_tools import student_detail_tool, student_payment_tool

logger = structlog.get_logger()

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
- Affiche tous les montants en MAD. Génère des liens vers les fiches élèves : [Prénom Nom](/eleves/{id})
- Si l'élève n'est pas trouvé, utilise search_student et présente les candidats.
- Mode de paiement par défaut = 'cash' (espèces) si non précisé — le mentionner dans le canvas.

Si le module actif est "inscriptions" :
- Utilise get_pending_enrollments pour lister les inscriptions en attente.
- Utilise search_student pour retrouver un élève avant de proposer une inscription.
- Utilise propose_enrollment_create (HITL) pour créer une inscription — JAMAIS sans canvas de confirmation.
- Utilise propose_enrollment_validate (HITL) pour valider une ou plusieurs inscriptions en attente.
- Génère des liens vers les fiches élèves au format : [Prénom Nom](/eleves/{id})
- Pour toute ambiguïté (homonyme, classe introuvable), DEMANDE confirmation avant d'agir.

Si le module actif est "eleves" :
- Utilise get_student_detail pour répondre aux questions sur un élève spécifique.
- Utilise get_student_payment_summary pour les questions de paiement liées à un élève.
- Utilise search_student pour retrouver un élève par nom.
- Dans tes réponses, génère des liens vers les fiches élèves au format : [Prénom Nom](/eleves/{id})
- Utilise get_unpaid_students pour lister les élèves en retard de paiement.
"""


class SchoolAgent:
    """
    Agent scolaire principal. Crée une instance ADK par requête.
    """

    def __init__(self, ctx: AgentContext, active_module: str | None = None):
        self.ctx = ctx
        self.active_module = active_module or "dashboard"

        system = SYSTEM_PROMPT.format(
            tenant_id=ctx.tenant_id,
            active_module=self.active_module,
        )

        # Outils disponibles — tous reçoivent ctx via partial/closure
        tools = self._bind_tools()

        self._agent = Agent(
            name="school-agent",
            model=settings.STRONG_MODEL,  # LiteLLM alias → routage automatique
            system_instruction=system,
            tools=tools,
        )

        self._session_service = InMemorySessionService()
        self._runner = Runner(
            agent=self._agent,
            session_service=self._session_service,
            app_name="madarisse-ai",
        )

    def _bind_tools(self) -> list:
        """
        Bind le contexte utilisateur à chaque tool (closure).
        ADK FunctionTool ne supporte pas les paramètres de contexte nativement —
        on utilise des wrappers qui capturent ctx.
        """
        ctx = self.ctx

        from tools.payment_tools import get_payment_stats, get_unpaid_students, propose_payment_record, get_recovery_rate
        from tools.enrollment_tools import (
            search_student, get_pending_enrollments, propose_enrollment_create,
            propose_enrollment_validate,
        )
        from tools.student_tools import get_student_detail, get_student_payment_summary
        from google.adk.tools import FunctionTool
        import functools

        def bind(fn):
            """Crée un wrapper qui injecte ctx comme dernier argument."""
            @functools.wraps(fn)
            def wrapper(*args, **kwargs):
                # Supprime ctx des kwargs si passé par ADK (ne devrait pas l'être)
                kwargs.pop("ctx", None)
                if "ctx" in fn.__code__.co_varnames:
                    kwargs["ctx"] = ctx
                return fn(*args, **kwargs)
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
        Streame la réponse en format Vercel AI SDK (data: prefix).
        Compatible avec useChat() côté Next.js.
        """
        session = await self._session_service.create_session(
            app_name="madarisse-ai",
            user_id=self.ctx.user_id,
        )

        # Convertit le format Vercel AI SDK → ADK
        user_message = messages[-1]["content"] if messages else ""

        try:
            async for event in self._runner.run_async(
                user_id=self.ctx.user_id,
                session_id=session.id,
                new_message=_to_adk_content(user_message),
            ):
                if event.is_final_response():
                    text = event.content.parts[0].text if event.content else ""
                    # Format Vercel AI SDK streaming protocol
                    yield f'0:{json.dumps(text)}\n'

                elif hasattr(event, "content") and event.content:
                    # Stream partiel
                    for part in event.content.parts:
                        if hasattr(part, "text") and part.text:
                            yield f'0:{json.dumps(part.text)}\n'

        except Exception as e:
            logger.error("agent_stream_error", error=str(e), user_id=self.ctx.user_id)
            error_msg = "Désolé, une erreur s'est produite. Veuillez réessayer."
            yield f'0:{json.dumps(error_msg)}\n'


def _to_adk_content(text: str):
    """Convertit un message texte en format ADK Content."""
    from google.genai.types import Content, Part
    return Content(role="user", parts=[Part(text=text)])
