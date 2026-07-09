# Data Model — 002-eleves

**Date**: 2026-07-09 | **Branch**: `002-eleves`

---

## Tables utilisées (existantes — aucune migration)

### `students`

Dossier individuel d'un élève. Table principale de cette feature.

```sql
-- Colonnes utilisées dans cette feature (table complète dans le Supabase partagé)
students (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES tenants(id),
  first_name       text        NOT NULL,
  last_name        text        NOT NULL,
  first_name_ar    text,                          -- Prénom en arabe (optionnel)
  last_name_ar     text,                          -- Nom en arabe (optionnel)
  date_of_birth    date        NOT NULL,
  gender           text        NOT NULL,           -- 'M' | 'F'
  annual_status    text        DEFAULT 'pending',  -- 'pending' | 'active' | 'inactive'
  class_id         uuid        REFERENCES classes(id) ON DELETE SET NULL,
  academic_year_id uuid        REFERENCES academic_years(id),
  parent_name      text,
  parent_name_ar   text,
  phone            text,
  email            text,
  photo            text,                           -- URL Supabase Storage
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
)
```

**Index existants pertinents** :
- `idx_students_tenant_class (tenant_id, class_id)` → tri/filtre par classe
- `idx_students_id_names (id, first_name, last_name, first_name_ar, last_name_ar, class)` → recherche

**RLS existantes** :
- Secrétariat/Directeur/Admin : CRUD complet sur leur `tenant_id`
- Professeur : SELECT uniquement sur leur `tenant_id`
- Cross-tenant : impossible (policy USING `tenant_id = auth.jwt()->>'tenant_id'`)

---

### `classes`

Groupe d'élèves au sein d'une année scolaire.

```sql
classes (
  id               uuid  PRIMARY KEY,
  name             text  NOT NULL,
  name_ar          text,
  academic_year_id uuid  REFERENCES academic_years(id),
  tenant_id        uuid  NOT NULL REFERENCES tenants(id)
)
```

---

### `enrollments`

Inscription d'un élève dans une classe pour une année scolaire.

```sql
enrollments (
  id               uuid    PRIMARY KEY,
  tenant_id        uuid    NOT NULL,
  student_id       uuid    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id uuid    NOT NULL REFERENCES academic_years(id),
  enrollment_fee   numeric DEFAULT 0,
  tuition_fee      numeric DEFAULT 0,
  status           text    NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'cancelled'
  enrollment_type  text    DEFAULT 'new',
  created_at       timestamptz DEFAULT now(),
  UNIQUE (tenant_id, student_id, academic_year_id)
)
```

---

### `payment_items`

Lignes d'échéancier de paiement liées à une inscription.

```sql
payment_items (
  id             uuid    PRIMARY KEY,
  tenant_id      uuid    NOT NULL,
  student_id     uuid    NOT NULL REFERENCES students(id),
  enrollment_id  uuid    REFERENCES enrollments(id),
  item_type      text    NOT NULL,       -- 'schedule' | 'fee'
  amount         numeric NOT NULL,
  paid_amount    numeric DEFAULT 0,
  remaining_amount numeric,
  due_date       date,
  status         text    NOT NULL DEFAULT 'pending',  -- 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
  payment_method text,
  payment_date   date,
  created_at     timestamptz DEFAULT now()
)
```

---

## Diagramme des relations (feature 002-eleves)

```
tenants
  └─ 1:N ─ students ─── 1:N ─ enrollments ─── 1:N ─ payment_items
              │                     │
              └── N:1 ─ classes     └── N:1 ─ academic_years
```

---

## Transitions d'état

### `students.annual_status`

```
pending ──[inscription confirmée]──→ active
active  ──[fin d'année / inactif]──→ inactive
pending ──[inactif manuel]──────────→ inactive
```

### `enrollments.status`

```
pending ──[validation secrétariat]──→ confirmed
pending ──[annulation]──────────────→ cancelled
confirmed ──────────────────────────→ (irréversible en Phase 1)
```

---

## Données de la Fiche 360° (vue agrégée, pas de table)

La fiche 360° est une vue client construite côté Next.js depuis 3 requêtes parallèles :

```typescript
interface Student360 {
  // Données personnelles
  id: string
  firstName: string
  lastName: string
  firstNameAr?: string
  lastNameAr?: string
  dateOfBirth: string
  gender: 'M' | 'F'
  annualStatus: 'pending' | 'active' | 'inactive'
  photo?: string
  // Contact parent
  parentName?: string
  parentPhone?: string
  parentEmail?: string
  // Classe active
  class?: { id: string; name: string; nameAr?: string }
  // Inscription active
  enrollment?: {
    id: string
    status: 'pending' | 'confirmed' | 'cancelled'
    enrollmentFee: number
    tuitionFee: number
    academicYear: string
  }
  // Résumé paiements
  paymentSummary?: {
    totalDue: number
    totalPaid: number
    totalOverdue: number
    nextDueDate?: string
    overdueCount: number
  }
}
```

---

## Types TypeScript (`apps/web/src/types/student.ts`)

```typescript
export type StudentStatus = 'pending' | 'active' | 'inactive'
export type EnrollmentStatus = 'pending' | 'confirmed' | 'cancelled'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'

export interface StudentListItem {
  id: string
  firstName: string
  lastName: string
  firstNameAr?: string
  lastNameAr?: string
  annualStatus: StudentStatus
  className?: string
  classId?: string
  phone?: string
  email?: string
}

export interface StudentFormData {
  firstName: string
  lastName: string
  firstNameAr?: string
  lastNameAr?: string
  dateOfBirth: string
  gender: 'M' | 'F'
  classId?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
}

export interface Student360 {
  id: string
  firstName: string
  lastName: string
  firstNameAr?: string
  lastNameAr?: string
  dateOfBirth: string
  gender: 'M' | 'F'
  annualStatus: StudentStatus
  photo?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
  class?: { id: string; name: string; nameAr?: string }
  enrollment?: {
    id: string
    status: EnrollmentStatus
    enrollmentFee: number
    tuitionFee: number
    academicYear: string
  }
  paymentSummary?: {
    totalDue: number
    totalPaid: number
    totalOverdue: number
    nextDueDate?: string
    overdueCount: number
  }
}
```
