# Data Model — 001-onboarding

---

## TypeScript Types

```typescript
// apps/web/src/types/onboarding.ts

export interface TenantProfile {
  id: string
  name: string
  nameAr?: string
  address?: string
  logoUrl?: string
  slug: string
}

export interface AcademicYear {
  id: string
  tenantId: string
  year: string          // e.g. "2025-2026"
  startDate: string     // ISO date "YYYY-MM-DD"
  endDate: string       // ISO date "YYYY-MM-DD"
  isActive: boolean
}

export interface ClassOption {
  id: string
  tenantId: string
  name: string
  nameAr?: string
  level?: string        // e.g. "CP", "CE1", "6ème"
  capacity?: number
  enrollmentFee: number // MAD
  tuitionFee: number    // MAD / month
}

export type WizardStep = 'school' | 'year' | 'classes' | 'review'

export interface WizardState {
  currentStep: WizardStep
  schoolProfile: Partial<TenantProfile>
  academicYear: Partial<AcademicYear>
  classes: Partial<ClassOption>[]
}
```

---

## API Payloads

```typescript
// POST /api/academic-years
export interface CreateAcademicYearPayload {
  year: string
  startDate: string
  endDate: string
  isActive?: boolean  // defaults to true on first creation
}

// POST /api/classes
export interface CreateClassPayload {
  name: string
  nameAr?: string
  level?: string
  capacity?: number
  enrollmentFee?: number
  tuitionFee?: number
}

// PATCH /api/tenant
export interface UpdateTenantPayload {
  name?: string
  nameAr?: string
  address?: string
  logoUrl?: string
}
```

---

## SQL Migrations

```sql
-- Migration: 20260709000002_onboarding_academic_years.sql
ALTER TABLE academic_years
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_active_tenant
  ON academic_years (tenant_id)
  WHERE is_active = true;
```

```sql
-- Migration: 20260709000003_onboarding_classes.sql
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS enrollment_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tuition_fee numeric DEFAULT 0;
```

```sql
-- Migration: 20260709000004_onboarding_tenants.sql
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_slug ON tenants (slug);
```

---

## Expected Schema (full columns after migrations)

### `tenants`
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | PK |
| name | text | NOT NULL |
| name_ar | text | |
| address | text | |
| logo_url | text | |
| slug | text | UNIQUE |
| created_at | timestamptz | |

### `academic_years`
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| year | text | NOT NULL |
| start_date | date | |
| end_date | date | |
| is_active | boolean | DEFAULT false |
| created_at | timestamptz | |

### `classes`
| Column | Type | Nullable |
|--------|------|----------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| name | text | NOT NULL |
| name_ar | text | |
| level | text | |
| capacity | integer | |
| enrollment_fee | numeric | DEFAULT 0 |
| tuition_fee | numeric | DEFAULT 0 |
| created_at | timestamptz | |

---

## RLS Policies (verify / add if absent)

```sql
-- academic_years: tenant isolation
CREATE POLICY "tenant_isolation" ON academic_years
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- classes: tenant isolation
CREATE POLICY "tenant_isolation" ON classes
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- tenants: user can only read/update their own tenant
CREATE POLICY "own_tenant_only" ON tenants
  USING (id = (auth.jwt() ->> 'tenant_id')::uuid);
```

---

## localStorage Schema

```typescript
// Key: 'onboarding_wizard'
// Shape: WizardState (see above)
// Written: on every field change in any step
// Cleared: on successful ReviewStep submission
```
