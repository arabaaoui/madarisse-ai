/**
 * API Route — Annule une action HITL.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action_log_id } = await request.json()
  if (!action_log_id) {
    return NextResponse.json({ error: 'action_log_id required' }, { status: 400 })
  }

  const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8001'
  const res = await fetch(`${agentServiceUrl}/action/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'X-Agent-Secret': process.env.AGENT_SERVICE_SECRET || '',
    },
    body: JSON.stringify({ action_log_id }),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
