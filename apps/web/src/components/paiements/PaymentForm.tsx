'use client'

import { useState } from 'react'
import type { PaymentItem } from '@/types/payment'
import { PAYMENT_METHOD_LABEL } from '@/types/payment'
import { useRecordPayment } from '@/hooks/usePayments'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(n)

interface Props {
  studentId: string
  item: PaymentItem
  onSuccess: () => void
  onCancel: () => void
}

export function PaymentForm({ studentId, item, onSuccess, onCancel }: Props) {
  const [amount, setAmount] = useState(item.remainingAmount)
  const [method, setMethod] = useState<'cash' | 'transfer' | 'check'>('cash')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  const record = useRecordPayment()

  const excess = amount > item.remainingAmount
    ? Math.round((amount - item.remainingAmount) * 100) / 100
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    try {
      await record.mutateAsync({
        studentId,
        paymentItemId: item.id,
        amount,
        paymentMethod: method,
        transactionDate: date,
        notes: notes || undefined,
      })
      onSuccess()
    } catch (err: unknown) {
      const e = err as { message?: string }
      setServerError(e.message ?? 'Erreur inattendue')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Montant de l&apos;\u00e9ch\u00e9ance</span>
          <span className="font-medium">{fmt(item.amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">D\u00e9j\u00e0 pay\u00e9</span>
          <span className="font-medium text-green-700">{fmt(item.paidAmount)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
          <span className="font-semibold">Restant d\u00fb</span>
          <span className="font-semibold text-red-700">{fmt(item.remainingAmount)}</span>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Montant vers\u00e9 (MAD)
        </label>
        <input
          type="number"
          min={0.01}
          step={0.01}
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
        {excess > 0 && (
          <p className="mt-1 text-xs text-amber-600">
            Attention\u00a0: trop-per\u00e7u de {fmt(excess)}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Mode de paiement</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as typeof method)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {(Object.entries(PAYMENT_METHOD_LABEL) as [typeof method, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optionnel)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {serverError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={record.isPending || amount <= 0}
          className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {record.isPending ? 'Enregistrement...' : 'Confirmer le paiement'}
        </button>
      </div>
    </form>
  )
}
