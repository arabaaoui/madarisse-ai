'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

interface ClassRow {
  classId: string
  className: string
  studentCount: number
  totalDue: number
  totalPaid: number
  rate: number
  overdueCount: number
}

interface ClassesResponse {
  classes: ClassRow[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n)

function rateColor(rate: number): string {
  if (rate >= 80) return 'text-green-700 bg-green-50'
  if (rate >= 50) return 'text-yellow-700 bg-yellow-50'
  return 'text-red-700 bg-red-50'
}

export function ClassRecoveryTable() {
  const { data, isLoading, error } = useQuery<ClassesResponse>({
    queryKey: ['class-recovery'],
    queryFn: async () => {
      const res = await fetch('/api/reporting/classes')
      if (!res.ok) throw new Error('Erreur chargement données par classe')
      return res.json()
    },
    staleTime: 5 * 60_000,
  })

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="p-5 pb-3">
        <h2 className="text-base font-semibold text-gray-800">Recouvrement par classe</h2>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <svg className="h-6 w-6 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="ml-2 text-sm text-gray-400">Chargement…</span>
        </div>
      )}

      {error && (
        <p className="px-5 pb-5 text-sm text-red-500">Erreur de chargement des données.</p>
      )}

      {!isLoading && !error && data && (
        <>
          {data.classes.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-gray-400">Aucune donnée disponible.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-2.5 text-left">Classe</th>
                    <th className="px-4 py-2.5 text-right">Élèves</th>
                    <th className="px-4 py-2.5 text-right">Attendu (MAD)</th>
                    <th className="px-4 py-2.5 text-right">Encaissé (MAD)</th>
                    <th className="px-4 py-2.5 text-center">Taux</th>
                    <th className="px-4 py-2.5 text-right">Retards</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.classes.map((row) => (
                    <tr key={row.classId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <Link
                          href={`/reporting?class_id=${row.classId}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {row.className}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{row.studentCount}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(row.totalDue)}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(row.totalPaid)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${rateColor(row.rate)}`}>
                          {row.rate.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.overdueCount > 0 ? (
                          <span className="font-semibold text-red-600">{row.overdueCount}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
