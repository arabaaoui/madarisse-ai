# Tasks: Élèves — Gestion des dossiers élèves

**Input**: `specs/002-eleves/` (spec.md · plan.md · research.md · data-model.md · contracts/api.yaml · quickstart.md)  
**Branch**: `002-eleves`  
**Tests**: inclus — constitution §4 impose test-first pour les tools agent et l'isolation tenant.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallélisable (fichiers différents, pas de dépendance bloquante)
- **[Story]**: user story associée (US1/US2/US3)
- Chemins absolus depuis la racine du repo

---

## Phase 1: Setup (Prérequis bloquants)

**Purpose**: Installer shadcn/ui et TanStack Query — bloque TOUS les composants cockpit.

- [ ] T001 Initialiser shadcn/ui dans `apps/web/` : `npx shadcn@latest init` (Style=Default, BaseColor=Slate, CSSVariables=Yes)
- [ ] T002 Installer les composants shadcn nécessaires : `npx shadcn@latest add button input table badge card dialog form label select` dans `apps/web/`
- [ ] T003 [P] Créer `apps/web/src/lib/query-client.ts` — QueryClient singleton via `cache()` React, `staleTime: 60_000`
- [ ] T004 Modifier `apps/web/src/app/(cockpit)/layout.tsx` — ajouter `<QueryClientProvider client={getQueryClient()}>` autour du layout existant (importer depuis `@/lib/query-client`)

**Checkpoint**: `bun run typecheck` passe, `components/ui/button.tsx` existe.

---

## Phase 2: Fondations (Routes API + Types)

**Purpose**: Types TypeScript et routes BFF — prérequis pour US1 et US2.

⚠️ **CRITIQUE** : Aucune user story ne peut démarrer avant la fin de cette phase.

- [ ] T005 [P] Créer `apps/web/src/types/student.ts` — types `StudentStatus`, `EnrollmentStatus`, `StudentListItem`, `StudentFormData`, `StudentPatchData`, `Student360` (copier depuis `data-model.md` §Types TypeScript)
- [ ] T006 [P] Créer `apps/web/src/app/api/students/route.ts` — GET (liste paginée avec filtres `search`, `class_id`, `status`, `limit`, `after`) + POST (création) via `createServerClient` Supabase SSR ; retourner les types `StudentListItem`
- [ ] T007 [P] Créer `apps/web/src/app/api/students/[id]/route.ts` — GET (fiche 360 : 2 fetches parallèles `students` + `enrollments` + agrégat `payment_items`) + PATCH (mise à jour partielle) + DELETE (désactivation avec guard inscription active)
- [ ] T008 [P] Créer `apps/web/src/app/api/students/search/route.ts` — GET avec param `q` (min 2 chars) : `ilike` sur `first_name OR last_name OR first_name_ar OR last_name_ar`, limit 10, retourne `StudentSearchResult[]`

**Checkpoint**: `curl /api/students/search?q=ya` retourne JSON (même vide), pas d'erreur 500.

---

## Phase 3: User Story 1 — Saisie manuelle d'un dossier élève (P1) 🎯 MVP

**Goal**: Le secrétariat peut créer un dossier élève via un formulaire cockpit, et l'élève apparaît dans la liste.

**Independent Test**: Créer un élève, vérifier qu'il apparaît dans `GET /api/students`, puis se connecter sur un autre tenant et vérifier qu'il n'apparaît pas (SC-003).

### Tests (écrire en premier — doivent ÉCHOUER avant implémentation)

- [ ] T009 [US1] Créer `services/agent/tests/test_student_tools.py` — test `test_search_student_tenant_isolation` : requête search avec `tenant_id` A depuis un contexte tenant B → résultat vide ; test `test_search_student_returns_match` : recherche "Yassine" dans tenant A → retourne l'élève

### Implémentation US1

- [ ] T010 [P] [US1] Créer `apps/web/src/hooks/useStudents.ts` — hook TanStack Query `useStudents({ search, classId, status, limit })` wrappant `GET /api/students` ; inclure `useCreateStudent()` mutation wrappant `POST /api/students` ; invalider le cache après création
- [ ] T011 [P] [US1] Créer `apps/web/src/components/eleves/StudentForm.tsx` — Client Component : formulaire shadcn/ui (Input prénom/nom/prénom_ar/nom_ar, Select genre M/F, Input date naissance, Select classe, Input parent nom/téléphone/email), validation inline (champs requis : prénom, nom, date naissance, genre), submit appelle `useCreateStudent()`
- [ ] T012 [US1] Créer `apps/web/src/app/(cockpit)/eleves/page.tsx` — Server Component : titre "Élèves", bouton "Nouvel élève" ouvrant un Dialog shadcn contenant `<StudentForm>`, placeholder `<StudentList>` (composant du T015), `<StudentSearch>` (composant du T014) ; passer `searchParams` pour filtre URL
- [ ] T013 [US1] Vérifier la validation : soumettre le formulaire avec prénom manquant → message d'erreur inline sans perte des autres données saisies ; soumettre avec un élève valide → dialog se ferme, liste se rafraîchit, badge "à inscrire" visible

