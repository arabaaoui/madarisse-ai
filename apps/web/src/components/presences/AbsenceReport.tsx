'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { usePresenceStats } from '@/hooks/usePresences'

interface ClassOption {
  id: string
  name: string
}

function getRateColor(rate: number): string {
  if (rate < 75) return 'text-red-700 font-semibold'
  if (rate < 90) return 'text-yellow-700 font-semibold'
  return 'text-green-700 font-semibold'
}

function getMonthRange(monthStr: string): { startDate: string; endDate: string } {
  const [year, month] = monthStr.split('-').map(Number)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate }
}

export function AbsenceReport() {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [classes, setClasses] = useState<ClassOption[]>([])
  const [classId, setClassId] = useState<string>('')
  const [month, setMonth] = useState<string>(defaultMonth)

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((data: ClassOption[]) => {
        setClasses(data)
        if (data.length > 0) setClassId(data[0].id)
      })
      .catch(() => {})
  }, [])

  const { startDate, endDate } = getMonthRange(month)

  const { data, isLoading, isError } = usePresenceStats(classId || null, startDate, endDate)

  const students = data?.students ?? []

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Classe</label>
          <select
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Mois</label>
          <input
            type="month"
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : isError ? (
          <p className="text-sm text-red-600 p-6">Erreur lors du chargement.</p>
        ) : !classId ? (
          <p className="text-sm text-gray-400 p-6 text-center">Sélectionnez une classe.</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">Aucune donnée pour cette période.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Élève</th>
                <th className="px-3 py-3 font-medium text-center">Présent</th>
                <th className="px-3 py-3 font-medium text-center">Absent</th>
                <th className="px-3 py-3 font-medium text-center">En retard</th>
                <th className="px-3 py-3 font-medium text-center">Excusé</th>
                <th className="px-4 py-3 font-medium text-right">Taux présence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => (
                <tr key={s.studentId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.studentName}</td>
                  <td className="px-3 py-3 text-center text-green-700">{s.presentCount}</td>
                  <td className="px-3 py-3 text-center text-red-700">{s.absentCount}</td>
                  <td className="px-3 py-3 text-center text-yellow-700">{s.lateCount}</td>
                  <td className="px-3 py-3 text-center text-blue-700">{s.excusedCount}</td>
                  <td className={`px-4 py-3 text-right ${getRateColor(s.rate)}`}>
                    {s.rate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {students.length > 0 && (
        <p className="text-xs text-gray-400">
          Légende&nbsp;: <span className="text-red-600 font-medium">&lt;75%</span> critique &middot;{' '}
          <span className="text-yellow-600 font-medium">75–90%</span> attention &middot;{' '}
          <span className="text-green-600 font-medium">&gt;90%</span> bon
        </p>
      )}
    </div>
  )
}
