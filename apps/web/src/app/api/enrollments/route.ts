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

  // Note: enrollments n'a pas de FK vers classes (pas de class_id). On utilise new_class (text).
  let query = supabase
    .from('enrollments')
    .select(`
      id, student_id, academic_year_id, enrollment_fee, tuition_fee, status, created_at,
      candidate_first_name, candidate_last_name, new_class,
      students(first_name, last_name),
      academic_years!inner(year)
    `)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (status) query = query.eq('status', status)
  if (academicYearId) query = query.eq('academic_year_id', academicYearId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const hasMore = rows.length > limit
  const items = rows.slice(0, limit).map((r) => {
    const s = r.students as any
    const studentName = s
      ? `${s.first_name} ${s.last_name}`
      : [r.candidate_first_name, r.candidate_last_name].filter(Boolean).join(' ') || 'Candidat'
    return {
      id: r.id,
      studentId: r.student_id,
      studentName,
      className: r.new_class || '—',
      academicYear: (r.academic_years as any).year,
      enrollmentFee: r.enrollment_fee,
      tuitionFee: r.tuition_fee,
      status: r.status,
      createdAt: r.created_at,
    }
  })

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
  if (!studentId || !academicYearId) {
    return NextResponse.json({ error: 'studentId, academicYearId requis' }, { status: 400 })
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

  // Résout le nom de classe si classId fourni
  let className = '—'
  if (classId) {
    const { data: cls } = await supabase.from('classes').select('name').eq('id', classId).single()
    if (cls) className = cls.name
  }

  const { data, error } = await supabase
    .from('enrollments')
    .insert({
      tenant_id: profile.tenant_id,
      student_id: studentId,
      new_class: className !== '—' ? className : null,
      academic_year_id: academicYearId,
      enrollment_fee: enrollmentFee ?? 0,
      tuition_fee: tuitionFee ?? 0,
      status: 'pending',
    })
    .select(`
      id, student_id, academic_year_id, enrollment_fee, tuition_fee, status, created_at, new_class,
      students!inner(first_name, last_name),
      academic_years!inner(year)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    id: data.id,
    studentId: data.student_id,
    studentName: `${(data.students as any).first_name} ${(data.students as any).last_name}`,
    className: data.new_class || '—',
    academicYear: (data.academic_years as any).year,
    enrollmentFee: data.enrollment_fee,
    tuitionFee: data.tuition_fee,
    status: data.status,
    createdAt: data.created_at,
  }, { status: 201 })
}
