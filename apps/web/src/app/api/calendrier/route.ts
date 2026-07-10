import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const month = searchParams.get('month') // YYYY-MM

  let query = supabase
    .from('calendrier_events')
    .select('id, title, description, start_date, end_date, event_type, class_id, created_at, classes(name)')
    .order('start_date', { ascending: true })

  if (month) {
    const [year, mon] = month.split('-')
    const startOfMonth = `${year}-${mon}-01`
    const nextMonth = parseInt(mon) === 12
      ? `${parseInt(year) + 1}-01-01`
      : `${year}-${String(parseInt(mon) + 1).padStart(2, '0')}-01`
    query = query.gte('start_date', startOfMonth).lt('start_date', nextMonth)
  }

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
    title: string
    description?: string
    start_date: string
    end_date?: string
    event_type?: string
    class_id?: string
  }

  if (!body.title?.trim() || !body.start_date) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('calendrier_events')
    .insert({
      tenant_id: profile.tenant_id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      start_date: body.start_date,
      end_date: body.end_date || null,
      event_type: body.event_type || 'other',
      class_id: body.class_id || null,
      created_by: user.id,
    })
    .select('id, title, description, start_date, end_date, event_type, class_id, created_at, classes(name)')
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

  const { error } = await supabase.from('calendrier_events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
