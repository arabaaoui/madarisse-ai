# Implementation Plan: Inscriptions — Inscription, validation et renouvellement

**Branch**: `003-inscriptions` | **Date**: 2026-07-09 | **Spec**: [spec.md](spec.md)

## Summary

Cockpit d'inscription des élèves (création + validation unitaire + validation en masse) et inscription assistée par agent (HITL via canvas de confirmation). Les tools agent `propose_enrollment_create` et les handlers HITL `enrollment.create`/`enrollment.validate` existent déjà. Ce plan couvre le cockpit UI manquant et le tool `propose_enrollment_validate` (validation agent HITL).

## Technical Context

**Language/Version**: TypeScript 5 (web) | Python 3.12 (agent)  
**Primary Dependencies**: Next.js 16.2.10 App Router · shadcn/ui (base-ui) · TanStack Query 5 · @supabase/ssr 0.12 (web) | FastAPI · ADK 2.x.x · structlog (agent)  
**Storage**: Supabase Postgres (enrollments, payment_items, classes, academic_years) — RLS multi-tenant  
**Testing**: pytest + mocks Supabase (agent) | TypeScript tsc --noEmit (web)  
**Target Platform**: Web server (Next.js SSR) + Linux server (FastAPI)  
**Performance Goals**: Validation en masse 20 inscriptions < 10s (SC-002)  
**Constraints**: HITL obligatoire pour toute écriture agent — zéro écriture sans confirmation humaine (§2 constitution)  
**Scale/Scope**: ~200 inscriptions/an par tenant, max 50 pending simultanément

## Constitution Check

| Gate | Status | Note |
|------|--------|------|
| Multi-tenant isolation (§1) | ✅ PASS | Toutes les requêtes filtrées par `tenant_id` via RLS |
| HITL sur écritures (§2) | ✅ PASS | Cockpit: confirmation UI avant validation en masse / Agent: canvas HITL |
| JWT user dans tools (§3) | ✅ PASS | Pattern existant dans enrollment_tools.py — réutilisé |
| Test-first (§4) | ✅ PASS | Tests écrits avant code cockpit (T001-T004) |
| Observabilité (§5) | ✅ PASS | structlog dans tous les tools, agent_action_logs |
| Conformité CNDP (§6) | ✅ PASS | Pas de données personnelles dans les logs |

## Project Structure

### Documentation

```text
specs/003-inscriptions/
├── plan.md              ✅ ce fichier
├── research.md          ✅
├── data-model.md        ✅
├── quickstart.md        ✅
├── contracts/api.yaml   ✅
└── tasks.md             ⏳ /speckit.tasks
```

### Source Code

```text
apps/web/src/
├── app/api/enrollments/
│   ├── route.ts                    # GET (liste pending) + POST (création)
│   ├── validate-batch/route.ts     # POST (validation en masse — cockpit)
│   └── [id]/route.ts               # GET + PATCH (validation unitaire)
├── components/inscriptions/
│   ├── EnrollmentForm.tsx          # Formulaire inscription (select élève + classe + frais)
│   ├── EnrollmentList.tsx          # Table inscriptions en attente avec checkboxes
│   └── InscriptionsClient.tsx      # Client: liste + form + validation en masse
├── hooks/
│   └── useEnrollments.ts           # useEnrollments(), useCreateEnrollment(), useValidateBatch()
├── types/
│   └── enrollment.ts               # Types TypeScript
└── app/(cockpit)/inscriptions/
    └── page.tsx                    # Server Component

services/agent/
├── tools/
│   └── enrollment_tools.py         # Ajouter propose_enrollment_validate (HITL)
└── tests/
    └── test_enrollment_validate.py # Tests propose_enrollment_validate
```

## Implementation Phases

### Phase 1 — Types + API routes (T001-T006)
Tests enrollment_validate → types TypeScript → GET/POST /api/enrollments → POST validate-batch → PATCH /api/enrollments/[id]

### Phase 2 — Agent tool (T007-T009)
`propose_enrollment_validate` tool HITL → tests → bind dans school_agent.py

### Phase 3 — Cockpit UI (T010-T016)
useEnrollments hook → EnrollmentForm → EnrollmentList (checkboxes) → InscriptionsClient → page.tsx

### Phase 4 — Génération échéancier (T017-T019)
`_generate_payment_schedule()` dans hitl.py → appelée après `_execute_enrollment_validate` → payment_items créés

### Phase 5 — Polish (T020-T024)
Tests cockpit TS → typecheck → ruff/mypy → update implementation-status.md
