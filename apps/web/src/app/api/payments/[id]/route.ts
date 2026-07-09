import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const tenantId = session?.user?.user_metadata?.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  if (body.action !== 'cancel') {
    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  }

  // Fetch the transaction
  const { data: tx } = await supabase
    .from('accounting_transactions')
    .select('id, amount, payment_item_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!tx) return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })

  // Reverse payment_item amounts
  if (tx.payment_item_id) {
    const { data: item } = await supabase
      .from('payment_items')
      .select('amount, paid_amount')
      .eq('id', tx.payment_item_id)
      .eq('tenant_id', tenantId)
      .single()

    if (item) {
      const newPaid = Math.max(0, Math.round((item.paid_amount - tx.amount) * 100) / 100)
      const newRemaining = Math.round((item.amount - newPaid) * 100) / 100
      const newStatus = newRemaining <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending'

      await supabase
        .from('payment_items')
        .update({ paid_amount: newPaid, remaining_amount: newRemaining, status: newStatus })
        .eq('id', tx.payment_item_id)
    }
  }

  // Delete the transaction (or mark cancelled if soft-delete preferred)
  await supabase.from('accounting_transactions').delete().eq('id', id)

  return NextResponse.json({ status: 'cancelled' })
}
