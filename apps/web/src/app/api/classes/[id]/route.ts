import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as {
    name?: string; nameAr?: string; level?: string; capacity?: number
    enrollmentFee?: number; tuitionFee?: number
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.nameAr !== undefined) updates.name_ar = body.nameAr
  if (body.level !== undefined) updates.level = body.level
  if (body.capacity !== undefined) updates.capacity = body.capacity
  if (body.enrollmentFee !== undefined) updates.enrollment_fee = body.enrollmentFee
  if (body.tuitionFee !== undefined) updates.tuition_fee = body.tuitionFee

  const { data, error } = await supabase
    .from('classes')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })

  return NextResponse.json(data)
}
