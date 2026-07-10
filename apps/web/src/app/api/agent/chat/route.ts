/**
 * BFF — proxy vers l'agent FastAPI.
 * L'agent retourne du SSE (AI SDK v6 UI Message Stream protocol).
 * Ce proxy transmet le flux tel quel avec les bons headers.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
}

function sseError(msg: string): NextResponse {
  const body = [
    `data: {"type":"text-start","id":"err"}\n\n`,
    `data: {"type":"text-delta","id":"err","delta":${JSON.stringify(msg)}}\n\n`,
    `data: {"type":"text-end","id":"err"}\n\n`,
    `data: {"type":"finish-step"}\n\n`,
    `data: {"type":"finish","finishReason":"error"}\n\n`,
    'data: [DONE]\n\n',
  ].join('')
  return new NextResponse(body, { headers: SSE_HEADERS })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return sseError('Veuillez vous connecter pour utiliser l\'assistant.')
  }

  const body = await request.json()
  const { messages, active_module, session_id } = body

  const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8001'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  let agentResponse: Response
  try {
    agentResponse = await fetch(`${agentServiceUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-Agent-Secret': process.env.AGENT_SERVICE_SECRET || '',
      },
      body: JSON.stringify({ messages, active_module, session_id }),
      signal: controller.signal,
    })
  } catch (err) {
    const msg = err instanceof Error && err.name === 'AbortError'
      ? 'Agent service timeout (15s) — vérifiez que le service agent est démarré.'
      : (err instanceof Error ? err.message : 'Agent service unavailable')
    return sseError(msg)
  } finally {
    clearTimeout(timeout)
  }

  if (!agentResponse.ok) {
    const error = await agentResponse.text()
    return sseError(`Erreur agent (${agentResponse.status}): ${error.slice(0, 200)}`)
  }

  if (!agentResponse.body) {
    return sseError('Réponse vide de l\'agent.')
  }

  // Proxy direct du stream SSE de l'agent
  return new NextResponse(agentResponse.body, { headers: SSE_HEADERS })
}
