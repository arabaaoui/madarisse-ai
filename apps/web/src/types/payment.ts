export type PaymentMethod = 'cash' | 'transfer' | 'check'
export type PaymentItemStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  transfer: 'Virement',
  check: 'Chèque',
}

export const PAYMENT_STATUS_LABEL: Record<PaymentItemStatus, string> = {
  pending: 'À payer',
  partial: 'Partiel',
  paid: 'Payé',
  overdue: 'En retard',
  cancelled: 'Annulé',
}

export interface PaymentTransaction {
  id: string
  amount: number
  paymentMethod: PaymentMethod
  transactionDate: string
  notes?: string
}

export interface PaymentItem {
  id: string
  itemType: 'enrollment_fee' | 'schedule'
  amount: number
  paidAmount: number
  remainingAmount: number
  status: PaymentItemStatus
  dueDate: string | null
  transactions: PaymentTransaction[]
  daysOverdue?: number
}

export interface StudentPaymentState {
  studentId: string
  studentName: string
  items: PaymentItem[]
  summary: {
    totalDue: number
    totalPaid: number
    totalOverdue: number
    overdueCount: number
  }
}

export interface PaymentFormData {
  studentId: string
  paymentItemId: string
  amount: number
  paymentMethod: PaymentMethod
  transactionDate: string
  notes?: string
}

export interface RecoveryReport {
  classId?: string
  className?: string
  month?: string
  totalDue: number
  totalPaid: number
  rate: number
  overdueCount: number
  overdueStudents: { studentId: string; studentName: string; amountDue: number }[]
}
