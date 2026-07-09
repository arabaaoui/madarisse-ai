'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { PaymentSchedule } from './PaymentSchedule'
import { PaymentForm } from './PaymentForm'
import { useStudentPayments } from '@/hooks/usePayments'
import type { PaymentItem } from '@/types/payment'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(n)

export function PaiementsClient() {
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState('')
  const [selectedItem, setSelectedItem] = useState<PaymentItem | null>(null)

  const { data, isLoading, error } = useStudentPayments(studentId)

  return (
    <div className="space-y-6">
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
              onSuccess={() => setSelectedItem(null)}
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
