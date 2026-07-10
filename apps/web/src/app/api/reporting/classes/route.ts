import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const today = new Date().toISOString().slice(0, 10)

  const { data: items } = await supabase
    .from('payment_items')
    .select(`
      id, amount, paid_amount, remaining_amount, status, due_date,
      students!inner(id, class_id,
        classes!inner(id, name)
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('item_type', 'schedule')
    .neq('status', 'cancelled')
    .limit(2000)

  if (!items || items.length === 0) {
    return NextResponse.json({ classes: [] })
  }

  // Aggregate by class
  const classMap: Record<
    string,
    {
      classId: string
      className: string
      studentIds: Set<string>
      totalDue: number
      totalPaid: number
      overdueCount: number
    }
  > = {}

  for (const item of items) {
    const student = item.students as unknown as {
      id: string
      class_id: string
      classes: { id: string; name: string }
    }
    const cls = student.classes
    const classId = cls.id

    if (!classMap[classId]) {
      classMap[classId] = {
        classId,
        className: cls.name,
        studentIds: new Set(),
        totalDue: 0,
        totalPaid: 0,
        overdueCount: 0,
      }
    }

    const entry = classMap[classId]
    entry.studentIds.add(student.id)
    entry.totalDue += item.amount
    entry.totalPaid += item.paid_amount ?? 0

    const isOverdue =
      item.status === 'overdue' ||
      (item.due_date && item.due_date < today && item.status !== 'paid')
    if (isOverdue) {
      entry.overdueCount += 1
    }
  }

  const classes = Object.values(classMap).map((c) => ({
    classId: c.classId,
    className: c.className,
    studentCount: c.studentIds.size,
    totalDue: Math.round(c.totalDue),
    totalPaid: Math.round(c.totalPaid),
    rate: c.totalDue > 0 ? Math.round((c.totalPaid / c.totalDue) * 1000) / 10 : 0,
    overdueCount: c.overdueCount,
  }))

  // Sort by class name
  classes.sort((a, b) => a.className.localeCompare(b.className, 'fr'))

  return NextResponse.json({ classes })
}
