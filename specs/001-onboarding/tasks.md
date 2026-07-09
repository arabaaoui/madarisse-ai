# Tasks — 001-onboarding

**Total**: 18 tasks — US1 (P1) + US2 (P2). US3 deferred.

---

## DB Migrations

| ID | Title | Type | Depends On | Status | Parallel | US |
|----|-------|------|------------|--------|----------|----|
| T001 | Write migration: academic_years columns (start_date, end_date, is_active, unique index) | impl | — | todo | [P] | US1 |
| T002 | Write migration: classes columns (name_ar, level, capacity, enrollment_fee, tuition_fee) + tenants columns (name_ar, address, logo_url, slug) | impl | — | todo | [P] | US1 |

Files: `db/migrations/20260709000002_*.sql`, `20260709000003_*.sql`, `20260709000004_*.sql`

---

## API Routes

| ID | Title | Type | Depends On | Status | Parallel | US |
|----|-------|------|------------|--------|----------|----|
| T003 | Implement GET + PATCH `/api/tenant` | impl | T001, T002 | todo | [P] | US1 |
| T004 | Implement POST `/api/academic-years` (with overlap validation) | impl | T001 | todo | [P] | US1 |
| T005 | Implement PATCH `/api/academic-years/[id]` (with is_active deactivation logic) | impl | T004 | todo | | US1 |
| T006 | Implement POST `/api/classes` | impl | T002 | todo | [P] | US1 |
| T007 | Implement PATCH `/api/classes/[id]` | impl | T006 | todo | [P] | US1 |

---

## API Tests

| ID | Title | Type | Depends On | Status | Parallel | US |
|----|-------|------|------------|--------|----------|----|
| T008 | TypeScript type-check: verify all API route handler types compile (`pnpm tsc --noEmit`) | test | T003–T007 | todo | | US1 |
| T009 | Curl smoke tests: POST /api/academic-years rejects overlapping dates (409), POST /api/classes happy path (201) | test | T004, T006 | todo | [P] | US1 |
| T010 | RLS isolation test: confirm tenant B cannot read tenant A's classes or academic years via direct Supabase query | test | T006 | todo | | US1 |

---

## Wizard UI

| ID | Title | Type | Depends On | Status | Parallel | US |
|----|-------|------|------------|--------|----------|----|
| T011 | Build `WizardShell` component: progress bar, step routing, localStorage sync, `WizardState` type | impl | T008 | todo | | US1 |
| T012 | Build `SchoolStep`: name, nameAr, address, logo upload (Supabase Storage) with zod validation | impl | T011 | todo | [P] | US1 |
| T013 | Build `YearStep`: year string, startDate, endDate pickers; date coherence validation; blocks Next on invalid | impl | T011 | todo | [P] | US1 |
| T014 | Build `ClassesStep`: inline add/remove classes, fee fields per class; at least 1 class required to advance | impl | T011 | todo | [P] | US1 |
| T015 (ReviewStep) | Build `ReviewStep`: summary display + single "Créer l'école" submit button; calls PATCH tenant → POST year → POST classes in sequence; clears localStorage; redirects `/dashboard` | impl | T012, T013, T014 | todo | | US1 |

> Note: T015 is labelled ReviewStep for clarity; its ID in the sequence is T015.

---

## Hooks

| ID | Title | Type | Depends On | Status | Parallel | US |
|----|-------|------|------------|--------|----------|----|
| T016 | `useWizardState` hook: read/write `WizardState` from localStorage with debounced persist | impl | T011 | todo | [P] | US1 |
| T017 | `useOnboarding` hook: wraps TanStack Query mutations for PATCH tenant, POST academic-years, POST classes; exposes `submit()` with sequential execution and error state | impl | T003–T007 | todo | | US1 |

---

## Page & Agent

| ID | Title | Type | Depends On | Status | Parallel | US |
|----|-------|------|------------|--------|----------|----|
| T018 | Create `/onboarding` page (standalone, outside cockpit layout): tab "Formulaire" → `WizardShell`; tab "Assistant" → chat panel wired to agent with `active_module="onboarding"`; add `school.setup.class` + `school.setup.year` + `school.setup.tenant` onboarding tools + HITL dispatch handlers | impl | T011–T017 | todo | | US1+US2 |

---

## Docs

| ID | Title | Type | Depends On | Status | Parallel | US |
|----|-------|------|------------|--------|----------|----|
| T019 | Update `docs/implementation-status.md`: mark 001-onboarding phases as in-progress / done | docs | T018 | todo | | — |

---

## Summary

| Phase | Tasks | Parallelizable |
|-------|-------|---------------|
| DB | T001–T002 | Yes (both) |
| API | T003–T007 | T003, T004, T006, T007 in parallel; T005 after T004 |
| Tests | T008–T010 | T009, T010 in parallel after T008 |
| Wizard UI | T011–T015 | T012, T013, T014 after T011; T015 last |
| Hooks | T016–T017 | T016 parallel with T017 |
| Page+Agent | T018 | After all above |
| Docs | T019 | Last |
