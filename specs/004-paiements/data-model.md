# Data Model — 004-paiements

## Tables existantes

### `payment_items` (échéancier — déjà utilisée)

| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK |
| student_id | uuid | FK students |
| enrollment_id | uuid | FK enrollments |
| item_type | text | 'enrollment_fee' \| 'schedule' |
| amount | numeric(10,2) | Montant total de l'échéance |
| paid_amount | numeric(10,2) | Cumulé des encaissements |
| remaining_amount | numeric(10,2) | amount - paid_amount |
| status | text | 'pending' \| 'partial' \| 'paid' \| 'overdue' \| 'cancelled' |
| due_date | date | Date d'échéance |

### `accounting_transactions` (encaissements — à utiliser)

| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK |
| student_id | uuid | FK students |
| amount | numeric(10,2) | Montant versé |
| payment_method | text | 'cash' \| 'transfer' \| 'check' |
| transaction_date | date | Date du paiement |
| payment_item_id | uuid | FK payment_items (nullable — imputation) |
| notes | text | nullable |
| created_at | timestamptz | |

## TypeScript Types

```typescript
// apps/web/src/types/payment.ts

export type PaymentMethod = 'cash' | 'transfer' | 'check'
export type PaymentItemStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  transfer: 'Virement',
  check: 'Chèque',
}

export const PAYMENT_STATUS_LABEL: Record<PaymentItemStatus, string> = {
  pending: 'À payer',
  partial: 'Partiel',
  paid: 'Payé',
  overdue: 'En retard',
  cancelled: 'Annulé',
}

export interface PaymentItem {
  id: string
  itemType: 'enrollment_fee' | 'schedule'
  amount: number
  paidAmount: number
  remainingAmount: number
  status: PaymentItemStatus
  dueDate: string | null
  transactions: PaymentTransaction[]
  daysOverdue?: number
}

export interface PaymentTransaction {
  id: string
  amount: number
  paymentMethod: PaymentMethod
  transactionDate: string
  notes?: string
}

export interface StudentPaymentState {
  studentId: string
  studentName: string
  items: PaymentItem[]
  summary: {
    totalDue: number
    totalPaid: number
    totalOverdue: number
    overdueCount: number
  }
}

export interface PaymentFormData {
  studentId: string
  paymentItemId: string
  amount: number
  paymentMethod: PaymentMethod
  transactionDate: string
  notes?: string
}

export interface RecoveryReport {
  classId?: string
  className?: string
  month?: string
  totalDue: number
  totalPaid: number
  rate: number
  overdueCount: number
  overdueStudents: { studentId: string; studentName: string; amountDue: number }[]
}
```

## Logique de mise à jour du statut après encaissement

```
paid_amount_new = item.paid_amount + payment.amount
remaining_new   = item.amount - paid_amount_new

if remaining_new < 0:        → ERREUR trop-perçu (400)
elif remaining_new == 0:     → status = 'paid'
elif paid_amount_new > 0:    → status = 'partial'
else:                        → status = 'pending'  (ne devrait pas arriver)
```
