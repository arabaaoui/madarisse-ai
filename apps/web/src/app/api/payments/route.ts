import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentId = req.nextUrl.searchParams.get('student_id')
  if (!studentId) return NextResponse.json({ error: 'student_id requis' }, { status: 400 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const { data: student } = await supabase
    .from('students')
    .select('id, first_name, last_name')
    .eq('id', studentId)
    .eq('tenant_id', tenantId)
    .single()

  if (!student) return NextResponse.json({ error: '\u00c9l\u00e8ve introuvable' }, { status: 404 })

  const { data: items } = await supabase
    .from('payment_items')
    .select(`
      id, item_type, amount, paid_amount, remaining_amount, status, due_date,
      accounting_transactions(id, amount, payment_method, transaction_date, notes)
    `)
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true })

  const today = new Date().toISOString().slice(0, 10)

  type RawTx = { id: string; amount: number; payment_method: string; transaction_date: string; notes: string | null }
  type RawItem = {
    id: string; item_type: string; amount: number; paid_amount: number
    remaining_amount: number; status: string; due_date: string | null
    accounting_transactions: RawTx[]
  }

  const enriched = (items as RawItem[] ?? []).map((item) => {
    const daysOverdue =
      item.due_date && item.status !== 'paid' && item.due_date < today
        ? Math.floor((Date.now() - new Date(item.due_date).getTime()) / 86_400_000)
        : undefined
    // remaining_amount peut être NULL si créé par le trigger DB (qui ne le remplit pas)
    const remainingAmount = item.remaining_amount ?? (item.amount - item.paid_amount)
    return {
      id: item.id,
      itemType: item.item_type,
      amount: item.amount,
      paidAmount: item.paid_amount,
      remainingAmount,
      status: item.status,
      dueDate: item.due_date,
      daysOverdue,
      transactions: (item.accounting_transactions ?? []).map((t) => ({
        id: t.id,
        amount: t.amount,
        paymentMethod: t.payment_method,
        transactionDate: t.transaction_date,
        notes: t.notes,
      })),
    }
  })

  const totalDue = enriched.reduce((s, i) => s + i.amount, 0)
  const totalPaid = enriched.reduce((s, i) => s + i.paidAmount, 0)
  const overdueItems = enriched.filter((i) => i.daysOverdue !== undefined)
  const totalOverdue = overdueItems.reduce((s, i) => s + i.remainingAmount, 0)

  return NextResponse.json({
    studentId: student.id,
    studentName: `${student.first_name} ${student.last_name}`,
    items: enriched,
    summary: { totalDue, totalPaid, totalOverdue, overdueCount: overdueItems.length },
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const body = await req.json() as {
    studentId: string; paymentItemId: string; amount: number
    paymentMethod: string; transactionDate?: string; notes?: string
  }
  const { studentId, paymentItemId, amount, paymentMethod, transactionDate, notes } = body

  if (!studentId || !paymentItemId || !amount || !paymentMethod) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const VALID_METHODS = ['cash', 'transfer', 'check']
  if (!VALID_METHODS.includes(paymentMethod)) {
    return NextResponse.json({ error: 'Mode de paiement invalide' }, { status: 400 })
  }

  const today = transactionDate || new Date().toISOString().slice(0, 10)

  const { data: existing } = await supabase
    .from('accounting_transactions')
    .select('id')
    .eq('payment_item_id', paymentItemId)
    .eq('amount', amount)
    .eq('transaction_date', today)
    .eq('tenant_id', tenantId)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'Un paiement identique existe d\u00e9j\u00e0 pour cette \u00e9ch\u00e9ance aujourd\u2019hui' },
      { status: 409 },
    )
  }

  const { data: item } = await supabase
    .from('payment_items')
    .select('amount, paid_amount, remaining_amount')
    .eq('id', paymentItemId)
    .eq('tenant_id', tenantId)
    .single()

  if (!item) return NextResponse.json({ error: '\u00c9ch\u00e9ance introuvable' }, { status: 404 })

  const remainingAmount = (item.remaining_amount as number | null) ?? ((item.amount as number) - (item.paid_amount as number))
  if (amount > remainingAmount + 0.01) {
    return NextResponse.json(
      {
        error: 'Montant sup\u00e9rieur au restant d\u00fb',
        remaining: remainingAmount,
        overpayment: Math.round((amount - remainingAmount) * 100) / 100,
      },
      { status: 400 },
    )
  }

  const { data: tx, error: txError } = await supabase
    .from('accounting_transactions')
    .insert({
      tenant_id: tenantId,
      student_id: studentId,
      payment_item_id: paymentItemId,
      amount,
      payment_method: paymentMethod,
      transaction_date: today,
      notes: notes ?? null,
    })
    .select()
    .single()

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

  const paidBefore = item.paid_amount as number
  const newPaid = Math.round((paidBefore + amount) * 100) / 100
  const newRemaining = Math.round(((item.amount as number) - newPaid) * 100) / 100
  const newStatus = newRemaining <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending'

  await supabase
    .from('payment_items')
    .update({ paid_amount: newPaid, remaining_amount: newRemaining, status: newStatus })
    .eq('id', paymentItemId)

  return NextResponse.json({ transaction: tx, newStatus }, { status: 201 })
}
