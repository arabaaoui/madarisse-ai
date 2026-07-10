'use client'

import { useQuery } from '@tanstack/react-query'

interface MonthData {
  month: string
  revenue: number
  expenses: number
  net: number
}

interface MonthlyResponse {
  months: MonthData[]
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aoû',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
}

function shortMonth(yyyyMM: string): string {
  const parts = yyyyMM.split('-')
  return MONTH_LABELS[parts[1]] ?? parts[1]
}

function formatMAD(n: number): string {
  if (Math.abs(n) >= 1000) {
    return `${Math.round(n / 1000)}k`
  }
  return String(Math.round(n))
}

function formatFull(n: number): string {
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n)
}

export function MonthlyRevenueChart() {
  const { data, isLoading, error } = useQuery<MonthlyResponse>({
    queryKey: ['monthly-revenue'],
    queryFn: async () => {
      const res = await fetch('/api/reporting/monthly?months=12')
      if (!res.ok) throw new Error('Erreur chargement données mensuelles')
      return res.json()
    },
    staleTime: 5 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-gray-200 bg-white">
        <p className="text-sm text-gray-400">Chargement…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-gray-200 bg-white">
        <p className="text-sm text-red-500">Erreur de chargement</p>
      </div>
    )
  }

  const months = data.months
  const maxValue = Math.max(...months.flatMap((m) => [m.revenue, m.expenses]), 1)
  // Round up to nearest nice number for Y-axis
  const yMax = Math.ceil(maxValue / 5000) * 5000 || 10000
  const ySteps = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(yMax * f))

  const CHART_HEIGHT = 200 // px for bars area

  function barHeight(value: number): number {
    return Math.round((value / yMax) * CHART_HEIGHT)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-800">Revenus &amp; Dépenses — 12 derniers mois</h2>

      <div className="flex gap-3 mb-4">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-500" /> Revenus
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-400" /> Dépenses
        </span>
      </div>

      {/* Chart area */}
      <div className="flex" style={{ height: `${CHART_HEIGHT + 60}px` }}>
        {/* Y-axis labels */}
        <div className="flex flex-col-reverse justify-between pr-2" style={{ height: `${CHART_HEIGHT}px`, minWidth: '36px' }}>
          {ySteps.map((v) => (
            <span key={v} className="text-[10px] text-gray-400 leading-none">
              {formatMAD(v)}
            </span>
          ))}
        </div>

        {/* Bars + labels */}
        <div className="flex flex-1 items-end gap-1 border-l border-b border-gray-200 relative" style={{ height: `${CHART_HEIGHT}px` }}>
          {/* Horizontal grid lines */}
          {ySteps.slice(1).map((v) => (
            <div
              key={v}
              className="absolute left-0 right-0 border-t border-gray-100"
              style={{ bottom: `${(v / yMax) * CHART_HEIGHT}px` }}
            />
          ))}

          {months.map((m) => {
            const revH = barHeight(m.revenue)
            const expH = barHeight(m.expenses)
            const netPositive = m.net >= 0
            return (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-0">
                {/* Bars */}
                <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: `${CHART_HEIGHT}px` }}>
                  <div
                    className="bg-green-500 rounded-t-sm hover:opacity-80 transition-opacity cursor-default"
                    style={{ height: `${revH}px`, minWidth: '6px', flex: 1 }}
                    title={`Revenus: ${formatFull(m.revenue)}`}
                  />
                  <div
                    className="bg-red-400 rounded-t-sm hover:opacity-80 transition-opacity cursor-default"
                    style={{ height: `${expH}px`, minWidth: '6px', flex: 1 }}
                    title={`Dépenses: ${formatFull(m.expenses)}`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* X-axis labels + net amounts */}
      <div className="flex pl-[44px] mt-1">
        {months.map((m) => {
          const netPositive = m.net >= 0
          return (
            <div key={m.month} className="flex flex-1 flex-col items-center">
              <span className="text-[10px] text-gray-500 leading-tight">{shortMonth(m.month)}</span>
              <span className={`text-[9px] leading-tight font-medium ${netPositive ? 'text-green-600' : 'text-red-500'}`}>
                {formatMAD(m.net)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
