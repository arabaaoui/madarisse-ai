import { EmployeesClient } from '@/components/employees/EmployeesClient'

export const metadata = { title: 'Employés — Madarisse' }

export default function EmployeesPage() {
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Gestion des employés</h1>
      <EmployeesClient />
    </div>
  )
}