**Checkpoint US1**: Un secrétariat peut créer un élève via le formulaire ; l'élève apparaît dans la liste avec statut "à inscrire".

---

## Phase 4: User Story 2 — Recherche et fiche 360° (P1)

**Goal**: Recherche temps réel par nom (FR/AR) et fiche consolidée avec données personnelles + inscription + paiements.

**Independent Test**: Taper "yas" dans la barre de recherche → résultats en < 300ms. Cliquer sur un élève avec inscription confirmée → fiche 360° affiche résumé paiements.

### Tests

- [ ] T014 [US2] Créer `services/agent/tests/test_student_detail_tool.py` — test `test_get_student_detail_cross_tenant` : appeler `get_student_detail(student_id_tenant_A, ctx_tenant_B)` → retourne `{"error": "Élève introuvable"}` ; test `test_get_student_payment_summary_empty` : élève sans paiement → `total_due=0, overdue_count=0`

### Implémentation US2 — Tools Agent

- [ ] T015 [P] [US2] Créer `services/agent/tools/student_tools.py` — `get_student_detail(student_id, ctx)` : SELECT students JOIN classes, guard `tenant_id`, JOIN enrollment confirmée ; `get_student_payment_summary(student_id, ctx)` : agrégat payment_items (total_due, total_paid, total_overdue, overdue_count) ; exporter `student_detail_tool` et `student_payment_tool` (FunctionTool)
- [ ] T016 [US2] Modifier `services/agent/agents/school_agent.py` — importer `student_detail_tool`, `student_payment_tool` depuis `tools.student_tools` ; les ajouter dans `_bind_tools()` ; ajouter instruction dans le system prompt pour le module "eleves" : l'agent peut utiliser `get_student_detail` et fournir des liens `/eleves/{id}`

### Implémentation US2 — Cockpit

