import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const classId = req.nextUrl.searchParams.get('class_id')
  const startDate = req.nextUrl.searchParams.get('start_date')
  const endDate = req.nextUrl.searchParams.get('end_date')

  if (!classId || !startDate || !endDate) {
    return NextResponse.json({ error: 'class_id, start_date et end_date sont requis' }, { status: 400 })
  }

  // Get students enrolled in class
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id, students(id, first_name, last_name)')
    .eq('new_class', classId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  type EnrollmentRow = {
    student_id: string
    students: { id: string; first_name: string; last_name: string } | null
  }

  const studentList = (enrollments as unknown as EnrollmentRow[] ?? [])
    .filter((e) => e.students)
    .map((e) => e.students!)

  if (studentList.length === 0) {
    return NextResponse.json({ students: [] })
  }

  const studentIds = studentList.map((s) => s.id)

  // Get presences for those students in date range
  const { data: presences } = await supabase
    .from('presences')
    .select('student_id, status')
    .eq('class_id', classId)
    .eq('tenant_id', tenantId)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('student_id', studentIds)

  // Aggregate counts per student
  const countMap = new Map<string, { present: number; absent: number; late: number; excused: number }>()
  for (const s of studentList) {
    countMap.set(s.id, { present: 0, absent: 0, late: 0, excused: 0 })
  }

  for (const p of presences ?? []) {
    const counts = countMap.get(p.student_id)
    if (!counts) continue
    if (p.status === 'present') counts.present++
    else if (p.status === 'absent') counts.absent++
    else if (p.status === 'late') counts.late++
    else if (p.status === 'excused') counts.excused++
  }

  const students = studentList
    .map((s) => {
      const c = countMap.get(s.id)!
      const total = c.present + c.absent + c.late + c.excused
      const rate = total > 0 ? Math.round((c.present / total) * 100) : 100
      return {
        studentId: s.id,
        studentName: `${s.first_name} ${s.last_name}`,
        presentCount: c.present,
        absentCount: c.absent,
        lateCount: c.late,
        excusedCount: c.excused,
        rate,
      }
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName, 'fr'))

  return NextResponse.json({ students })
}
