import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data, error } = await supabase
    .from('classes')
    .select('id, name, name_ar, level, capacity, enrollment_fee, tuition_fee')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    (data ?? []).map((c) => ({
      id: c.id, name: c.name, nameAr: c.name_ar ?? undefined,
      level: c.level ?? undefined, capacity: c.capacity ?? undefined,
      enrollmentFee: c.enrollment_fee ?? 0, tuitionFee: c.tuition_fee ?? 0,
    }))
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const body = await req.json() as {
    name: string; nameAr?: string; level?: string; capacity?: number
    enrollmentFee?: number; tuitionFee?: number
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Le nom de classe est requis' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('classes')
    .insert({
      tenant_id: tenantId,
      name: body.name.trim(),
      name_ar: body.nameAr ?? null,
      level: body.level ?? null,
      capacity: body.capacity ?? null,
      enrollment_fee: body.enrollmentFee ?? 0,
      tuition_fee: body.tuitionFee ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
