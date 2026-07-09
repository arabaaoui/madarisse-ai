# Data Model — 003-inscriptions

## Tables existantes (aucune migration requise)

### `enrollments`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| tenant_id | uuid | FK tenants, NOT NULL |
| student_id | uuid | FK students, NOT NULL |
| class_id | uuid | FK classes, NOT NULL |
| academic_year_id | uuid | FK academic_years, NOT NULL |
| enrollment_fee | numeric(10,2) | default 0 |
| tuition_fee | numeric(10,2) | default 0 |
| status | text | CHECK IN ('pending','confirmed','cancelled'), default 'pending' |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

**Unique**: `(tenant_id, student_id, academic_year_id)`  
**RLS**: SELECT/INSERT/UPDATE filtrés par `tenant_id = auth.jwt()->'app_metadata'->>'tenant_id'`

### `payment_items` (lecture pour affichage échéancier)

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| tenant_id | uuid | FK tenants |
| student_id | uuid | FK students |
| enrollment_id | uuid | FK enrollments |
| item_type | text | 'enrollment_fee' \| 'schedule' |
| amount | numeric(10,2) | NOT NULL |
| paid_amount | numeric(10,2) | default 0 |
| remaining_amount | numeric(10,2) | computed |
| status | text | 'pending' \| 'partial' \| 'paid' \| 'overdue' \| 'cancelled' |
| due_date | date | nullable |
| created_at | timestamptz | default now() |

## TypeScript Types

```typescript
// apps/web/src/types/enrollment.ts

export type EnrollmentStatus = 'pending' | 'confirmed' | 'cancelled'

export interface EnrollmentListItem {
  id: string
  studentId: string
  studentName: string
  className: string
  academicYear: string
  enrollmentFee: number
  tuitionFee: number
  status: EnrollmentStatus
  createdAt: string
}

export interface EnrollmentFormData {
  studentId: string
  classId: string
  academicYearId: string
  enrollmentFee: number
  tuitionFee: number
}

export interface ClassOption {
  id: string
  name: string
  nameAr?: string
}

export interface AcademicYearOption {
  id: string
  year: string
}
```

## Génération d'échéancier

Lors de la validation d'une inscription (status pending → confirmed), générer :

1. **1 payment_item** `item_type='enrollment_fee'`, `amount=enrollment_fee`, `due_date=today`, `status='pending'`
2. **10 payment_items** `item_type='schedule'`, `amount=tuition_fee`, `due_date=1er du mois j+1..j+10`, `status='pending'`

```python
SCHEDULE_MONTHS = 10  # Année scolaire marocaine (sept → juin)
```
