'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface Transaction {
  id: string
  transaction_date: string
  amount: number
  description_fr: string
  transaction_type: 'revenue' | 'expense'
  category_id: string | null
  category_name: string | null
  reference: string | null
}

interface Category {
  id: string
  name_fr: string
  category_type: 'revenue' | 'expense'
}

function useTenantId() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      if (data.user) {
        sb.from('profiles').select('tenant_id').eq('id', data.user.id).maybeSingle()
          .then(({ data: p }) => setTenantId(p?.tenant_id ?? null))
      }
    })
  }, [])
  return tenantId
}

const inp = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#FF7A00] focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20'
const btn = 'inline-flex items-center gap-2 rounded-xl bg-[#02133E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#02133E]/90 disabled:opacity-50 transition-colors'

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

function StatCard({ label, amount, type }: { label: string; amount: number; type: 'revenue' | 'expense' | 'balance' }) {
  const colors = {
    revenue: 'bg-green-50 border-green-200 text-green-700',
    expense: 'bg-red-50 border-red-200 text-red-700',
    balance: amount >= 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-orange-50 border-orange-200 text-orange-700',
  }
  const Icon = type === 'revenue' ? TrendingUp : type === 'expense' ? TrendingDown : DollarSign
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colors[type]}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <div>
        <p className="text-xs font-medium opacity-70">{label}</p>
        <p className="text-lg font-bold">{amount.toLocaleString('fr-MA')} MAD</p>
      </div>
    </div>
  )
}

export default function ComptabiliteClient() {
  const tenantId = useTenantId()
  const sb = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'revenue' | 'expense'>('all')
  const [filterMonth, setFilterMonth] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    amount: '',
    description_fr: '',
    transaction_type: 'revenue' as 'revenue' | 'expense',
    category_id: '',
    reference: '',
  })

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)

    let q = sb.from('accounting_transactions')
      .select('id, transaction_date, amount, description_fr, transaction_type, category_id, reference, accounting_categories(name_fr)')
      .eq('tenant_id', tenantId)
      .order('transaction_date', { ascending: false })

    if (filterType !== 'all') q = q.eq('transaction_type', filterType)
    if (filterMonth) {
      const [year, month] = filterMonth.split('-')
      const start = `${year}-${month}-01`
      const end = new Date(+year, +month, 0).toISOString().split('T')[0]
      q = q.gte('transaction_date', start).lte('transaction_date', end)
    }

    const { data, error } = await q
    if (error) toast.error(error.message)
    setTransactions((data ?? []).map((t: Record<string, unknown>) => ({
      ...t,
      category_name: (t.accounting_categories as Record<string, string> | null)?.name_fr ?? null,
    })) as Transaction[])
    setLoading(false)
  }, [tenantId, filterType, filterMonth])

  useEffect(() => {
    if (!tenantId) return
    sb.from('accounting_categories').select('id, name_fr, category_type').eq('tenant_id', tenantId).eq('is_active', true)
      .then(({ data }) => setCategories(data ?? []))
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.amount || !form.description_fr) return toast.error('Montant et description requis')
    setSaving(true)
    const { error } = await sb.from('accounting_transactions').insert({
      tenant_id: tenantId,
      transaction_date: form.transaction_date,
      amount: parseFloat(form.amount),
      description_fr: form.description_fr,
      transaction_type: form.transaction_type,
      category_id: form.category_id || null,
      reference: form.reference || null,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Transaction enregistrée')
    setForm({ transaction_date: new Date().toISOString().split('T')[0], amount: '', description_fr: '', transaction_type: 'revenue', category_id: '', reference: '' })
    setShowForm(false)
    load()
  }

  const totalRevenue = transactions.filter(t => t.transaction_type === 'revenue').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + t.amount, 0)

  const filteredCats = categories.filter(c => c.category_type === form.transaction_type)

  if (!tenantId) return (
    <div className="flex items-center gap-2 text-sm text-gray-500 p-8">
      <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comptabilité</h1>
          <p className="text-sm text-gray-500 mt-1">Suivi des revenus et dépenses de l'école</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className={btn}>
          <Plus className="h-4 w-4" />
          Nouvelle transaction
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total revenus" amount={totalRevenue} type="revenue" />
        <StatCard label="Total dépenses" amount={totalExpense} type="expense" />
        <StatCard label="Solde" amount={totalRevenue - totalExpense} type="balance" />
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800">Nouvelle transaction manuelle</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input type="date" className={inp} value={form.transaction_date}
                onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} />
            </Field>
            <Field label="Montant (MAD)">
              <input type="number" min="0" className={inp} value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
            </Field>
            <Field label="Description" className="col-span-2">
              <input className={inp} value={form.description_fr}
                onChange={e => setForm(f => ({ ...f, description_fr: e.target.value }))} placeholder="ex: Achat fournitures" />
            </Field>
            <Field label="Type">
              <select className={inp} value={form.transaction_type}
                onChange={e => setForm(f => ({ ...f, transaction_type: e.target.value as 'revenue' | 'expense', category_id: '' }))}>
                <option value="revenue">Revenu</option>
                <option value="expense">Dépense</option>
              </select>
            </Field>
            <Field label="Catégorie">
              <select className={inp} value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">— Aucune —</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name_fr}</option>)}
              </select>
            </Field>
            <Field label="Référence / N° pièce">
              <input className={inp} value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Optionnel" />
            </Field>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className={btn}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Enregistrer
            </button>
            <button onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {(['all', 'revenue', 'expense'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${filterType === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'all' ? 'Tous' : t === 'revenue' ? 'Revenus' : 'Dépenses'}
            </button>
          ))}
        </div>
        <input type="month" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:border-[#FF7A00]"
          value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
        {filterMonth && (
          <button onClick={() => setFilterMonth('')} className="text-xs text-gray-400 hover:text-gray-600">
            Effacer
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Catégorie</th>
                <th className="px-4 py-3 font-medium">Référence</th>
                <th className="px-4 py-3 font-medium text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t.transaction_date}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.description_fr}</td>
                  <td className="px-4 py-3 text-gray-500">{t.category_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{t.reference ?? '—'}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${t.transaction_type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.transaction_type === 'revenue' ? '+' : '-'}{t.amount.toLocaleString('fr-MA')} MAD
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Aucune transaction sur cette période</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
