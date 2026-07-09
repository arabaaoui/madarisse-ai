# Research — 004-paiements

## D1 — Table accounting_transactions (encaissements)

**Decision**: Utiliser `accounting_transactions` comme table d'encaissements (déjà référencée dans hitl.py `_execute_payment_record`).  
**Fields attendus**: `id, tenant_id, student_id, amount, payment_method ('cash'|'transfer'|'check'), transaction_date, payment_item_id (nullable), notes, created_at`  
**Lien aux échéances**: Un encaissement peut imputer une ou plusieurs `payment_items`. Pour Phase 1 on impute une seule échéance (FK `payment_item_id`). Imputation multi-échéances = Phase 2.

## D2 — Mise à jour des payment_items après encaissement

**Decision**: Application layer (route API), pas de trigger DB.  
**Logique**:
- `paid_amount += montant_versé`
- `remaining_amount = amount - paid_amount`
- Si `remaining_amount <= 0` → `status = 'paid'`
- Si `remaining_amount > 0 && paid_amount > 0` → `status = 'partial'`
- Si `paid_amount > amount` → alerte trop-perçu (FR-011), bloquer avec 400

## D3 — Détection doublon (FR-004)

**Decision**: Requête avant insert : `accounting_transactions WHERE student_id=X AND amount=Y AND transaction_date=Z AND tenant_id=T LIMIT 1`. Si trouvé → 409 avec `{ duplicate_id, message }`. Le front affiche une alerte et propose de confirmer via query param `?force=true`.

## D4 — Tool propose_payment_record (HITL agent)

**Decision**: Nouveau tool HITL dans `payment_tools.py`.  
**Signature**: `propose_payment_record(student_id, payment_item_id, amount, payment_method, ctx) -> dict`  
**Validation**: Vérifie que `amount <= remaining_amount` (trop-perçu) côté tool → si OUI, inclut un warning dans le preview.  
**Handler existant**: `_execute_payment_record` dans `hitl.py` — à compléter pour mettre à jour `payment_items` après insert.

## D5 — Tool get_recovery_rate (lecture)

**Decision**: Agrégation directe sur `payment_items` avec filtre `item_type='schedule'`, groupée par `class_id` et période.  
**Signature**: `get_recovery_rate(class_id: str | None, month: str | None, ctx) -> dict`  
**Output**: `{ total_due, total_paid, rate, overdue_count, overdue_students: [...] }`  
**Note**: `month` au format `YYYY-MM`, filtre sur `due_date`.

## D6 — État paiement élève (API GET /api/payments?student_id=X)

**Decision**: JOIN `payment_items` + `accounting_transactions` pour chaque item. Retourne l'échéancier complet avec les encaissements associés et le calcul des retards (due_date < today && status != paid).

## D7 — Rapport cockpit (US4)

**Decision**: Phase 1 = rapport textuel via agent (`get_recovery_rate`). Écran reporting cockpit = simple read-only avec TanStack Query → `GET /api/reporting/recovery?class_id=X&month=YYYY-MM`. Pas de graphiques en Phase 1 (complexité vs valeur).
