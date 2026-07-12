import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantId } from '@/lib/supabase/tenant'

function nextMonthStart(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return `${next}-01`
}

function monthLabel(yyyyMM: string): string {
  return yyyyMM
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = await getTenantId(supabase, user.id)
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const monthsParam = parseInt(req.nextUrl.searchParams.get('months') ?? '12', 10)
  const count = Math.min(Math.max(monthsParam, 1), 24)

  // Build list of YYYY-MM strings for last N months (ascending)
  const months: string[] = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push(ym)
  }

  const firstMonth = months[0]
  const lastMonth = months[months.length - 1]

  const [revenueRes, expenseRes] = await Promise.all([
    supabase
      .from('payment_items')
      .select('paid_amount, payment_date')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('payment_date', `${firstMonth}-01`)
      .lt('payment_date', nextMonthStart(lastMonth)),

    supabase
      .from('accounting_transactions')
      .select('amount, transaction_date')
      .eq('tenant_id', tenantId)
      .eq('transaction_type', 'expense')
      .gte('transaction_date', `${firstMonth}-01`)
      .lt('transaction_date', nextMonthStart(lastMonth)),
  ])

  // Aggregate revenue by month
  const revenueByMonth: Record<string, number> = {}
  for (const item of revenueRes.data ?? []) {
    if (!item.payment_date) continue
    const ym = (item.payment_date as string).slice(0, 7)
    revenueByMonth[ym] = (revenueByMonth[ym] ?? 0) + (item.paid_amount ?? 0)
  }

  // Aggregate expenses by month
  const expenseByMonth: Record<string, number> = {}
  for (const item of expenseRes.data ?? []) {
    if (!item.transaction_date) continue
    const ym = (item.transaction_date as string).slice(0, 7)
    expenseByMonth[ym] = (expenseByMonth[ym] ?? 0) + (item.amount ?? 0)
  }

  const result = months.map((month) => {
    const revenue = Math.round(revenueByMonth[month] ?? 0)
    const expenses = Math.round(expenseByMonth[month] ?? 0)
    return {
      month: monthLabel(month),
      revenue,
      expenses,
      net: revenue - expenses,
    }
  })

  return NextResponse.json({ months: result })
}
