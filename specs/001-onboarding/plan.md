# Implementation Plan — 001-onboarding

**Feature**: Onboarding wizard + agent-assisted setup  
**Sprint scope**: US1 (P1) + US2 (P2). US3 (CSV import) deferred to Phase 2.

---

## Phase 1 — DB Migrations

> Tables likely exist in Supabase. Migrations use `ADD COLUMN IF NOT EXISTS` to be safe.

Files to create in `db/migrations/`:

**`20260709000002_onboarding_academic_years.sql`**
```sql
ALTER TABLE academic_years
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

-- Ensure only one active year per tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_active_tenant
  ON academic_years (tenant_id)
  WHERE is_active = true;
```

**`20260709000003_onboarding_classes.sql`**
```sql
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS enrollment_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tuition_fee numeric DEFAULT 0;
```

**`20260709000004_onboarding_tenants.sql`**
```sql
-- Ensure tenants table has all profile columns
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_slug ON tenants (slug);
```

**RLS**: All tables must have `tenant_id = auth.jwt() ->> 'tenant_id'` policies (verify existing, add if absent).

---

## Phase 2 — API Routes

Build on top of existing GET routes in `apps/web/src/app/api/`.

| Method | Route | Notes |
|--------|-------|-------|
| GET | `/api/tenant` | Read current tenant profile |
| PATCH | `/api/tenant` | Update name, address, logo_url, slug |
| GET | `/api/academic-years` | Already exists |
| POST | `/api/academic-years` | Create new year; validate no overlap |
| PATCH | `/api/academic-years/[id]` | Update fields; if `is_active=true`, deactivate others |
| GET | `/api/classes` | Already exists |
| POST | `/api/classes` | Create class with fee defaults |
| PATCH | `/api/classes/[id]` | Update class fields |

All routes: extract `tenant_id` from Supabase session, pass to queries. No cross-tenant reads.

---

## Phase 3 — Wizard UI

**Route**: `/onboarding` — standalone page, outside cockpit layout.

**Component tree**:
```
/onboarding
└── WizardShell          # progress bar, step routing, localStorage sync
    ├── SchoolStep       # tenant name, nameAr, address, logo upload
    ├── YearStep         # academic year name, start/end dates, auto is_active=true
    ├── ClassesStep      # add/remove classes inline; name, level, capacity, fees
    └── ReviewStep       # summary of all data; single "Create everything" submit
```

**Progress persistence**: `useWizardState` hook — serialize `WizardState` to `localStorage['onboarding_wizard']` on every state change. Rehydrate on mount.

**Redirect**: On successful submit → `router.push('/dashboard')`.

**Validation**: Each step blocks "Next" until required fields pass zod schema. Dates validated for non-overlap on `YearStep`.

---

## Phase 4 — Agent-Assisted Setup (US2)

Extend `SchoolAgent` and `hitl.py` for onboarding actions.

**New tools** (`services/agent/tools/onboarding_tools.py`):
- `propose_setup_class(name, name_ar, level, capacity, enrollment_fee, tuition_fee, ctx)` → HITL action `school.setup.class`
- `propose_setup_year(year, start_date, end_date, ctx)` → HITL action `school.setup.year`
- `propose_setup_tenant(name, name_ar, address, ctx)` → HITL action `school.setup.tenant`

**HITL dispatch** (`hitl.py` `_dispatch_action`):
```python
"school.setup.class":  _execute_setup_class,
"school.setup.year":   _execute_setup_year,
"school.setup.tenant": _execute_setup_tenant,
```

**Agent module**: Add `"onboarding"` to `SYSTEM_PROMPT` module handling in `SchoolAgent`. The agent must:
1. Ask clarifying questions for ambiguous descriptions (max 3 turns).
2. Propose actions via HITL — never write directly.
3. Present a recap canvas before proposing any action.

**Entry point**: Chat panel on `/onboarding` page as an alternative tab to the wizard form.

---

## Out of Scope (US3 — CSV Import)

CSV student import is **deferred**. Reason: depends on confirmed class/year IDs from US1/US2, and requires a separate import pipeline. Planned for Phase 2 of the roadmap.

---

## Constitution Checklist

| Item | Status | Notes |
|------|--------|-------|
| RLS enforced on all new/altered tables | Verify in migration | `tenant_id` filter on all policies |
| HITL for all agent writes | Phase 4 | `propose_*` tools → `agent_action_logs` |
| Tests for API routes | T008–T010 | TypeScript type-check + manual curl |
| No cross-tenant reads | Phase 2 routes | `tenant_id` from session only |
| Multi-step wizard saves progress | Phase 3 | `localStorage` via `useWizardState` |
