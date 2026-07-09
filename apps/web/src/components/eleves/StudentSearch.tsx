'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useStudentSearch } from '@/hooks/useStudent'
import { STUDENT_STATUS_LABEL } from '@/types/student'

interface StudentSearchProps {
  onSearch?: (value: string) => void
  className?: string
}

export function StudentSearch({ onSearch, className }: StudentSearchProps) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(input), 300)
    return () => clearTimeout(t)
  }, [input])

  useEffect(() => {
    onSearch?.(input)
  }, [input, onSearch])

  const { data: results = [] } = useStudentSearch(debouncedQuery)

  useEffect(() => {
    setOpen(debouncedQuery.length >= 2 && results.length > 0)
  }, [debouncedQuery, results])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Rechercher un élève (FR/AR)…"
        className="w-full"
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-auto">
          {results.map((r) => (
            <button
              key={r.id}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2 text-sm"
              onClick={() => {
                setOpen(false)
                setInput('')
                router.push(`/eleves/${r.id}`)
              }}
            >
              <span className="font-medium">{r.name}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {r.className && <span>{r.className}</span>}
                <Badge variant="secondary" className="text-xs">
                  {STUDENT_STATUS_LABEL[r.annualStatus]}
                </Badge>
              </div>
            </button>
          ))}
          {debouncedQuery.length >= 2 && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Aucun résultat — vérifiez l&apos;orthographe ou créez un nouvel élève.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
