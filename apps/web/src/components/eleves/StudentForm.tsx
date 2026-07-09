'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateStudent } from '@/hooks/useStudents'
import type { StudentFormData } from '@/types/student'

interface StudentFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

interface FormErrors {
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  gender?: string
}

export function StudentForm({ onSuccess, onCancel }: StudentFormProps) {
  const { mutate: createStudent, isPending, error } = useCreateStudent()

  const [form, setForm] = useState<StudentFormData>({
    firstName: '',
    lastName: '',
    firstNameAr: '',
    lastNameAr: '',
    dateOfBirth: '',
    gender: 'M',
    classId: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})

  function validate(): boolean {
    const next: FormErrors = {}
    if (!form.firstName.trim()) next.firstName = 'Le prénom est requis'
    if (!form.lastName.trim()) next.lastName = 'Le nom est requis'
    if (!form.dateOfBirth) next.dateOfBirth = 'La date de naissance est requise'
    if (!form.gender) next.gender = 'Le genre est requis'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    createStudent(
      {
        ...form,
        firstNameAr: form.firstNameAr || undefined,
        lastNameAr: form.lastNameAr || undefined,
        classId: form.classId || undefined,
        parentName: form.parentName || undefined,
        parentPhone: form.parentPhone || undefined,
        parentEmail: form.parentEmail || undefined,
      },
      { onSuccess }
    )
  }

  function field(key: keyof StudentFormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="firstName">Prénom *</Label>
          <Input id="firstName" value={form.firstName} onChange={field('firstName')} placeholder="Yassine" />
          {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName">Nom *</Label>
          <Input id="lastName" value={form.lastName} onChange={field('lastName')} placeholder="Alaoui" />
          {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="firstNameAr">Prénom (arabe)</Label>
          <Input id="firstNameAr" value={form.firstNameAr} onChange={field('firstNameAr')} dir="rtl" placeholder="ياسين" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastNameAr">Nom (arabe)</Label>
          <Input id="lastNameAr" value={form.lastNameAr} onChange={field('lastNameAr')} dir="rtl" placeholder="علاوي" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="dateOfBirth">Date de naissance *</Label>
          <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={field('dateOfBirth')} />
          {errors.dateOfBirth && <p className="text-xs text-red-500">{errors.dateOfBirth}</p>}
        </div>
        <div className="space-y-1">
          <Label>Genre *</Label>
          <Select value={form.gender} onValueChange={(v) => setForm((p) => ({ ...p, gender: v as 'M' | 'F' }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculin</SelectItem>
              <SelectItem value="F">Féminin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="parentName">Nom du parent / tuteur</Label>
        <Input id="parentName" value={form.parentName} onChange={field('parentName')} placeholder="Mohammed Alaoui" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="parentPhone">Téléphone</Label>
          <Input id="parentPhone" value={form.parentPhone} onChange={field('parentPhone')} placeholder="0600000000" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="parentEmail">Email</Label>
          <Input id="parentEmail" type="email" value={form.parentEmail} onChange={field('parentEmail')} placeholder="parent@example.ma" />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error.message}</p>}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
