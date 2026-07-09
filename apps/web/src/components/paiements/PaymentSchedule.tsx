'use client'

import type { PaymentItem } from '@/types/payment'
import { PAYMENT_STATUS_LABEL } from '@/types/payment'

const STATUS_VARIANT: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(n)

interface Props {
  items: PaymentItem[]
  onRecord: (item: PaymentItem) => void
}

export function PaymentSchedule({ items, onRecord }: Props) {
  const schedule = items.filter((i) => i.itemType === 'schedule')
  const fees = items.filter((i) => i.itemType === 'enrollment_fee')

  return (
    <div className="space-y-6">
      {fees.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-600">Frais d&apos;inscription</h3>
          <ItemTable items={fees} onRecord={onRecord} />
        </section>
      )}
      {schedule.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-600">Échéancier mensuel</h3>
          <ItemTable items={schedule} onRecord={onRecord} />
        </section>
      )}
      {items.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">Aucune échéance trouvée.</p>
      )}
    </div>
  )
}

function ItemTable({ items, onRecord }: { items: PaymentItem[]; onRecord: (i: PaymentItem) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2 text-left">Échéance</th>
            <th className="px-4 py-2 text-right">Montant</th>
            <th className="px-4 py-2 text-right">Payé</th>
            <th className="px-4 py-2 text-right">Restant</th>
            <th className="px-4 py-2 text-center">Statut</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-700">
                {item.dueDate
                  ? new Date(item.dueDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                  : '—'}
                {item.daysOverdue !== undefined && (
                  <span className="ml-2 text-xs text-red-500">+{item.daysOverdue}j</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono">{fmt(item.amount)}</td>
              <td className="px-4 py-3 text-right font-mono text-green-700">{fmt(item.paidAmount)}</td>
              <td className="px-4 py-3 text-right font-mono text-red-700">
                {item.remainingAmount > 0 ? fmt(item.remainingAmount) : '—'}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_VARIANT[item.status] ?? ''}`}
                >
                  {PAYMENT_STATUS_LABEL[item.status] ?? item.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {item.status !== 'paid' && item.status !== 'cancelled' && (
                  <button
                    onClick={() => onRecord(item)}
                    className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    Encaisser
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
