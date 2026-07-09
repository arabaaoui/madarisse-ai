import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const classId = req.nextUrl.searchParams.get('class_id') ?? undefined
  const month = req.nextUrl.searchParams.get('month') ?? undefined

  let query = supabase
    .from('payment_items')
    .select(`
      id, amount, paid_amount, remaining_amount, status, due_date,
      students!inner(id, first_name, last_name, class_id)
    `)
    .eq('tenant_id', tenantId)
    .eq('item_type', 'schedule')
    .neq('status', 'cancelled')

  if (month) {
    const [year, m] = month.split('-').map(Number)
    const monthStart = `${year}-${String(m).padStart(2, '0')}-01`
    const nextM = m === 12 ? 1 : m + 1
    const nextY = m === 12 ? year + 1 : year
    const monthEnd = `${nextY}-${String(nextM).padStart(2, '0')}-01`
    query = query.gte('due_date', monthStart).lt('due_date', monthEnd)
  }

  if (classId) {
    query = query.eq('students.class_id', classId)
  }

  const { data: items } = await query.limit(500)

  const today = new Date().toISOString().slice(0, 10)
  const allItems = items ?? []

  const totalDue = allItems.reduce((s, r) => s + r.amount, 0)
  const totalPaid = allItems.reduce((s, r) => s + (r.paid_amount ?? 0), 0)

  const overdue = allItems.filter(
    (r) =>
      r.status === 'overdue' ||
      (r.due_date && r.due_date < today && r.status !== 'paid'),
  )

  const overdueByStudent: Record<string, { studentId: string; studentName: string; amountDue: number }> = {}
  for (const r of overdue) {
    const s = (r.students as unknown) as { id: string; first_name: string; last_name: string }
    if (!overdueByStudent[s.id]) {
      overdueByStudent[s.id] = {
        studentId: s.id,
        studentName: `${s.first_name} ${s.last_name}`,
        amountDue: 0,
      }
    }
    overdueByStudent[s.id].amountDue += r.remaining_amount ?? r.amount
  }

  let className: string | undefined
  if (classId) {
    const { data: cls } = await supabase.from('classes').select('name').eq('id', classId).single()
    className = cls?.name
  }

  return NextResponse.json({
    classId,
    className,
    month,
    totalDue,
    totalPaid,
    rate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 1000) / 10 : 0,
    overdueCount: overdue.length,
    overdueStudents: Object.values(overdueByStudent),
  })
}
