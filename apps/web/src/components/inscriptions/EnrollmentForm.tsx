'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StudentSearch } from '@/components/eleves/StudentSearch'
import { useCreateEnrollment, useClasses, useAcademicYears } from '@/hooks/useEnrollments'
import type { EnrollmentFormData } from '@/types/enrollment'

interface EnrollmentFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

interface FormState {
  studentId: string
  studentName: string
  classId: string
  academicYearId: string
  enrollmentFee: string
  tuitionFee: string
}

interface FormErrors {
  studentId?: string
  classId?: string
  academicYearId?: string
  enrollmentFee?: string
  tuitionFee?: string
}

export function EnrollmentForm({ onSuccess, onCancel }: EnrollmentFormProps) {
  const [form, setForm] = useState<FormState>({
    studentId: '',
    studentName: '',
    classId: '',
    academicYearId: '',
    enrollmentFee: '',
    tuitionFee: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [duplicate, setDuplicate] = useState<string | null>(null)

  const { data: classes = [], isLoading: classesLoading } = useClasses()
  const { data: years = [], isLoading: yearsLoading } = useAcademicYears()
  const mutation = useCreateEnrollment()

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.studentId) e.studentId = 'Élève requis'
    if (!form.classId) e.classId = 'Classe requise'
    if (!form.academicYearId) e.academicYearId = 'Année scolaire requise'
    if (!form.enrollmentFee || isNaN(parseFloat(form.enrollmentFee)))
      e.enrollmentFee = "Frais d\u2019inscription requis (nombre)"
    if (!form.tuitionFee || isNaN(parseFloat(form.tuitionFee)))
      e.tuitionFee = 'Frais de scolarité requis (nombre)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setDuplicate(null)
    if (!validate()) return

    const data: EnrollmentFormData = {
      studentId: form.studentId,
      classId: form.classId,
      academicYearId: form.academicYearId,
      enrollmentFee: parseFloat(form.enrollmentFee),
      tuitionFee: parseFloat(form.tuitionFee),
    }

    mutation.mutate(data, {
      onSuccess: () => onSuccess?.(),
      onError: (err) => {
        if (err.message.includes('déjà inscrit')) setDuplicate(err.message)
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Recherche élève */}
      <div className="flex flex-col gap-1.5">
        <Label>Élève *</Label>
        {form.studentId ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{form.studentName}</span>
            <button
              type="button"
              className="text-xs text-muted-foreground underline"
              onClick={() => setForm((f) => ({ ...f, studentId: '', studentName: '' }))}
            >
              Changer
            </button>
          </div>
        ) : (
          <StudentSearch
            onSearch={() => {}}
            className="w-full"
          />
        )}
        {/* Workaround: l'élève est sélectionné via StudentSearch interne — on passe par un state hidden */}
        {/* StudentSearch navigue vers /eleves/{id} — pour le form, on utilise un select différent */}
        <StudentSelectInline
          value={form.studentId}
          onChange={(id, name) => setForm((f) => ({ ...f, studentId: id, studentName: name }))}
        />
        {errors.studentId && <p className="text-xs text-destructive">{errors.studentId}</p>}
      </div>

      {/* Classe */}
      <div className="flex flex-col gap-1.5">
        <Label>Classe *</Label>
        <select
          value={form.classId}
          onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
          disabled={classesLoading}
          className="h-8 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        >
          <option value="">— Sélectionner une classe —</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {errors.classId && <p className="text-xs text-destructive">{errors.classId}</p>}
      </div>

      {/* Année scolaire */}
      <div className="flex flex-col gap-1.5">
        <Label>Année scolaire *</Label>
        <select
          value={form.academicYearId}
          onChange={(e) => setForm((f) => ({ ...f, academicYearId: e.target.value }))}
          disabled={yearsLoading}
          className="h-8 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        >
          <option value="">— Sélectionner une année —</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>{y.year}</option>
          ))}
        </select>
        {errors.academicYearId && <p className="text-xs text-destructive">{errors.academicYearId}</p>}
      </div>

      {/* Frais */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Frais inscription (MAD) *</Label>
          <Input
            type="number"
            min="0"
            step="50"
            value={form.enrollmentFee}
            onChange={(e) => setForm((f) => ({ ...f, enrollmentFee: e.target.value }))}
            placeholder="1500"
          />
          {errors.enrollmentFee && <p className="text-xs text-destructive">{errors.enrollmentFee}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Scolarité/mois (MAD) *</Label>
          <Input
            type="number"
            min="0"
            step="50"
            value={form.tuitionFee}
            onChange={(e) => setForm((f) => ({ ...f, tuitionFee: e.target.value }))}
            placeholder="800"
          />
          {errors.tuitionFee && <p className="text-xs text-destructive">{errors.tuitionFee}</p>}
        </div>
      </div>

      {form.enrollmentFee && form.tuitionFee && (
        <p className="text-xs text-muted-foreground">
          Total estimé : {(parseFloat(form.enrollmentFee || '0') + parseFloat(form.tuitionFee || '0') * 10).toLocaleString('fr-MA')} MAD (frais + 10 mensualités)
        </p>
      )}

      {duplicate && (
        <p className="text-sm text-destructive bg-destructive/10 rounded p-2">{duplicate}</p>
      )}

      {mutation.isError && !duplicate && (
        <p className="text-sm text-destructive">{mutation.error?.message}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Enregistrement\u2026' : "Cr\u00e9er l\u2019inscription"}
        </Button>
      </div>
    </form>
  )
}

// Sélecteur d'élève inline (recherche texte + résultats en liste)
function StudentSelectInline({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; name: string }[]>([])
  const [open, setOpen] = useState(false)

  async function search(q: string) {
    setQuery(q)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    const res = await fetch(`/api/students/search?q=${encodeURIComponent(q)}`)
    if (!res.ok) return
    const data = await res.json()
    setResults(data.map((r: any) => ({ id: r.id, name: r.name })))
    setOpen(data.length > 0)
  }

  if (value) return null

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Rechercher un élève…"
        className="w-full"
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
              onClick={() => { onChange(r.id, r.name); setOpen(false); setQuery('') }}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
