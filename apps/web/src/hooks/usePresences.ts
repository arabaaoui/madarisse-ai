import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AttendanceStatus, Period } from '@/types/presence'

export interface AttendanceSheetRecord {
  studentId: string
  studentName: string
  presenceId: string | null
  status: AttendanceStatus
  notes: string | null
}

export interface AttendanceSheet {
  date: string
  classId: string
  period: Period
  records: AttendanceSheetRecord[]
}

export interface StudentStatRow {
  studentId: string
  studentName: string
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  rate: number
}

export interface PresenceStatsResult {
  students: StudentStatRow[]
}

export function useClassPresence(classId: string | null, date: string, period: Period = 'full_day') {
  return useQuery<AttendanceSheet>({
    queryKey: ['presences', classId, date, period],
    queryFn: async () => {
      const params = new URLSearchParams({ class_id: classId!, date, period })
      const res = await fetch(`/api/presences?${params}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    enabled: !!classId && !!date,
  })
}

export function useSavePresence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      class_id: string
      date: string
      period: Period
      records: { student_id: string; status: AttendanceStatus; notes?: string }[]
    }) => {
      const res = await fetch('/api/presences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erreur lors de la sauvegarde')
      }
      return res.json() as Promise<{ saved: number }>
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['presences', variables.class_id, variables.date, variables.period] })
    },
  })
}

export function usePresenceStats(classId: string | null, startDate: string, endDate: string) {
  return useQuery<PresenceStatsResult>({
    queryKey: ['presences-stats', classId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        class_id: classId!,
        start_date: startDate,
        end_date: endDate,
      })
      const res = await fetch(`/api/presences/stats?${params}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    enabled: !!classId && !!startDate && !!endDate,
  })
}