- [ ] T017 [P] [US2] Créer `apps/web/src/hooks/useStudent.ts` — hook `useStudent(id)` wrappant `GET /api/students/{id}` (retourne `Student360`) ; hook `useStudentSearch(query)` wrappant `GET /api/students/search?q={query}` avec `enabled: query.length >= 2`
- [ ] T018 [P] [US2] Créer `apps/web/src/components/eleves/StudentSearch.tsx` — Client Component : Input shadcn avec debounce 300ms, appelle `useStudentSearch`, affiche dropdown avec max 10 résultats (nom, classe, badge statut) ; sélection navigue vers `/eleves/{id}` ; état vide affiche "Aucun résultat — créer un élève ?"
- [ ] T019 [P] [US2] Créer `apps/web/src/components/eleves/StudentList.tsx` — Client Component : Table shadcn paginée (colonnes : nom, nom AR, classe, statut badge, actions) ; filtre par classe via Select ; tri alphabétique ; bouton "Charger plus" (cursor pagination) ; clic sur ligne → navigate `/eleves/{id}`
- [ ] T020 [US2] Brancher `<StudentSearch>` et `<StudentList>` dans `apps/web/src/app/(cockpit)/eleves/page.tsx` (remplacer les placeholders T012) ; passer `searchParams.search` et `searchParams.class_id` aux composants
- [ ] T021 [P] [US2] Créer `apps/web/src/components/eleves/Student360.tsx` — Client Component : Card données personnelles (nom FR+AR, naissance, genre, contact parent) ; Card inscription (classe, statut badge, frais) ; Card paiements (total dû, payé, retard, badge "X échéances en retard") ; historique actions agent (liste `agent_action_logs` filtrés sur l'élève) ; bouton "Modifier" ouvrant StudentForm en mode édition
- [ ] T022 [US2] Créer `apps/web/src/app/(cockpit)/eleves/[id]/page.tsx` — Server Component : fetch `GET /api/students/{id}`, passer données à `<Student360>` ; gérer 404 (notFound()) et 403 (redirect /eleves)

**Checkpoint US2**: Rechercher "yas" affiche des résultats en temps réel ; cliquer sur un élève affiche la fiche 360° complète.

---

## Phase 5: User Story 3 — Alertes proactives via l'assistant (P2)

**Goal**: L'assistant répond aux questions sur les élèves en retard et génère des liens cliquables vers les fiches.

**Independent Test**: Dans l'assistant (⌘K), taper « qui n'a pas payé ce mois-ci ? » → réponse avec liste et liens `/eleves/{id}` cliquables naviguant vers les fiches.

### Implémentation US3

- [ ] T023 [US3] Modifier `apps/web/src/components/assistant/AssistantPanel.tsx` — dans le rendu des messages, détecter les patterns `[Nom Élève](/eleves/{uuid})` dans le contenu markdown de l'agent et les rendre comme `<Link href="/eleves/{id}">` Next.js (utiliser `react-markdown` ou parsing simple)
- [ ] T024 [US3] Vérifier manuellement le scénario complet : ouvrir l'assistant en étant sur `/eleves`, taper « quels élèves ont un retard de paiement ? » → l'agent appelle `get_unpaid_students`, retourne la liste avec liens, les liens sont cliquables et naviguent vers `/eleves/{id}`
- [ ] T025 [US3] Vérifier la question hors périmètre : taper « quelles sont les notes de Yassine ? » → l'agent répond qu'il n'a pas accès à cette information en Phase 1

**Checkpoint US3**: L'assistant répond aux questions élèves avec des liens actifs vers les fiches cockpit.

---

## Phase 6: Polish & Validation croisée

**Purpose**: Qualité, CI verte, conformité constitution.

- [ ] T026 [P] Exécuter les tests agent et corriger les échecs : `cd services/agent && pytest tests/test_student_tools.py tests/test_student_detail_tool.py -v` — tous les tests doivent passer
- [ ] T027 [P] Exécuter `cd apps/web && bun run typecheck` — zéro erreur TypeScript
- [ ] T028 [P] Exécuter `cd apps/web && bun run lint` — zéro warning ESLint
- [ ] T029 Exécuter `cd services/agent && ruff check . && mypy . --ignore-missing-imports` — zéro erreur ruff/mypy
- [ ] T030 Test cross-tenant (SC-003) : créer un élève sur tenant A, se connecter sur tenant B, vérifier que `GET /api/students` ne retourne pas l'élève de tenant A (RLS Supabase)
- [ ] T031 Test suppression bloquée (FR-009) : créer un élève avec inscription active, appeler `DELETE /api/students/{id}` → réponse 409 avec message explicatif
- [ ] T032 Mettre à jour `docs/status/implementation-status.md` — cocher les gaps 002-eleves résolus

---

## Dependencies & Execution Order

### Dépendances entre phases

```
Phase 1 (Setup)
  └─ T001 → T002 → T003 [P] + T004 [P]
        │
Phase 2 (Fondations) — BLOQUE US1 et US2
  └─ T005 [P] + T006 [P] + T007 [P] + T008 [P]
        │
Phase 3 (US1) ←── peut démarrer après Phase 2
  └─ T009 → T010 [P] + T011 [P] → T012 → T013
        │
Phase 4 (US2) ←── peut démarrer après Phase 2 (en parallèle de US1 si 2 devs)
  └─ T014 → T015 [P] → T016 → T017 [P] + T018 [P] + T019 [P] → T020 → T021 [P] → T022
        │
Phase 5 (US3) ←── dépend de US2 (tools agent requis)
  └─ T023 → T024 → T025
        │
Phase 6 (Polish)
  └─ T026 [P] + T027 [P] + T028 [P] + T029 → T030 → T031 → T032
```

### Dépendances intra-story

| Tâche | Dépend de |
|-------|-----------|
| T004 | T003 |
| T006 | T005 |
| T007 | T005 |
| T008 | T005 |
| T010 | T006 |
| T011 | T005 |
| T012 | T010, T011 |
| T013 | T012 |
| T016 | T015 |
| T017 | T015 |
| T018 | T017 |
| T019 | T017 |
| T020 | T018, T019 |
| T021 | T017 |
| T022 | T021 |
| T023 | T016 |

---

## Parallel Example: US2

```bash
# Lancer en parallèle après T016 (school_agent.py mis à jour) :
Agent 1 → T017 apps/web/src/hooks/useStudent.ts
Agent 2 → T018 apps/web/src/components/eleves/StudentSearch.tsx
Agent 3 → T019 apps/web/src/components/eleves/StudentList.tsx
Agent 4 → T021 apps/web/src/components/eleves/Student360.tsx

# Puis séquentiel :
→ T020 (branche eleves/page.tsx sur T018+T019)
→ T022 (eleves/[id]/page.tsx sur T021)
```

---

## Implementation Strategy

### MVP (US1 seul)

1. ✅ Phase 1 : shadcn/ui + TanStack Query
2. ✅ Phase 2 : Types + routes API
3. ✅ Phase 3 : Formulaire création élève + liste basique
4. **STOP & VALIDER** : Un secrétariat peut créer et voir un élève.

### Livraison incrémentale

1. MVP (US1) → démo secrétariat (créer un élève)
2. + US2 → recherche temps réel + fiche 360°
3. + US3 → alertes agent avec liens cliquables

---

## Comptage

| Phase | Tâches | Parallélisables |
|-------|--------|-----------------|
| Setup | 4 | 2 |
| Fondations | 4 | 4 |
| US1 (P1) | 5 | 2 |
| US2 (P1) | 9 | 6 |
| US3 (P2) | 3 | 0 |
| Polish | 7 | 4 |
| **Total** | **32** | **18** |
