export type EnrollmentStatus = 'pending' | 'confirmed' | 'cancelled'

export const ENROLLMENT_STATUS_LABEL: Record<EnrollmentStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
}

export interface EnrollmentListItem {
  id: string
  studentId: string
  studentName: string
  className: string
  academicYear: string
  enrollmentFee: number
  tuitionFee: number
  status: EnrollmentStatus
  createdAt: string
}

export interface EnrollmentFormData {
  studentId: string
  classId: string
  academicYearId: string
  enrollmentFee: number
  tuitionFee: number
}

export interface ClassOption {
  id: string
  name: string
  nameAr?: string
}

export interface AcademicYearOption {
  id: string
  year: string
}
