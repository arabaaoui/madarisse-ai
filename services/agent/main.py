"""
madarisse-ai — Agent Service
FastAPI + Google ADK + LiteLLM

Endpoints :
  POST /chat          streaming SSE (Vercel AI SDK protocol)
  POST /action/confirm   confirme une action HITL
  POST /action/cancel    annule une action HITL
  GET  /health
"""

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import structlog

from agents.school_agent import SchoolAgent
from core.auth import verify_jwt_token, AgentContext
from core.config import settings

logger = structlog.get_logger()
app = FastAPI(title="madarisse-ai Agent Service", version="0.1.0")

# CORS — only Next.js app origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.WEB_APP_URL],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type", "X-Agent-Secret"],
)


# ── Auth middleware ───────────────────────────────────────────────────────────

async def get_agent_context(request: Request) -> AgentContext:
    """Extract and validate user JWT from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    # Internal secret check (Next.js BFF → agent)
    agent_secret = request.headers.get("X-Agent-Secret", "")
    if agent_secret != settings.AGENT_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Invalid agent secret")

    user_jwt = auth_header.removeprefix("Bearer ")
    ctx = await verify_jwt_token(user_jwt)
    return ctx


# ── Request/Response models ───────────────────────────────────────────────────

class ChatRequest(BaseModel):
    messages: list[dict]         # historique Vercel AI SDK format
    active_module: str | None = None  # module cockpit actif (context)
    session_id: str | None = None


class ActionConfirmRequest(BaseModel):
    action_log_id: str           # UUID de l'agent_action_log


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "madarisse-ai-agent"}


@app.post("/chat")
async def chat(
    body: ChatRequest,
    ctx: AgentContext = Depends(get_agent_context),
):
    """
    Streaming SSE — compatible Vercel AI SDK (text/event-stream, data: prefix).
    L'agent reçoit le contexte utilisateur (JWT → tenant_id, user_id, role) et
    le module actif pour contextualiser les outils disponibles.
    """
    agent = SchoolAgent(ctx=ctx, active_module=body.active_module)

    async def event_stream():
        async for chunk in agent.stream(body.messages):
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )


@app.post("/action/confirm")
async def confirm_action(
    body: ActionConfirmRequest,
    ctx: AgentContext = Depends(get_agent_context),
):
    """
    Confirme une action HITL proposée par l'agent.
    L'agent_action_log doit appartenir au tenant de l'utilisateur.
    """
    from core.hitl import confirm_action_log
    result = await confirm_action_log(
        action_log_id=body.action_log_id,
        ctx=ctx,
    )
    return result


@app.post("/action/cancel")
async def cancel_action(
    body: ActionConfirmRequest,
    ctx: AgentContext = Depends(get_agent_context),
):
    """Annule une action HITL (statut → cancelled)."""
    from core.hitl import cancel_action_log
    result = await cancel_action_log(
        action_log_id=body.action_log_id,
        ctx=ctx,
    )
    return result
