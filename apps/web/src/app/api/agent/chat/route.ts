/**
 * API Route — Proxy vers le service agent (FastAPI/ADK).
 * Transmet le JWT utilisateur à l'agent pour que le RLS soit hérité.
 * Streame la réponse au format Vercel AI SDK data stream protocol.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return new NextResponse('3:"Veuillez vous connecter pour utiliser l\'assistant."\nd:{"finishReason":"error"}\n', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const body = await request.json()
  const { messages, active_module, session_id } = body

  const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8001'

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
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Agent service unavailable'
    return new NextResponse(`3:"${msg}"\nd:{"finishReason":"error"}\n`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (!agentResponse.ok) {
    const error = await agentResponse.text()
    return new NextResponse(`3:${JSON.stringify(error)}\nd:{"finishReason":"error"}\n`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  // Transfère le stream de l'agent en ajoutant le signal de fin attendu par AI SDK v6
  const agentBody = agentResponse.body
  if (!agentBody) {
    return new NextResponse('3:"Réponse vide de l\'agent."\nd:{"finishReason":"error"}\n', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader = agentBody.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          controller.enqueue(value)
        }
        // Signal de fin AI SDK v6
        controller.enqueue(encoder.encode('d:{"finishReason":"stop"}\n'))
      } catch (e) {
        controller.enqueue(encoder.encode('d:{"finishReason":"error"}\n'))
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
