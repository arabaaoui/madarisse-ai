'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { EnrollmentListItem, EnrollmentFormData, ClassOption, AcademicYearOption } from '@/types/enrollment'

interface UseEnrollmentsOptions {
  status?: string
  classId?: string
  academicYearId?: string
  limit?: number
}

export function useEnrollments(options: UseEnrollmentsOptions = {}) {
  const params = new URLSearchParams()
  if (options.status) params.set('status', options.status)
  if (options.classId) params.set('class_id', options.classId)
  if (options.academicYearId) params.set('academic_year_id', options.academicYearId)
  if (options.limit) params.set('limit', String(options.limit))

  return useQuery<{ data: EnrollmentListItem[]; hasMore: boolean }>({
    queryKey: ['enrollments', options],
    queryFn: async () => {
      const res = await fetch(`/api/enrollments?${params}`)
      if (!res.ok) throw new Error('Erreur chargement inscriptions')
      return res.json()
    },
  })
}

export function useCreateEnrollment() {
  const queryClient = useQueryClient()
  return useMutation<EnrollmentListItem, Error, EnrollmentFormData>({
    mutationFn: async (data) => {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erreur création inscription')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
  })
}

export function useValidateBatch() {
  const queryClient = useQueryClient()
  return useMutation<{ validated: number; skipped: number; errors: any[] }, Error, string[]>({
    mutationFn: async (ids) => {
      const res = await fetch('/api/enrollments/validate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erreur validation en masse')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
  })
}

export function useValidateEnrollment() {
  const queryClient = useQueryClient()
  return useMutation<{ id: string; status: string }, Error, { id: string; status: 'confirmed' | 'cancelled' }>({
    mutationFn: async ({ id, status }) => {
      const res = await fetch(`/api/enrollments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erreur mise à jour')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    },
  })
}

export function useClasses() {
  return useQuery<ClassOption[]>({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await fetch('/api/classes')
      if (!res.ok) throw new Error('Erreur chargement classes')
      return res.json()
    },
    staleTime: 5 * 60_000,
  })
}

export function useAcademicYears() {
  return useQuery<AcademicYearOption[]>({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await fetch('/api/academic-years')
      if (!res.ok) throw new Error('Erreur chargement années scolaires')
      return res.json()
    },
    staleTime: 5 * 60_000,
  })
}
