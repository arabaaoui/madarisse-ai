import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AttendanceStatus, Period } from '@/types/presence'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const classId = req.nextUrl.searchParams.get('class_id')
  const date = req.nextUrl.searchParams.get('date')
  const period = (req.nextUrl.searchParams.get('period') ?? 'full_day') as Period

  if (!classId || !date) {
    return NextResponse.json({ error: 'class_id et date sont requis' }, { status: 400 })
  }

  // Get all active students enrolled in the class
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id, students(id, first_name, last_name)')
    .eq('new_class', classId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  // Get existing presences for that class+date+period
  const { data: presences } = await supabase
    .from('presences')
    .select('id, student_id, status, notes')
    .eq('class_id', classId)
    .eq('date', date)
    .eq('period', period)
    .eq('tenant_id', tenantId)

  const presenceMap = new Map(
    (presences ?? []).map((p) => [p.student_id, p])
  )

  type EnrollmentRow = {
    student_id: string
    students: { id: string; first_name: string; last_name: string } | null
  }

  const records = (enrollments as unknown as EnrollmentRow[] ?? [])
    .filter((e) => e.students)
    .map((e) => {
      const s = e.students!
      const existing = presenceMap.get(s.id)
      return {
        studentId: s.id,
        studentName: `${s.first_name} ${s.last_name}`,
        presenceId: existing?.id ?? null,
        status: (existing?.status ?? 'present') as AttendanceStatus,
        notes: existing?.notes ?? null,
      }
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName, 'fr'))

  return NextResponse.json({ date, classId, period, records })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const body = await req.json() as {
    class_id: string
    date: string
    period: Period
    records: { student_id: string; status: AttendanceStatus; notes?: string }[]
  }

  const { class_id, date, period, records } = body

  if (!class_id || !date || !period || !Array.isArray(records)) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const upsertData = records.map((r) => ({
    tenant_id: tenantId,
    student_id: r.student_id,
    class_id,
    date,
    period,
    status: r.status,
    notes: r.notes ?? null,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('presences')
    .upsert(upsertData, { onConflict: 'tenant_id,student_id,date,period' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ saved: records.length })
}
