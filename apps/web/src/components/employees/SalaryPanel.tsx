'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSalaryPayments, useRecordSalary } from '@/hooks/useEmployees'
import type { Employee } from '@/types/employee'
import { ROLE_LABEL } from '@/types/employee'

interface SalaryPanelProps {
  employee: Employee
  onClose: () => void
}

export function SalaryPanel({ employee, onClose }: SalaryPanelProps) {
  const { data: payments = [], isLoading } = useSalaryPayments(employee.id)
  const recordSalary = useRecordSalary(employee.id)

  const [form, setForm] = useState({
    month: '',
    amount: '',
    paid_at: '',
    notes: '',
  })

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.month || !form.amount) {
      toast.error('Mois et montant sont requis')
      return
    }
    recordSalary.mutate(
      {
        month: form.month,
        amount: Number(form.amount),
        paid_at: form.paid_at || undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Paiement enregistré')
          setForm({ month: '', amount: '', paid_at: '', notes: '' })
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  // Stats
  const currentYear = new Date().getFullYear()
  const paymentsThisYear = payments.filter((p) => p.month.startsWith(String(currentYear)))
  const totalPaidThisYear = paymentsThisYear.reduce((s, p) => s + p.amount, 0)

  // Months due since hire_date to today
  function monthsDue(): number {
    if (!employee.hireDate) return 0
    const hire = new Date(employee.hireDate)
    const now = new Date()
    return (
      (now.getFullYear() - hire.getFullYear()) * 12 +
      (now.getMonth() - hire.getMonth()) +
      1
    )
  }

  const due = monthsDue()
  const paid = payments.length

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-background border-l shadow-xl flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold text-base">
              {employee.firstName} {employee.lastName}
            </h2>
            <p className="text-xs text-muted-foreground">
              {ROLE_LABEL[employee.role] ?? employee.role}
              {employee.salaryBase ? ` — ${employee.salaryBase.toLocaleString('fr-FR')} MAD/mois` : ''}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>✕</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 p-4 border-b">
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-xs text-muted-foreground">Payé cette année</p>
            <p className="font-semibold text-sm">{totalPaidThisYear.toLocaleString('fr-FR')} MAD</p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-xs text-muted-foreground">Mois payés</p>
            <p className="font-semibold text-sm">{paid}</p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-xs text-muted-foreground">Mois dus</p>
            <p className="font-semibold text-sm">{due > 0 ? due : '—'}</p>
          </div>
        </div>

        {/* Payment history */}
        <div className="flex-1 p-4">
          <h3 className="text-sm font-medium mb-3">Historique des paiements</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Mois</th>
                    <th className="text-right px-3 py-2 font-medium">Montant</th>
                    <th className="text-left px-3 py-2 font-medium">Payé le</th>
                    <th className="text-left px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2">{p.month}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.amount.toLocaleString('fr-FR')}</td>
                      <td className="px-3 py-2">{p.paidAt ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{p.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add payment form */}
        <div className="p-4 border-t bg-muted/30">
          <h3 className="text-sm font-medium mb-3">Enregistrer un paiement</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sp-month">Mois *</Label>
                <Input id="sp-month" type="month" value={form.month} onChange={field('month')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sp-amount">Montant (MAD) *</Label>
                <Input id="sp-amount" type="number" min="0" step="0.01" value={form.amount} onChange={field('amount')} placeholder="3000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sp-paid-at">Date de paiement</Label>
                <Input id="sp-paid-at" type="date" value={form.paid_at} onChange={field('paid_at')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sp-notes">Notes</Label>
                <Input id="sp-notes" value={form.notes} onChange={field('notes')} placeholder="Optionnel" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={recordSalary.isPending}>
              {recordSalary.isPending ? 'Enregistrement…' : 'Enregistrer le paiement'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
