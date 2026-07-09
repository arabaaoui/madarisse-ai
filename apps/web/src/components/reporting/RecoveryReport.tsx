'use client'

import { useState } from 'react'
import { useRecoveryReport } from '@/hooks/usePayments'
import { useClasses } from '@/hooks/useEnrollments'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(n)

export function RecoveryReport() {
  const [classId, setClassId] = useState<string>('')
  const [month, setMonth] = useState<string>('')

  const { data: classes = [] } = useClasses()
  const { data, isLoading, error } = useRecoveryReport(classId || undefined, month || undefined)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Classe</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="h-8 rounded-md border border-gray-300 px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Mois</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-8 rounded-md border border-gray-300 px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        {(classId || month) && (
          <button
            onClick={() => { setClassId(''); setMonth('') }}
            className="self-end text-xs text-gray-400 hover:text-gray-600"
          >
            R\u00e9initialiser
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-gray-400">Chargement\u2026</p>}
      {error && <p className="text-sm text-red-600">Erreur : {String(error)}</p>}

      {data && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard label="Total attendu" value={fmt(data.totalDue)} />
            <KpiCard label="Total encaiss\u00e9" value={fmt(data.totalPaid)} accent="green" />
            <KpiCard
              label="Taux de recouvrement"
              value={`${data.rate.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`}
              accent={data.rate >= 80 ? 'green' : data.rate >= 50 ? 'yellow' : 'red'}
            />
            <KpiCard label="\u00c9ch\u00e9ances en retard" value={String(data.overdueCount)} accent={data.overdueCount > 0 ? 'red' : undefined} />
          </div>

          {/* Overdue students */}
          {data.overdueStudents.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">
                \u00c9l\u00e8ves en retard ({data.overdueStudents.length})
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">\u00c9l\u00e8ve</th>
                      <th className="px-4 py-2 text-right">Montant d\u00fb</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.overdueStudents
                      .sort((a, b) => b.amountDue - a.amountDue)
                      .map((s) => (
                        <tr key={s.studentId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <a
                              href={`/eleves/${s.studentId}`}
                              className="font-medium text-indigo-600 hover:underline"
                            >
                              {s.studentName}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-red-700">
                            {fmt(s.amountDue)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.overdueStudents.length === 0 && (
            <p className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
              Aucun impay\u00e9 sur la p\u00e9riode s\u00e9lectionn\u00e9e. \u2713
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function KpiCard({
  label, value, accent,
}: {
  label: string; value: string; accent?: 'green' | 'yellow' | 'red'
}) {
  const valueClass = accent === 'green'
    ? 'text-green-700'
    : accent === 'red'
      ? 'text-red-700'
      : accent === 'yellow'
        ? 'text-yellow-700'
        : 'text-gray-900'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}
