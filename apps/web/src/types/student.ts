export type StudentStatus = 'pending' | 'active' | 'inactive'
export type EnrollmentStatus = 'pending' | 'confirmed' | 'cancelled'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'

export const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  pending: 'À inscrire',
  active: 'Inscrit',
  inactive: 'Inactif',
}

export interface StudentListItem {
  id: string
  firstName: string
  lastName: string
  firstNameAr?: string
  lastNameAr?: string
  annualStatus: StudentStatus
  className?: string
  classId?: string
  phone?: string
  email?: string
}

export interface StudentSearchResult {
  id: string
  name: string
  className?: string
  annualStatus: StudentStatus
}

export interface StudentFormData {
  firstName: string
  lastName: string
  firstNameAr?: string
  lastNameAr?: string
  dateOfBirth: string
  gender: 'M' | 'F'
  classId?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
}

export interface StudentPatchData {
  firstName?: string
  lastName?: string
  firstNameAr?: string
  lastNameAr?: string
  dateOfBirth?: string
  gender?: 'M' | 'F'
  classId?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
}

export interface Student360 {
  id: string
  firstName: string
  lastName: string
  firstNameAr?: string
  lastNameAr?: string
  dateOfBirth: string
  gender: 'M' | 'F'
  annualStatus: StudentStatus
  photo?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
  class?: {
    id: string
    name: string
    nameAr?: string
  }
  enrollment?: {
    id: string
    status: EnrollmentStatus
    enrollmentFee: number
    tuitionFee: number
    academicYear: string
  }
  paymentSummary?: {
    totalDue: number
    totalPaid: number
    totalOverdue: number
    overdueCount: number
    nextDueDate?: string
  }
}
