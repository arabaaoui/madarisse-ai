'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateEmployee, useUpdateEmployee } from '@/hooks/useEmployees'
import type { Employee } from '@/types/employee'
import { ROLE_LABEL } from '@/types/employee'

interface EmployeeFormProps {
  employee?: Employee
  trigger: React.ReactNode
}

interface FormState {
  firstName: string
  lastName: string
  firstNameAr: string
  lastNameAr: string
  role: string
  email: string
  phone: string
  hireDate: string
  salaryBase: string
}

export function EmployeeForm({ employee, trigger }: EmployeeFormProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>({
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    firstNameAr: employee?.firstNameAr ?? '',
    lastNameAr: employee?.lastNameAr ?? '',
    role: employee?.role ?? 'teacher',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    hireDate: employee?.hireDate ?? '',
    salaryBase: employee?.salaryBase != null ? String(employee.salaryBase) : '',
  })

  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee(employee?.id ?? '')

  const isPending = createEmployee.isPending || updateEmployee.isPending

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim() || !form.role) {
      toast.error('Prénom, Nom et Rôle sont requis')
      return
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      firstNameAr: form.firstNameAr.trim() || undefined,
      lastNameAr: form.lastNameAr.trim() || undefined,
      role: form.role,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      hireDate: form.hireDate || undefined,
      salaryBase: form.salaryBase ? Number(form.salaryBase) : 0,
    }

    if (employee) {
      updateEmployee.mutate(payload, {
        onSuccess: () => {
          toast.success('Employé mis à jour')
          setOpen(false)
        },
        onError: (err) => toast.error(err.message),
      })
    } else {
      createEmployee.mutate(payload, {
        onSuccess: () => {
          toast.success('Employé ajouté')
          setOpen(false)
          setForm({ firstName: '', lastName: '', firstNameAr: '', lastNameAr: '', role: 'teacher', email: '', phone: '', hireDate: '', salaryBase: '' })
        },
        onError: (err) => toast.error(err.message),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{employee ? 'Modifier l\'employé' : 'Ajouter un employé'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input id="firstName" value={form.firstName} onChange={field('firstName')} placeholder="Ahmed" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Nom *</Label>
              <Input id="lastName" value={form.lastName} onChange={field('lastName')} placeholder="Benali" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="firstNameAr">Prénom (arabe)</Label>
              <Input id="firstNameAr" value={form.firstNameAr} onChange={field('firstNameAr')} dir="rtl" placeholder="أحمد" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastNameAr">Nom (arabe)</Label>
              <Input id="lastNameAr" value={form.lastNameAr} onChange={field('lastNameAr')} dir="rtl" placeholder="بنعلي" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Rôle *</Label>
            <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v ?? p.role }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un rôle" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={field('email')} placeholder="ahmed@example.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" value={form.phone} onChange={field('phone')} placeholder="0600000000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="hireDate">Date d&apos;embauche</Label>
              <Input id="hireDate" type="date" value={form.hireDate} onChange={field('hireDate')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="salaryBase">Salaire de base (MAD)</Label>
              <Input id="salaryBase" type="number" min="0" step="0.01" value={form.salaryBase} onChange={field('salaryBase')} placeholder="3000" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
