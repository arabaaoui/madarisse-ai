import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/supabase/tenant'

function toEmployee(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    firstNameAr: row.first_name_ar,
    lastNameAr: row.last_name_ar,
    role: row.role,
    email: row.email,
    phone: row.phone,
    hireDate: row.hire_date,
    salaryBase: row.salary_base,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = await getTenantId(supabase, user.id)
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const { id } = await params

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })

  return NextResponse.json(toEmployee(data as Record<string, unknown>))
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = await getTenantId(supabase, user.id)
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  // Map camelCase to snake_case
  const updates: Record<string, unknown> = {}
  if (body.firstName !== undefined) updates.first_name = body.firstName
  if (body.lastName !== undefined) updates.last_name = body.lastName
  if (body.firstNameAr !== undefined) updates.first_name_ar = body.firstNameAr
  if (body.lastNameAr !== undefined) updates.last_name_ar = body.lastNameAr
  if (body.role !== undefined) updates.role = body.role
  if (body.email !== undefined) updates.email = body.email
  if (body.phone !== undefined) updates.phone = body.phone
  if (body.hireDate !== undefined) updates.hire_date = body.hireDate
  if (body.salaryBase !== undefined) updates.salary_base = body.salaryBase
  if (body.isActive !== undefined) updates.is_active = body.isActive
  if (body.userId !== undefined) updates.user_id = body.userId

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })

  return NextResponse.json(toEmployee(data as Record<string, unknown>))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = await getTenantId(supabase, user.id)
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const { id } = await params

  // Soft delete: set is_active=false
  const { error } = await supabase
    .from('employees')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ status: 'deactivated' })
}
