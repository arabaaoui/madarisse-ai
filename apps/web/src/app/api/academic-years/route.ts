import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/supabase/tenant'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data, error } = await supabase
    .from('academic_years')
    .select('id, year, start_date, end_date, is_active')
    .order('year', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    (data ?? []).map((y) => ({
      id: y.id, year: y.year, startDate: y.start_date, endDate: y.end_date, isActive: y.is_active,
    }))
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = await getTenantId(supabase, user.id)
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const body = await req.json() as { year: string; startDate: string; endDate: string; isActive?: boolean }
  const { year, startDate, endDate, isActive = false } = body

  if (!year || !startDate || !endDate) {
    return NextResponse.json({ error: 'year, startDate et endDate sont requis' }, { status: 400 })
  }

  if (new Date(endDate) <= new Date(startDate)) {
    return NextResponse.json({ error: 'La date de fin doit \u00eatre apr\u00e8s la date de d\u00e9but' }, { status: 400 })
  }

  // Check overlap with existing years for this tenant
  const { data: existing } = await supabase
    .from('academic_years')
    .select('id, year, start_date, end_date')
    .eq('tenant_id', tenantId)

  const overlap = (existing ?? []).find(
    (y) => y.start_date && y.end_date &&
      new Date(startDate) < new Date(y.end_date) &&
      new Date(endDate) > new Date(y.start_date)
  )

  if (overlap) {
    return NextResponse.json(
      { error: `Chevauchement avec l\u2019ann\u00e9e ${overlap.year}` },
      { status: 409 }
    )
  }

  // If setting active, deactivate others first
  if (isActive) {
    await supabase.from('academic_years').update({ is_active: false }).eq('tenant_id', tenantId)
  }

  const { data, error } = await supabase
    .from('academic_years')
    .insert({ tenant_id: tenantId, year, start_date: startDate, end_date: endDate, is_active: isActive })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
