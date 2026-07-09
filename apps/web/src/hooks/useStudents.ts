'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { StudentListItem, StudentFormData } from '@/types/student'

interface UseStudentsOptions {
  search?: string
  classId?: string
  status?: string
  limit?: number
}

export function useStudents(options: UseStudentsOptions = {}) {
  const params = new URLSearchParams()
  if (options.search && options.search.length >= 2) params.set('search', options.search)
  if (options.classId) params.set('class_id', options.classId)
  if (options.status) params.set('status', options.status)
  if (options.limit) params.set('limit', String(options.limit))

  return useQuery<{ data: StudentListItem[]; hasMore: boolean; nextCursor: string | null }>({
    queryKey: ['students', options],
    queryFn: async () => {
      const res = await fetch(`/api/students?${params}`)
      if (!res.ok) throw new Error('Erreur chargement élèves')
      return res.json()
    },
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()

  return useMutation<StudentListItem, Error, StudentFormData>({
    mutationFn: async (data) => {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message ?? 'Erreur création élève')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}
