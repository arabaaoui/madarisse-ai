import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function toPayment(row: Record<string, unknown>) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    month: row.month,
    amount: row.amount,
    paidAt: row.paid_at,
    notes: row.notes,
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

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const { id: employeeId } = await params

  // Verify employee belongs to tenant
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('id', employeeId)
    .eq('tenant_id', tenantId)
    .single()

  if (!emp) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })

  const { data, error } = await supabase
    .from('employee_salary_payments')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('tenant_id', tenantId)
    .order('month', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json((data ?? []).map(toPayment))
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const { id: employeeId } = await params

  // Verify employee belongs to tenant
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('id', employeeId)
    .eq('tenant_id', tenantId)
    .single()

  if (!emp) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })

  const body = await req.json() as {
    month?: string
    amount?: number
    paid_at?: string
    notes?: string
  }

  if (!body.month || !body.amount) {
    return NextResponse.json({ error: 'month et amount sont requis' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('employee_salary_payments')
    .insert({
      tenant_id: tenantId,
      employee_id: employeeId,
      month: body.month,
      amount: body.amount,
      paid_at: body.paid_at ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(toPayment(data as Record<string, unknown>), { status: 201 })
}
