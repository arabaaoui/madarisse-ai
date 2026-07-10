'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useClassPresence, useSavePresence } from '@/hooks/usePresences'
import { STATUS_LABEL, STATUS_COLOR } from '@/types/presence'
import type { AttendanceStatus, Period } from '@/types/presence'

interface ClassOption {
  id: string
  name: string
}

const PERIOD_LABEL: Record<Period, string> = {
  full_day: 'Journée entière',
  morning: 'Matin',
  afternoon: 'Après-midi',
}

export function ClassAttendanceSheet() {
  const today = new Date().toISOString().slice(0, 10)

  const [classes, setClasses] = useState<ClassOption[]>([])
  const [classId, setClassId] = useState<string>('')
  const [date, setDate] = useState<string>(today)
  const [period, setPeriod] = useState<Period>('full_day')
  const [localStatus, setLocalStatus] = useState<Record<string, AttendanceStatus>>({})
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((data: ClassOption[]) => {
        setClasses(data)
        if (data.length > 0 && !classId) setClassId(data[0].id)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data, isLoading, isError } = useClassPresence(classId || null, date, period)
  const saveMutation = useSavePresence()

  // Sync remote data into local state when it loads
  useEffect(() => {
    if (!data) return
    const statusInit: Record<string, AttendanceStatus> = {}
    const notesInit: Record<string, string> = {}
    for (const r of data.records) {
      statusInit[r.studentId] = r.status
      notesInit[r.studentId] = r.notes ?? ''
    }
    setLocalStatus(statusInit)
    setLocalNotes(notesInit)
  }, [data])

  const records = data?.records ?? []

  const counts = records.reduce(
    (acc, r) => {
      const s = localStatus[r.studentId] ?? r.status
      acc[s] = (acc[s] ?? 0) + 1
      return acc
    },
    {} as Record<AttendanceStatus, number>,
  )

  function handleStatusClick(studentId: string, status: AttendanceStatus) {
    setLocalStatus((prev) => ({ ...prev, [studentId]: status }))
  }

  async function handleSave() {
    if (!classId || !date) return
    const payload = records.map((r) => ({
      student_id: r.studentId,
      status: localStatus[r.studentId] ?? r.status,
      notes: localNotes[r.studentId] || undefined,
    }))
    saveMutation.mutate(
      { class_id: classId, date, period, records: payload },
      {
        onSuccess: (res) => toast.success(`${res.saved} présences enregistrées`),
        onError: (err) => toast.error(err.message),
      },
    )
  }

  const allStatuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']

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
          <label className="text-xs font-medium text-gray-500">Date</label>
          <input
            type="date"
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Période</label>
          <select
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
          >
            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
              <option key={p} value={p}>{PERIOD_LABEL[p]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats summary */}
      {records.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {allStatuses.map((s) => (
            <span key={s} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[s]}`}>
              {STATUS_LABEL[s]}&nbsp;<strong>{counts[s] ?? 0}</strong>
            </span>
          ))}
        </div>
      )}

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
        ) : records.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">Aucun élève inscrit dans cette classe.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">Élève</th>
                {allStatuses.map((s) => (
                  <th key={s} className="px-3 py-3 font-medium text-center">{STATUS_LABEL[s]}</th>
                ))}
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => {
                const current = localStatus[r.studentId] ?? r.status
                return (
                  <tr key={r.studentId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.studentName}</td>
                    {allStatuses.map((s) => (
                      <td key={s} className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleStatusClick(r.studentId, s)}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all
                            ${current === s
                              ? `${STATUS_COLOR[s]} border-current font-bold`
                              : 'border-gray-200 text-gray-300 hover:border-gray-400'
                            }`}
                          aria-label={STATUS_LABEL[s]}
                        >
                          {current === s ? '●' : '○'}
                        </button>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <Input
                        className="h-7 text-xs w-40"
                        placeholder="Note…"
                        value={localNotes[r.studentId] ?? ''}
                        onChange={(e) =>
                          setLocalNotes((prev) => ({ ...prev, [r.studentId]: e.target.value }))
                        }
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {records.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !classId}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      )}
    </div>
  )
}
