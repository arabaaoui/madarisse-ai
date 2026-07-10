import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data, error } = await supabase
    .from('messages')
    .select('id, subject, body, is_read, parent_id, created_at, from_user_id, to_user_id, profiles!messages_from_user_id_fkey(first_name, last_name, email)')
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id},to_user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 400 })
  }

  const body = await request.json() as {
    to_user_id?: string
    subject: string
    body: string
    parent_id?: string
  }

  if (!body.subject?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: profile.tenant_id,
      from_user_id: user.id,
      to_user_id: body.to_user_id || null,
      subject: body.subject.trim(),
      body: body.body.trim(),
      parent_id: body.parent_id || null,
    })
    .select('id, subject, body, is_read, parent_id, created_at, from_user_id, to_user_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await request.json() as { id: string; is_read: boolean }
  if (!body.id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 })

  const { error } = await supabase
    .from('messages')
    .update({ is_read: body.is_read })
    .eq('id', body.id)
    .eq('to_user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
