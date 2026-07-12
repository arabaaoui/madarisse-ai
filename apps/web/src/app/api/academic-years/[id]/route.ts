import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/supabase/tenant'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = await getTenantId(supabase, user.id)
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as {
    year?: string; startDate?: string; endDate?: string; isActive?: boolean
  }

  const updates: Record<string, unknown> = {}
  if (body.year !== undefined) updates.year = body.year
  if (body.startDate !== undefined) updates.start_date = body.startDate
  if (body.endDate !== undefined) updates.end_date = body.endDate

  if (body.isActive === true) {
    // Deactivate all other years for this tenant first
    await supabase.from('academic_years').update({ is_active: false })
      .eq('tenant_id', tenantId)
      .neq('id', id)
    updates.is_active = true
  } else if (body.isActive === false) {
    updates.is_active = false
  }

  const { data, error } = await supabase
    .from('academic_years')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Ann\u00e9e scolaire introuvable' }, { status: 404 })

  return NextResponse.json(data)
}
