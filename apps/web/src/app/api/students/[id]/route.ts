import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Student360, StudentPatchData } from '@/types/student'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const [studentRes, enrollmentRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, first_name, last_name, first_name_ar, last_name_ar, date_of_birth, gender, annual_status, photo, parent_name, phone, email, class_id, classes(id, name, name_ar)')
      .eq('id', id)
      .single(),
    supabase
      .from('enrollments')
      .select('id, status, enrollment_fee, tuition_fee, academic_years(year)')
      .eq('student_id', id)
      .eq('status', 'confirmed')
      .limit(1),
  ])

  if (studentRes.error || !studentRes.data) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  const s = studentRes.data as any
  const enrollment = enrollmentRes.data?.[0] as any

  let paymentSummary: Student360['paymentSummary'] | undefined
  if (enrollment) {
    const { data: items } = await supabase
      .from('payment_items')
      .select('amount, paid_amount, status, due_date')
      .eq('student_id', id)
      .eq('item_type', 'schedule')
      .neq('status', 'cancelled')

    if (items) {
      const totalDue = items.reduce((sum, r) => sum + (r.amount ?? 0), 0)
      const totalPaid = items.reduce((sum, r) => sum + (r.paid_amount ?? 0), 0)
      const overdueItems = items.filter((r) => r.status === 'overdue')
      const totalOverdue = overdueItems.reduce((sum, r) => sum + ((r.amount ?? 0) - (r.paid_amount ?? 0)), 0)
      const pendingItems = items.filter((r) => r.status === 'pending' && r.due_date)
      const nextDueDate = pendingItems.sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0]?.due_date

      paymentSummary = { totalDue, totalPaid, totalOverdue, overdueCount: overdueItems.length, nextDueDate }
    }
  }

  const result: Student360 = {
    id: s.id,
    firstName: s.first_name,
    lastName: s.last_name,
    firstNameAr: s.first_name_ar ?? undefined,
    lastNameAr: s.last_name_ar ?? undefined,
    dateOfBirth: s.date_of_birth,
    gender: s.gender,
    annualStatus: s.annual_status ?? 'pending',
    photo: s.photo ?? undefined,
    parentName: s.parent_name ?? undefined,
    parentPhone: s.phone ?? undefined,
    parentEmail: s.email ?? undefined,
    class: s.classes ? { id: s.classes.id, name: s.classes.name, nameAr: s.classes.name_ar ?? undefined } : undefined,
    enrollment: enrollment
      ? {
          id: enrollment.id,
          status: enrollment.status,
          enrollmentFee: enrollment.enrollment_fee,
          tuitionFee: enrollment.tuition_fee,
          academicYear: enrollment.academic_years?.year ?? '',
        }
      : undefined,
    paymentSummary,
  }

  return NextResponse.json(result)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body: StudentPatchData = await request.json()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.firstName !== undefined) updates.first_name = body.firstName.trim()
  if (body.lastName !== undefined) updates.last_name = body.lastName.trim()
  if (body.firstNameAr !== undefined) updates.first_name_ar = body.firstNameAr?.trim() || null
  if (body.lastNameAr !== undefined) updates.last_name_ar = body.lastNameAr?.trim() || null
  if (body.dateOfBirth !== undefined) updates.date_of_birth = body.dateOfBirth
  if (body.gender !== undefined) updates.gender = body.gender
  if (body.classId !== undefined) updates.class_id = body.classId || null
  if (body.parentName !== undefined) updates.parent_name = body.parentName?.trim() || null
  if (body.parentPhone !== undefined) updates.phone = body.parentPhone?.trim() || null
  if (body.parentEmail !== undefined) updates.email = body.parentEmail?.trim() || null

  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select('id, first_name, last_name, first_name_ar, last_name_ar, annual_status, class_id, phone, email, classes(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    firstNameAr: data.first_name_ar ?? undefined,
    lastNameAr: data.last_name_ar ?? undefined,
    annualStatus: data.annual_status ?? 'pending',
    className: (data as any).classes?.name ?? undefined,
    classId: data.class_id ?? undefined,
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  // Guard : inscription active
  const { data: activeEnrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', id)
    .eq('status', 'confirmed')
    .limit(1)
    .single()

  if (activeEnrollment) {
    return NextResponse.json(
      { error: 'ACTIVE_ENROLLMENT', message: "Impossible de désactiver un élève avec une inscription active. Annulez l'inscription d'abord." },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('students')
    .update({ annual_status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
