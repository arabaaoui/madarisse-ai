# Tasks: Inscriptions — Inscription, validation et renouvellement

**Branch**: `003-inscriptions` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Phase 1 — Fondations (Types + API)

**Purpose**: Types TypeScript + API routes qui bloquent tout le reste.

- [ ] T001 [P] [US1] Créer `apps/web/src/types/enrollment.ts` — `EnrollmentStatus`, `EnrollmentListItem`, `EnrollmentFormData`, `ClassOption`, `AcademicYearOption`
- [ ] T002 [P] [US3] Écrire `services/agent/tests/test_enrollment_validate.py` — tests TDD pour `propose_enrollment_validate` (cross-tenant, payload, preview) — DOIT ÉCHOUER avant T009
- [ ] T003 [P] [US1] Créer `apps/web/src/app/api/classes/route.ts` — GET classes du tenant (select id, name, name_ar)
- [ ] T004 [P] [US1] Créer `apps/web/src/app/api/academic-years/route.ts` — GET années scolaires du tenant
- [ ] T005 [US1] Créer `apps/web/src/app/api/enrollments/route.ts` — GET (liste, filtres status/class_id) + POST (création, check doublon 409)
- [ ] T006 [US1] Créer `apps/web/src/app/api/enrollments/[id]/route.ts` — GET + PATCH (status → confirmed: génère échéancier | cancelled)
- [ ] T007 [US2] Créer `apps/web/src/app/api/enrollments/validate-batch/route.ts` — POST `{ ids }`, valide en masse, génère échéanciers, retourne `{ validated, skipped, errors }`

**Checkpoint**: Routes API fonctionnelles, testables via curl/Postman.

---

## Phase 2 — Génération d'échéancier (hitl.py)

**Purpose**: Compléter le handler `enrollment.validate` pour générer les `payment_items`.

- [ ] T008 [US1] Modifier `services/agent/core/hitl.py::_execute_enrollment_validate` — après update status=confirmed, générer les `payment_items` : 1 `enrollment_fee` + 10 `schedule` (tuition_fee × 10 mois, due_date 1er de chaque mois)

---

## Phase 3 — Tool agent US3 (HITL)

**Purpose**: `propose_enrollment_validate` pour la validation agent.

- [ ] T009 [US3] Ajouter `propose_enrollment_validate(enrollment_ids: list[str], ctx: AgentContext) -> dict` dans `services/agent/tools/enrollment_tools.py` — HITL avec preview `{ count, enrollment_previews }`, `action_type="enrollment.validate"` — vérifier que T002 passe
- [ ] T010 [US3] Binder `propose_enrollment_validate` dans `services/agent/agents/school_agent.py::_bind_tools()` + ajouter instruction dans SYSTEM_PROMPT section `inscriptions`

---

## Phase 4 — Hook TanStack Query

- [ ] T011 [US1] Créer `apps/web/src/hooks/useEnrollments.ts` — `useEnrollments(filters)`, `useCreateEnrollment()`, `useValidateBatch()`, `useClasses()`, `useAcademicYears()`

---

## Phase 5 — Cockpit UI (US1 + US2)

**Purpose**: Écran `/inscriptions` avec création + liste + validation en masse.

- [ ] T012 [P] [US1] Créer `apps/web/src/components/inscriptions/EnrollmentForm.tsx` — form shadcn/ui : StudentSearch pour sélection élève, Select pour classe (useClasses), Select pour année (useAcademicYears), champs frais inscription + scolarité (number), validation requise
- [ ] T013 [P] [US1] Créer `apps/web/src/components/inscriptions/EnrollmentList.tsx` — table shadcn/ui avec checkboxes (shadcn Checkbox), colonnes : élève / classe / année / frais inscription / scolarité / statut Badge / date création ; click ligne → afficher statut ; bouton « Valider » unitaire sur les pending
- [ ] T014 [US2] Ajouter dans `EnrollmentList.tsx` — header avec "Valider tout (N)" activé quand au moins 1 checkbox cochée ; Dialog de confirmation récapitulant les inscriptions sélectionnées avant appel validateBatch
- [ ] T015 [US1+US2] Créer `apps/web/src/components/inscriptions/InscriptionsClient.tsx` — `'use client'` : EnrollmentList + Dialog création (EnrollmentForm) + bouton « + Nouvelle inscription » ; état `selectedIds` pour validation en masse
- [ ] T016 [US1] Créer `apps/web/src/app/(cockpit)/inscriptions/page.tsx` — Server Component, metadata, Suspense + InscriptionsClient

---

## Phase 6 — Polish

- [ ] T017 [P] Ajouter lien « Inscriptions » dans `apps/web/src/components/cockpit/Sidebar.tsx` (si présent)
- [ ] T018 [P] `npx tsc --noEmit` dans `apps/web/` — zéro erreur TypeScript
- [ ] T019 [P] `uv run ruff check . && uv run mypy . --ignore-missing-imports` dans `services/agent/`
- [ ] T020 [P] `uv run pytest tests/ -v` dans `services/agent/` — T002 tests passent
- [ ] T021 Mettre à jour `docs/status/implementation-status.md` — 003-inscriptions ✅

---

## Dépendances

| Task | Dépend de |
|------|-----------|
| T005 | T001, T003, T004 |
| T006 | T001 |
| T007 | T001 |
| T008 | — (modification hitl.py indépendante) |
| T009 | T002 (TDD) |
| T010 | T009 |
| T011 | T001 |
| T012 | T001, T011 |
| T013 | T001, T011 |
| T014 | T013 |
| T015 | T012, T013, T014 |
| T016 | T015 |
| T017-T021 | T016, T010 |

**Tâches parallélisables** : T001+T002+T003+T004 | T012+T013 | T017+T018+T019+T020

**Total** : 21 tâches | 13 parallélisables
