import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const classId = searchParams.get('class_id')

  let query = supabase
    .from('devoirs')
    .select('id, subject, title, description, due_date, class_id, created_at, classes(name)')
    .order('due_date', { ascending: false })
    .limit(50)

  if (classId) query = query.eq('class_id', classId)

  const { data, error } = await query
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
    class_id?: string
    subject: string
    title: string
    description?: string
    due_date: string
  }

  if (!body.subject?.trim() || !body.title?.trim() || !body.due_date) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('devoirs')
    .insert({
      tenant_id: profile.tenant_id,
      class_id: body.class_id || null,
      subject: body.subject.trim(),
      title: body.title.trim(),
      description: body.description?.trim() || null,
      due_date: body.due_date,
      created_by: user.id,
    })
    .select('id, subject, title, description, due_date, class_id, created_at, classes(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 })

  const { error } = await supabase.from('devoirs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
