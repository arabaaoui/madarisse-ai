import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SCHEDULE_MONTHS = 10

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await request.json()
  const { ids } = body as { ids: string[] }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids requis (tableau non vide)' }, { status: 400 })
  }

  let validated = 0
  let skipped = 0
  const errors: { id: string; reason: string }[] = []

  // Récupère les inscriptions en attente parmi les IDs fournis
  const { data: enrollments, error: fetchError } = await supabase
    .from('enrollments')
    .select('id, status, student_id, enrollment_fee, tuition_fee, tenant_id')
    .in('id', ids)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  for (const enrollment of enrollments ?? []) {
    if (enrollment.status !== 'pending') {
      skipped++
      continue
    }

    const { error: updateError } = await supabase
      .from('enrollments')
      .update({ status: 'confirmed' })
      .eq('id', enrollment.id)

    if (updateError) {
      errors.push({ id: enrollment.id, reason: updateError.message })
      continue
    }

    // Génère l'échéancier
    await generatePaymentSchedule(supabase, enrollment)
    validated++
  }

  return NextResponse.json({ validated, skipped, errors })
}

async function generatePaymentSchedule(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  enrollment: { id: string; student_id: string; tenant_id: string; enrollment_fee: number; tuition_fee: number }
) {
  const items = []
  const now = new Date()

  if (enrollment.enrollment_fee > 0) {
    items.push({
      tenant_id: enrollment.tenant_id,
      student_id: enrollment.student_id,
      enrollment_id: enrollment.id,
      item_type: 'enrollment_fee',
      amount: enrollment.enrollment_fee,
      paid_amount: 0,
      remaining_amount: enrollment.enrollment_fee,
      status: 'pending',
      due_date: now.toISOString().split('T')[0],
    })
  }

  if (enrollment.tuition_fee > 0) {
    for (let i = 1; i <= SCHEDULE_MONTHS; i++) {
      const due = new Date(now.getFullYear(), now.getMonth() + i, 1)
      items.push({
        tenant_id: enrollment.tenant_id,
        student_id: enrollment.student_id,
        enrollment_id: enrollment.id,
        item_type: 'schedule',
        amount: enrollment.tuition_fee,
        paid_amount: 0,
        remaining_amount: enrollment.tuition_fee,
        status: 'pending',
        due_date: due.toISOString().split('T')[0],
      })
    }
  }

  if (items.length > 0) {
    await supabase.from('payment_items').insert(items)
  }
}
