/**
 * API Route — Proxy vers le service agent (FastAPI/ADK).
 * Transmet le JWT utilisateur à l'agent pour que le RLS soit hérité.
 * Streame la réponse SSE au client.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Récupère la session utilisateur côté serveur
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { messages, active_module, session_id } = body

  // Proxy vers le service agent avec le JWT utilisateur
  const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8001'
  const agentResponse = await fetch(`${agentServiceUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'X-Agent-Secret': process.env.AGENT_SERVICE_SECRET || '',
    },
    body: JSON.stringify({ messages, active_module, session_id }),
  })

  if (!agentResponse.ok) {
    const error = await agentResponse.text()
    return NextResponse.json({ error }, { status: agentResponse.status })
  }

  // Streame la réponse SSE directement au client
  return new NextResponse(agentResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
