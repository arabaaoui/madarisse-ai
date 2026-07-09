# Tasks: Paiements — Encaissement, suivi et rapport financier

**Branch**: `004-paiements` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Phase 1 — Tests + Types (fondations)

- [ ] T001 [P] [US3] Écrire `services/agent/tests/test_payment_tools.py` — TDD pour `propose_payment_record` : action_log_id retourné, payload contient student_id/amount, trop-perçu → warning dans preview, action_type='payment.record' — DOIT ÉCHOUER avant T003
- [ ] T002 [P] [US1] Créer `apps/web/src/types/payment.ts` — `PaymentMethod`, `PaymentItemStatus`, labels, `PaymentItem`, `PaymentTransaction`, `StudentPaymentState`, `PaymentFormData`, `RecoveryReport`

---

## Phase 2 — Agent tools

- [ ] T003 [US3] Ajouter `propose_payment_record(student_id, payment_item_id, amount, payment_method, ctx) -> dict` dans `services/agent/tools/payment_tools.py` — HITL : vérifie remaining_amount, warning si trop-perçu, `action_type='payment.record'` — vérifier T001
- [ ] T004 [US4] Ajouter `get_recovery_rate(class_id: str | None, month: str | None, ctx) -> dict` dans `services/agent/tools/payment_tools.py` — agrège `payment_items` (item_type='schedule'), filtre par due_date mois, retourne `{ total_due, total_paid, rate, overdue_count, overdue_students }`
- [ ] T005 [US3+US4] Binder `propose_payment_record` et `get_recovery_rate` dans `services/agent/agents/school_agent.py::_bind_tools()` + instructions module `paiements` dans SYSTEM_PROMPT

---

## Phase 3 — Compléter hitl.py pour payment.record

- [ ] T006 [US3] Modifier `services/agent/core/hitl.py::_execute_payment_record` — après insert dans `accounting_transactions`, mettre à jour `payment_items` (paid_amount, remaining_amount, status) selon la logique data-model.md

---

## Phase 4 — API routes web

- [ ] T007 [US1] Créer `apps/web/src/app/api/payments/route.ts` — GET `?student_id=X` : liste les payment_items + transactions associées, calcule daysOverdue ; POST : insert accounting_transaction, update payment_item, check doublon (409), check trop-perçu (400)
- [ ] T008 [US2] Créer `apps/web/src/app/api/payments/[id]/route.ts` — PATCH `{ action: 'cancel' }` : marque accounting_transaction comme annulée, recalcule payment_item (paid_amount -= amount annulé)
- [ ] T009 [US4] Créer `apps/web/src/app/api/reporting/recovery/route.ts` — GET `?class_id=X&month=YYYY-MM` : agrège payment_items, retourne RecoveryReport

---

## Phase 5 — Hooks TanStack Query

- [ ] T010 [US1+US2] Créer `apps/web/src/hooks/usePayments.ts` — `useStudentPayments(studentId)`, `useRecordPayment()` mutation, `useRecoveryReport(classId, month)`

---

## Phase 6 — Cockpit UI

- [ ] T011 [US1] Créer `apps/web/src/components/paiements/PaymentSchedule.tsx` — tableau échéancier : date / type / montant / payé / reste / statut Badge (rouge si overdue + jours retard) / bouton « Enregistrer » sur les lignes non payées
- [ ] T012 [US2] Créer `apps/web/src/components/paiements/PaymentForm.tsx` — form : montant (pre-filled = remaining), date (default=today), mode (cash/transfer/check), notes ; alerte doublon et trop-perçu avant submit
- [ ] T013 [US1+US2] Créer `apps/web/src/components/paiements/PaiementsClient.tsx` — StudentSearch pour sélectionner un élève → affiche PaymentSchedule → Dialog PaymentForm sur "Enregistrer" d'une ligne
- [ ] T014 [US1] Créer `apps/web/src/app/(cockpit)/paiements/page.tsx` — Server Component + Suspense + PaiementsClient

---

## Phase 7 — Polish

- [ ] T015 [P] `npx tsc --noEmit` — zéro erreur TypeScript
- [ ] T016 [P] `uv run pytest tests/ -v` — T001 tests passent
- [ ] T017 [P] `uv run ruff check . && uv run mypy . --ignore-missing-imports`
- [ ] T018 Mettre à jour `docs/status/implementation-status.md`

---

## Dépendances

| Task | Dépend de |
|------|-----------|
| T003 | T001 (TDD) |
| T004 | — |
| T005 | T003, T004 |
| T006 | — (hitl.py indépendant) |
| T007 | T002 |
| T008 | T002 |
| T009 | T002 |
| T010 | T002 |
| T011 | T002, T010 |
| T012 | T002, T010 |
| T013 | T011, T012 |
| T014 | T013 |
| T015-T018 | T014, T005 |

**Parallélisables** : T001+T002 | T003+T004 | T007+T008+T009 | T011+T012 | T015+T016+T017

**Total** : 18 tâches
