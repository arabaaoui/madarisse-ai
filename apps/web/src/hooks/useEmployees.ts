import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Employee, SalaryPayment } from '@/types/employee'

export function useEmployees(activeOnly?: boolean) {
  return useQuery<Employee[]>({
    queryKey: ['employees', activeOnly],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (activeOnly !== undefined) params.set('active', String(activeOnly))
      const res = await fetch(`/api/employees?${params}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
  })
}

export function useEmployee(id: string | null) {
  return useQuery<Employee>({
    queryKey: ['employee', id],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${id}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    enabled: !!id,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      const res = await fetch('/api/employees', {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw Object.assign(new Error(err.error ?? 'Erreur'), err)
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employee', id] })
    },
  })
}

export function useSalaryPayments(employeeId: string | null) {
  return useQuery<SalaryPayment[]>({
    queryKey: ['salary-payments', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${employeeId}/salary`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    enabled: !!employeeId,
  })
}

export function useRecordSalary(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { month: string; amount: number; paid_at?: string; notes?: string }) => {
      const res = await fetch(`/api/employees/${employeeId}/salary`, {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salary-payments', employeeId] })
    },
  })
}
