# Research Decisions — 001-onboarding

---

## D1 — Wizard vs Agent-First

**Decision**: Wizard (US1) is the primary onboarding path. Agent (US2) is an alternative tab on the same page.

**Rationale**: The wizard gives deterministic, guided UX with no LLM latency on the critical first-run path. Directors who are comfortable with conversation can switch to the agent tab. Both paths write to the same API layer.

**Impact**: `/onboarding` page has two tabs — "Formulaire" (wizard) and "Assistant" (chat). The agent tab is only rendered after the React component mounts to avoid SSR issues with the streaming SSE connection.

---

## D2 — Progress Persistence

**Decision**: `localStorage` only. No DB draft table.

**Rationale**: Draft state has no business value server-side. A `wizard_drafts` table would require a migration, RLS policy, and cleanup job. `localStorage` is sufficient for single-device wizard resumption, which covers ~95% of the use case. Data is cleared on successful submission.

**Key**: `localStorage['onboarding_wizard']` — JSON-serialized `WizardState`.

**Caveat**: Changing device or browser loses the draft. Accepted trade-off for P1.

---

## D3 — Tenant Profile Table

**Decision**: Assume a `tenants` table with columns `(id uuid, name text, name_ar text, address text, logo_url text, slug text)`.

**Rationale**: The spec.md mentions "Établissement (Tenant)" and the codebase uses `tenant_id` throughout. The slug uniqueness constraint is enforced at DB level. If the table is named differently (e.g., `schools`), the migration must be adapted — but `tenants` is the conventional name for multi-tenant SaaS in the Supabase ecosystem.

**Logo**: Stored in Supabase Storage bucket `tenant-logos`. The API PATCH returns a signed URL; the client uploads directly to Storage and stores the URL.

**Slug generation**: Server-side on POST, derived from `name` (slugify + dedup suffix if taken, e.g. `ecole-du-rif-2`).

---

## D4 — Academic Year Constraints

**Decision**: Enforce one active year per tenant at DB level (partial unique index on `is_active = true`). Overlap validation is server-side in the POST/PATCH handler.

**Overlap rule**: A new year `[start, end]` is rejected if any existing year for the same tenant has `NOT (end < new_start OR start > new_end)`.

**Activation rule**: Setting `is_active = true` on year B automatically sets all other years for the same tenant to `is_active = false` (UPDATE in same transaction).

**Wizard behavior**: `YearStep` creates the year with `is_active = true` by default (it's the first and only year for a new tenant).

---

## D5 — Class Fees

**Decision**: Fee defaults stored directly on `classes` (`enrollment_fee numeric`, `tuition_fee numeric`). No separate `fee_types` table in this sprint.

**Rationale**: The spec mentions "frais d'inscription" and "scolarité mensuelle" as the two main fee types. A generic `fee_types` table adds indirection without benefit for the P1 wizard scope. If more complex fee structures are needed (semester, custom schedules), a `fee_types` table can be introduced later without breaking the existing columns (which become defaults).

**Enrollment behavior**: When an enrollment is created (feature 003), it copies `enrollment_fee` and `tuition_fee` from the class at inscription time (snapshot), not a live reference.

---

## D6 — Wizard Redirect

**Decision**: On successful `ReviewStep` submit → `router.push('/dashboard')`.

**Submit sequence**:
1. PATCH `/api/tenant` (school profile)
2. POST `/api/academic-years` (get `year_id`)
3. POST `/api/classes` × N (parallel, using `year_id`)
4. On all success → clear `localStorage['onboarding_wizard']` → redirect

**Error handling**: If any step fails, show inline error on `ReviewStep`. Already-created entities are not rolled back (idempotent retry is acceptable at wizard level). A future improvement could wrap in a DB transaction via RPC.

---

## D7 — CSV Import (US3)

**Decision**: Deferred to Phase 2. Out of scope for the current sprint.

**Rationale**:
- Depends on `students` table and enrollment flow (feature 002–003).
- Requires a CSV parsing pipeline, column mapping UI, error reporting per row, and a 20%-error threshold confirmation flow.
- Estimated effort: 1–2 sprints standalone.

**Placeholder**: The `ReviewStep` will include a "Importer des élèves (CSV)" button that links to a `/onboarding/import` page — this page shows a "Bientôt disponible" placeholder for now, so the UX path is established without blocking the sprint.
