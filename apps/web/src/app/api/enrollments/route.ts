import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EnrollmentFormData } from '@/types/enrollment'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const classId = searchParams.get('class_id')
  const academicYearId = searchParams.get('academic_year_id')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

  let query = supabase
    .from('enrollments')
    .select(`
      id, student_id, class_id, academic_year_id, enrollment_fee, tuition_fee, status, created_at,
      students!inner(first_name, last_name),
      classes!inner(name),
      academic_years!inner(year)
    `)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (status) query = query.eq('status', status)
  if (classId) query = query.eq('class_id', classId)
  if (academicYearId) query = query.eq('academic_year_id', academicYearId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const hasMore = rows.length > limit
  const items = rows.slice(0, limit).map((r) => ({
    id: r.id,
    studentId: r.student_id,
    studentName: `${(r.students as any).first_name} ${(r.students as any).last_name}`,
    className: (r.classes as any).name,
    academicYear: (r.academic_years as any).year,
    enrollmentFee: r.enrollment_fee,
    tuitionFee: r.tuition_fee,
    status: r.status,
    createdAt: r.created_at,
  }))

  return NextResponse.json({ data: items, hasMore })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  let body: EnrollmentFormData
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { studentId, classId, academicYearId, enrollmentFee, tuitionFee } = body
  if (!studentId || !classId || !academicYearId) {
    return NextResponse.json({ error: 'studentId, classId, academicYearId requis' }, { status: 400 })
  }

  // Récupère le tenant_id depuis le profil utilisateur
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant non trouvé' }, { status: 403 })
  }

  // Vérifie doublon (même élève + même année scolaire + même tenant)
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('tenant_id', profile.tenant_id)
    .neq('status', 'cancelled')
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'Cet élève est déjà inscrit pour cette année scolaire', existing_id: existing[0].id },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('enrollments')
    .insert({
      tenant_id: profile.tenant_id,
      student_id: studentId,
      class_id: classId,
      academic_year_id: academicYearId,
      enrollment_fee: enrollmentFee ?? 0,
      tuition_fee: tuitionFee ?? 0,
      status: 'pending',
    })
    .select(`
      id, student_id, class_id, academic_year_id, enrollment_fee, tuition_fee, status, created_at,
      students!inner(first_name, last_name),
      classes!inner(name),
      academic_years!inner(year)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    id: data.id,
    studentId: data.student_id,
    studentName: `${(data.students as any).first_name} ${(data.students as any).last_name}`,
    className: (data.classes as any).name,
    academicYear: (data.academic_years as any).year,
    enrollmentFee: data.enrollment_fee,
    tuitionFee: data.tuition_fee,
    status: data.status,
    createdAt: data.created_at,
  }, { status: 201 })
}
