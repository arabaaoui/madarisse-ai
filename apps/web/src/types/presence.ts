export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
export type Period = 'full_day' | 'morning' | 'afternoon'

export interface Presence {
  id: string
  studentId: string
  classId: string | null
  date: string
  period: Period
  status: AttendanceStatus
  notes: string | null
}

export interface AttendanceRecord {
  studentId: string
  studentName: string
  status: AttendanceStatus
  notes?: string
}

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Présent',
  absent: 'Absent',
  late: 'En retard',
  excused: 'Excusé',
}

export const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-yellow-100 text-yellow-700',
  excused: 'bg-blue-100 text-blue-700',
}
