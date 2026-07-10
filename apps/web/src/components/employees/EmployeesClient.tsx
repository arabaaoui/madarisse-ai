'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Wallet, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEmployees, useUpdateEmployee } from '@/hooks/useEmployees'
import { EmployeeForm } from './EmployeeForm'
import { SalaryPanel } from './SalaryPanel'
import type { Employee } from '@/types/employee'
import { ROLE_LABEL } from '@/types/employee'

function ToggleActiveButton({ employee }: { employee: Employee }) {
  const updateEmployee = useUpdateEmployee(employee.id)

  function handleToggle() {
    updateEmployee.mutate(
      { isActive: !employee.isActive },
      {
        onSuccess: () =>
          toast.success(employee.isActive ? 'Employé désactivé' : 'Employé activé'),
        onError: (err) => toast.error(err.message),
      },
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title={employee.isActive ? 'Désactiver' : 'Activer'}
      onClick={handleToggle}
      disabled={updateEmployee.isPending}
    >
      {employee.isActive ? (
        <UserX className="h-4 w-4 text-red-500" />
      ) : (
        <UserCheck className="h-4 w-4 text-green-600" />
      )}
    </Button>
  )
}

export function EmployeesClient() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [salaryEmployee, setSalaryEmployee] = useState<Employee | null>(null)

  const { data: employees = [], isLoading } = useEmployees()

  const filtered = employees.filter((emp) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      emp.firstName.toLowerCase().includes(q) ||
      emp.lastName.toLowerCase().includes(q) ||
      (emp.email?.toLowerCase().includes(q) ?? false)

    const matchesRole = roleFilter === 'all' || emp.role === roleFilter
    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && emp.isActive) ||
      (activeFilter === 'inactive' && !emp.isActive)

    return matchesSearch && matchesRole && matchesActive
  })

  // Stats
  const total = employees.length
  const actifs = employees.filter((e) => e.isActive).length
  const byRole = Object.keys(ROLE_LABEL).map((role) => ({
    role,
    label: ROLE_LABEL[role],
    count: employees.filter((e) => e.role === role).length,
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ressources humaines</h1>
        <EmployeeForm
          trigger={
            <Button>
              + Ajouter un employé
            </Button>
          }
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Actifs</p>
          <p className="text-2xl font-bold text-green-600">{actifs}</p>
        </div>
        {byRole.map(({ role, label, count }) => (
          <div key={role} className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold">{count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous les rôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            {Object.entries(ROLE_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun employé trouvé.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nom</th>
                <th className="text-left px-4 py-3 font-medium">Rôle</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Téléphone</th>
                <th className="text-left px-4 py-3 font-medium">Embauché le</th>
                <th className="text-right px-4 py-3 font-medium">Salaire base</th>
                <th className="text-center px-4 py-3 font-medium">Statut</th>
                <th className="text-center px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {emp.lastName} {emp.firstName}
                    {(emp.lastNameAr || emp.firstNameAr) && (
                      <span className="block text-xs text-muted-foreground" dir="rtl">
                        {emp.lastNameAr} {emp.firstNameAr}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{ROLE_LABEL[emp.role] ?? emp.role}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.email ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {emp.hireDate
                      ? new Date(emp.hireDate).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {emp.salaryBase ? `${emp.salaryBase.toLocaleString('fr-FR')} MAD` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={emp.isActive ? 'default' : 'secondary'}>
                      {emp.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <EmployeeForm
                        employee={emp}
                        trigger={
                          <Button variant="ghost" size="icon-sm" title="Modifier">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Salaires"
                        onClick={() => setSalaryEmployee(emp)}
                      >
                        <Wallet className="h-4 w-4" />
                      </Button>
                      <ToggleActiveButton employee={emp} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Salary panel */}
      {salaryEmployee && (
        <SalaryPanel
          employee={salaryEmployee}
          onClose={() => setSalaryEmployee(null)}
        />
      )}
    </div>
  )
}
