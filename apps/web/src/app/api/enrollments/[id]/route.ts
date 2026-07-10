import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      id, student_id, academic_year_id, enrollment_fee, tuition_fee, status, created_at,
      candidate_first_name, candidate_last_name, new_class,
      students(first_name, last_name),
      academic_years!inner(year)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Non trouvée' }, { status: 404 })

  const s = data.students as any
  const studentName = s
    ? `${s.first_name} ${s.last_name}`
    : [data.candidate_first_name, data.candidate_last_name].filter(Boolean).join(' ') || 'Candidat'

  return NextResponse.json({
    id: data.id,
    studentId: data.student_id,
    studentName,
    className: data.new_class || '—',
    academicYear: (data.academic_years as any).year,
    enrollmentFee: data.enrollment_fee,
    tuitionFee: data.tuition_fee,
    status: data.status,
    createdAt: data.created_at,
  })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await request.json()
  const { status } = body as { status: string }

  if (!['confirmed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Statut invalide (confirmed | cancelled)' }, { status: 400 })
  }

  // Récupère l'inscription courante (avec infos candidat pour inscriptions agent)
  const { data: current } = await supabase
    .from('enrollments')
    .select('id, status, student_id, enrollment_fee, tuition_fee, tenant_id, academic_year_id, candidate_first_name, candidate_last_name, new_class')
    .eq('id', id)
    .single()

  if (!current) return NextResponse.json({ error: 'Non trouvée' }, { status: 404 })
  if (current.status === 'confirmed') {
    return NextResponse.json({ error: 'Inscription déjà confirmée' }, { status: 409 })
  }
  if (current.status === 'cancelled') {
    return NextResponse.json({ error: 'Inscription annulée — non modifiable' }, { status: 409 })
  }

  let studentId = current.student_id

  // Inscription créée par l'agent (sans student_id) : créer l'élève maintenant
  if (!studentId && current.candidate_first_name) {
    let classId: string | null = null
    if (current.new_class) {
      const { data: cls } = await supabase.from('classes')
        .select('id').eq('tenant_id', current.tenant_id)
        .eq('academic_year_id', current.academic_year_id)
        .ilike('name', current.new_class).limit(1)
      classId = cls?.[0]?.id ?? null
    }
    const { data: newStudent } = await supabase.from('students').insert({
      tenant_id: current.tenant_id,
      first_name: current.candidate_first_name,
      last_name: current.candidate_last_name,
      class: current.new_class || '',
      annual_status: 'pending',
      academic_year_id: current.academic_year_id,
      ...(classId ? { class_id: classId } : {}),
    }).select('id').single()
    if (newStudent) {
      studentId = newStudent.id
      await supabase.from('enrollments').update({ student_id: studentId }).eq('id', id)
    }
  }

  const { error: updateError } = await supabase
    .from('enrollments')
    .update({ status })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Génère l'échéancier si confirmation et si le trigger ne l'a pas déjà fait
  if (status === 'confirmed' && studentId) {
    await generatePaymentSchedule(supabase, {
      enrollmentId: id,
      studentId,
      tenantId: current.tenant_id,
      enrollmentFee: current.enrollment_fee,
      tuitionFee: current.tuition_fee,
    })
  }

  return NextResponse.json({ id, status })
}

async function generatePaymentSchedule(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  opts: {
    enrollmentId: string
    studentId: string
    tenantId: string
    enrollmentFee: number
    tuitionFee: number
  }
) {
  const { enrollmentId, studentId, tenantId, enrollmentFee, tuitionFee } = opts
  const SCHEDULE_MONTHS = 10
  const items = []

  // Frais d'inscription (dû immédiatement)
  if (enrollmentFee > 0) {
    items.push({
      tenant_id: tenantId,
      student_id: studentId,
      enrollment_id: enrollmentId,
      item_type: 'enrollment_fee',
      amount: enrollmentFee,
      paid_amount: 0,
      remaining_amount: enrollmentFee,
      status: 'pending',
      due_date: new Date().toISOString().split('T')[0],
    })
  }

  // Mensualités (1er de chaque mois, à partir du mois prochain)
  if (tuitionFee > 0) {
    const now = new Date()
    for (let i = 1; i <= SCHEDULE_MONTHS; i++) {
      const due = new Date(now.getFullYear(), now.getMonth() + i, 1)
      items.push({
        tenant_id: tenantId,
        student_id: studentId,
        enrollment_id: enrollmentId,
        item_type: 'schedule',
        amount: tuitionFee,
        paid_amount: 0,
        remaining_amount: tuitionFee,
        status: 'pending',
        due_date: due.toISOString().split('T')[0],
      })
    }
  }

  if (items.length > 0) {
    await supabase.from('payment_items').insert(items)
  }
}
