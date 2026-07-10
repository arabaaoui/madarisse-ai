import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const studentId = searchParams.get('student_id')
  const semester = searchParams.get('semester')

  let query = supabase
    .from('notes')
    .select('id, student_id, class_id, subject, exam_type, grade, coefficient, semester, notes, created_at')
    .order('subject', { ascending: true })

  if (studentId) query = query.eq('student_id', studentId)
  if (semester) query = query.eq('semester', parseInt(semester))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 400 })
  }

  const body = await request.json() as {
    student_id: string
    class_id?: string
    subject: string
    exam_type?: string
    grade: number
    coefficient?: number
    semester?: number
    notes?: string
  }

  if (!body.student_id || !body.subject?.trim() || body.grade === undefined) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({
      tenant_id: profile.tenant_id,
      student_id: body.student_id,
      class_id: body.class_id || null,
      subject: body.subject.trim(),
      exam_type: body.exam_type || 'cc',
      grade: body.grade,
      coefficient: body.coefficient ?? 1,
      semester: body.semester ?? 1,
      notes: body.notes?.trim() || null,
      created_by: user.id,
    })
    .select('id, student_id, class_id, subject, exam_type, grade, coefficient, semester, notes, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
