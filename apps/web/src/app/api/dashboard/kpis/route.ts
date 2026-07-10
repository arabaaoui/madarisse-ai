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

  const [studentsRes, pendingRes, paymentRes, revenueRes, expenseRes] = await Promise.all([
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

    // Total revenue this month (paid payment_items by payment_date)
    supabase
      .from('payment_items')
      .select('paid_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('payment_date', `${thisMonth}-01`)
      .lt('payment_date', nextMonthStart(thisMonth)),

    // Total expenses this month
    supabase
      .from('accounting_transactions')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('transaction_type', 'expense')
      .gte('transaction_date', `${thisMonth}-01`)
      .lt('transaction_date', nextMonthStart(thisMonth)),
  ])

  const items = paymentRes.data ?? []
  const totalDue = items.reduce((s, i) => s + i.amount, 0)
  const totalPaid = items.reduce((s, i) => s + (i.paid_amount ?? 0), 0)
  const recoveryRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 1000) / 10 : null

  const totalRevenueThisMonth = Math.round(
    (revenueRes.data ?? []).reduce((s, i) => s + (i.paid_amount ?? 0), 0)
  )
  const totalExpensesThisMonth = Math.round(
    (expenseRes.data ?? []).reduce((s, i) => s + (i.amount ?? 0), 0)
  )

  return NextResponse.json({
    confirmedEnrollments: studentsRes.count ?? 0,
    pendingEnrollments: pendingRes.count ?? 0,
    recoveryRate,
    recoveryMonth: thisMonth,
    totalRevenueThisMonth,
    totalExpensesThisMonth,
  })
}

function nextMonthStart(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return `${next}-01`
}
