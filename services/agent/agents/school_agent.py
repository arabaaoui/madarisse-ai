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
from tools.payment_tools import payment_stats_tool, unpaid_students_tool
from tools.enrollment_tools import (
    search_student_tool,
    pending_enrollments_tool,
    propose_enrollment_tool,
)

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

        from tools.payment_tools import get_payment_stats, get_unpaid_students
        from tools.enrollment_tools import (
            search_student, get_pending_enrollments, propose_enrollment_create
        )
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
