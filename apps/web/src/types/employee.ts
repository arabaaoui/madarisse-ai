export interface Employee {
  id: string
  tenantId: string
  userId: string | null
  firstName: string
  lastName: string
  firstNameAr: string | null
  lastNameAr: string | null
  role: 'teacher' | 'admin' | 'support' | string
  email: string | null
  phone: string | null
  hireDate: string | null
  salaryBase: number
  isActive: boolean
  createdAt: string
}

export interface SalaryPayment {
  id: string
  employeeId: string
  month: string
  amount: number
  paidAt: string | null
  notes: string | null
}

export const ROLE_LABEL: Record<string, string> = {
  teacher: 'Enseignant',
  admin: 'Administration',
  support: 'Personnel de support',
}
