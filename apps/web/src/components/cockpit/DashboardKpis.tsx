'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

interface KpiData {
  confirmedEnrollments: number
  pendingEnrollments: number
  recoveryRate: number | null
  recoveryMonth: string
}

function fmt(rate: number) {
  return `${rate.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
}

function monthLabel(yyyyMM: string) {
  const [y, m] = yyyyMM.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export function DashboardKpis() {
  const { data, isLoading } = useQuery<KpiData>({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/kpis')
      if (!res.ok) throw new Error('Erreur chargement KPIs')
      return res.json()
    },
    staleTime: 60_000,
  })

  const kpis = [
    {
      label: '\u00c9l\u00e8ves inscrits',
      value: isLoading ? '\u2026' : String(data?.confirmedEnrollments ?? 0),
      note: 'inscriptions confirm\u00e9es',
      href: '/eleves',
    },
    {
      label: 'Taux de recouvrement',
      value: isLoading ? '\u2026' : data?.recoveryRate != null ? fmt(data.recoveryRate) : '\u2014',
      note: isLoading || !data ? 'ce mois' : monthLabel(data.recoveryMonth),
      href: '/reporting',
    },
    {
      label: 'Inscriptions en attente',
      value: isLoading ? '\u2026' : String(data?.pendingEnrollments ?? 0),
      note: '\u00e0 valider',
      href: '/inscriptions',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {kpis.map((kpi) => (
        <Link
          key={kpi.label}
          href={kpi.href}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <p className="text-sm text-gray-500">{kpi.label}</p>
          <p className={`mt-1 text-3xl font-bold ${isLoading ? 'text-gray-300' : 'text-gray-900'}`}>
            {kpi.value}
          </p>
          <p className="mt-1 text-xs text-gray-400">{kpi.note}</p>
        </Link>
      ))}
    </div>
  )
}
