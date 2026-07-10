'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { PaymentSchedule } from './PaymentSchedule'
import { PaymentForm } from './PaymentForm'
import { useStudentPayments } from '@/hooks/usePayments'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import type { PaymentItem } from '@/types/payment'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(n)

// ─── Panneau paiements récents (tous élèves, 20 derniers) ─────────────────────
interface RecentPayment {
  id: string
  payment_date: string | null
  paid_amount: number
  item_type: string
  payment_method: string | null
  students: { first_name: string; last_name: string } | null
  enrollments: { new_class: string | null } | null
}

function RecentPaymentsPanel({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<RecentPayment[]>([])
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    setLoading(true)
    sb.from('payment_items')
      .select('id, payment_date, paid_amount, item_type, payment_method, students(first_name, last_name), enrollments(new_class)')
      .eq('status', 'paid')
      .order('updated_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setItems((data ?? []) as unknown as RecentPayment[])
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const itemTypeLabel = (t: string) =>
    t === 'enrollment_fee' ? 'Frais inscription' : t === 'schedule' ? 'Scolarité' : 'Manuel'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Paiements récents</h2>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Aucun paiement enregistré.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Élève</th>
                <th className="px-3 py-2 font-medium">Classe</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Mode</th>
                <th className="px-3 py-2 font-medium text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                    {p.payment_date ? new Date(p.payment_date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {p.students ? `${p.students.first_name} ${p.students.last_name}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{p.enrollments?.new_class ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{itemTypeLabel(p.item_type)}</td>
                  <td className="px-3 py-2 text-gray-500 capitalize">{p.payment_method ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-green-700">
                    +{fmt(p.paid_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function PaiementsClient() {
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState('')
  const [selectedItem, setSelectedItem] = useState<PaymentItem | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const { data, isLoading, error } = useStudentPayments(studentId)

  return (
    <div className="space-y-6">
      <RecentPaymentsPanel refreshKey={refreshKey} />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Rechercher un \u00e9l\u00e8ve</h2>
        <StudentPickerInline
          onSelect={(id, name) => {
            setStudentId(id)
            setStudentName(name)
          }}
        />
      </div>

      {studentId && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{studentName}</h2>
              {data && (
                <div className="mt-1 flex gap-6 text-sm text-gray-500">
                  <span>D\u00fb\u00a0: <strong className="text-gray-800">{fmt(data.summary.totalDue)}</strong></span>
                  <span>Pay\u00e9\u00a0: <strong className="text-green-700">{fmt(data.summary.totalPaid)}</strong></span>
                  {data.summary.totalOverdue > 0 && (
                    <span>En retard\u00a0: <strong className="text-red-700">{fmt(data.summary.totalOverdue)}</strong></span>
                  )}
                </div>
              )}
            </div>
            <button
              className="text-sm text-gray-400 hover:text-gray-600"
              onClick={() => { setStudentId(null); setStudentName('') }}
            >
              \u2715 Changer
            </button>
          </div>

          {isLoading && <p className="text-sm text-gray-400">Chargement\u2026</p>}
          {error && <p className="text-sm text-red-600">Erreur : {String(error)}</p>}
          {data && (
            <PaymentSchedule
              items={data.items}
              onRecord={(item) => setSelectedItem(item)}
            />
          )}
        </div>
      )}

      {/* Payment dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null) }}>
        <DialogContent>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          {selectedItem && studentId && (
            <PaymentForm
              studentId={studentId}
              item={selectedItem}
              onSuccess={() => { setSelectedItem(null); setRefreshKey(k => k + 1) }}
              onCancel={() => setSelectedItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StudentPickerInline({
  onSelect,
}: {
  onSelect: (id: string, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; name: string }[]>([])
  const [open, setOpen] = useState(false)

  async function search(q: string) {
    setQuery(q)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    const res = await fetch(`/api/students/search?q=${encodeURIComponent(q)}`)
    if (!res.ok) return
    const data = await res.json()
    setResults(data.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })))
    setOpen(data.length > 0)
  }

  return (
    <div className="relative max-w-sm">
      <Input
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Rechercher un \u00e9l\u00e8ve\u2026"
        className="w-full"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-auto rounded-md border bg-white shadow-lg max-h-48">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => {
                onSelect(r.id, r.name)
                setOpen(false)
                setQuery('')
              }}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
