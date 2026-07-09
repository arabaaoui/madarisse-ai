import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { StudentSearchResult } from '@/types/student'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json([])

  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, annual_status, classes(name)')
    .or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,first_name_ar.ilike.%${q}%,last_name_ar.ilike.%${q}%`
    )
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result: StudentSearchResult[] = (data ?? []).map((r: any) => ({
    id: r.id,
    name: `${r.first_name} ${r.last_name}`,
    className: r.classes?.name ?? undefined,
    annualStatus: r.annual_status ?? 'pending',
  }))

  return NextResponse.json(result)
}
