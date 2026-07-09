import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { StudentListItem, StudentFormData } from '@/types/student'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search') ?? ''
  const classId = searchParams.get('class_id')
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const after = searchParams.get('after')

  let query = supabase
    .from('students')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, annual_status, class_id, phone, email, classes(name)')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .limit(limit + 1)

  if (search.length >= 2) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,first_name_ar.ilike.%${search}%,last_name_ar.ilike.%${search}%`
    )
  }
  if (classId) query = query.eq('class_id', classId)
  if (status) query = query.eq('annual_status', status)
  if (after) query = query.gt('id', after)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const hasMore = (data?.length ?? 0) > limit
  const rows = (hasMore ? data!.slice(0, limit) : data) ?? []

  const result: StudentListItem[] = rows.map((r: any) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    firstNameAr: r.first_name_ar ?? undefined,
    lastNameAr: r.last_name_ar ?? undefined,
    annualStatus: r.annual_status ?? 'pending',
    className: r.classes?.name ?? undefined,
    classId: r.class_id ?? undefined,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
  }))

  return NextResponse.json({
    data: result,
    hasMore,
    nextCursor: hasMore ? rows[rows.length - 1]?.id : null,
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body: StudentFormData = await request.json()

  if (!body.firstName?.trim() || !body.lastName?.trim() || !body.dateOfBirth || !body.gender) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', fields: { firstName: 'Requis', lastName: 'Requis', dateOfBirth: 'Requise', gender: 'Requis' } },
      { status: 400 }
    )
  }

  // tenant_id via JWT metadata
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'TENANT_NOT_FOUND' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('students')
    .insert({
      tenant_id: profile.tenant_id,
      first_name: body.firstName.trim(),
      last_name: body.lastName.trim(),
      first_name_ar: body.firstNameAr?.trim() || null,
      last_name_ar: body.lastNameAr?.trim() || null,
      date_of_birth: body.dateOfBirth,
      gender: body.gender,
      class_id: body.classId || null,
      annual_status: 'pending',
      parent_name: body.parentName?.trim() || null,
      phone: body.parentPhone?.trim() || null,
      email: body.parentEmail?.trim() || null,
    })
    .select('id, first_name, last_name, first_name_ar, last_name_ar, annual_status, class_id, phone, email, classes(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result: StudentListItem = {
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
  }

  return NextResponse.json(result, { status: 201 })
}
