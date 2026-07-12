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

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = await getTenantId(supabase, user.id)
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const activeParam = req.nextUrl.searchParams.get('active')

  let query = supabase
    .from('employees')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('last_name', { ascending: true })

  if (activeParam === 'true') query = query.eq('is_active', true)
  else if (activeParam === 'false') query = query.eq('is_active', false)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json((data ?? []).map(toEmployee))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = await getTenantId(supabase, user.id)
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const body = await req.json() as {
    firstName?: string
    lastName?: string
    firstNameAr?: string
    lastNameAr?: string
    role?: string
    email?: string
    phone?: string
    hireDate?: string
    salaryBase?: number
    userId?: string
  }

  const { firstName, lastName, role } = body
  if (!firstName || !lastName || !role) {
    return NextResponse.json({ error: 'first_name, last_name et role sont requis' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('employees')
    .insert({
      tenant_id: tenantId,
      user_id: body.userId ?? null,
      first_name: firstName,
      last_name: lastName,
      first_name_ar: body.firstNameAr ?? null,
      last_name_ar: body.lastNameAr ?? null,
      role,
      email: body.email ?? null,
      phone: body.phone ?? null,
      hire_date: body.hireDate ?? null,
      salary_base: body.salaryBase ?? 0,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(toEmployee(data as Record<string, unknown>), { status: 201 })
}
