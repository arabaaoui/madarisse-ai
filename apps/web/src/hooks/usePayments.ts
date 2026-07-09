import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { StudentPaymentState, PaymentFormData, RecoveryReport } from '@/types/payment'

export function useStudentPayments(studentId: string | null) {
  return useQuery<StudentPaymentState>({
    queryKey: ['payments', studentId],
    queryFn: async () => {
      const res = await fetch(`/api/payments?student_id=${studentId}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    enabled: !!studentId,
  })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw Object.assign(new Error(err.error ?? 'Erreur'), err)
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['payments', variables.studentId] })
    },
  })
}

export function useCancelTransaction(studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await fetch(`/api/payments/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', studentId] })
    },
  })
}

export function useRecoveryReport(classId?: string, month?: string) {
  return useQuery<RecoveryReport>({
    queryKey: ['recovery', classId, month],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (classId) params.set('class_id', classId)
      if (month) params.set('month', month)
      const res = await fetch(`/api/reporting/recovery?${params}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
  })
}
