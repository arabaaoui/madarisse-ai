'use client'

import { useQuery } from '@tanstack/react-query'
import type { Student360, StudentSearchResult } from '@/types/student'

export function useStudent(id: string) {
  return useQuery<Student360>({
    queryKey: ['student', id],
    queryFn: async () => {
      const res = await fetch(`/api/students/${id}`)
      if (res.status === 404) throw new Error('Élève introuvable')
      if (!res.ok) throw new Error('Erreur chargement fiche élève')
      return res.json()
    },
    enabled: !!id,
  })
}

export function useStudentSearch(query: string) {
  return useQuery<StudentSearchResult[]>({
    queryKey: ['students', 'search', query],
    queryFn: async () => {
      const res = await fetch(`/api/students/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Erreur recherche')
      return res.json()
    },
    enabled: query.length >= 2,
    staleTime: 10_000,
  })
}
