import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const today = new Date().toISOString().slice(0, 10)
  const thisMonth = today.slice(0, 7)

  const [studentsRes, pendingRes, paymentRes] = await Promise.all([
    // Total confirmed enrollments (= active students this year)
    supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'confirmed'),

    // Pending enrollments
    supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending'),

    // Payment items this month for recovery rate
    supabase
      .from('payment_items')
      .select('amount, paid_amount, status')
      .eq('tenant_id', tenantId)
      .eq('item_type', 'schedule')
      .neq('status', 'cancelled')
      .gte('due_date', `${thisMonth}-01`)
      .lt('due_date', nextMonthStart(thisMonth)),
  ])

  const items = paymentRes.data ?? []
  const totalDue = items.reduce((s, i) => s + i.amount, 0)
  const totalPaid = items.reduce((s, i) => s + (i.paid_amount ?? 0), 0)
  const recoveryRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 1000) / 10 : null

  return NextResponse.json({
    confirmedEnrollments: studentsRes.count ?? 0,
    pendingEnrollments: pendingRes.count ?? 0,
    recoveryRate,
    recoveryMonth: thisMonth,
  })
}

function nextMonthStart(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return `${next}-01`
}
