# Quickstart — Module Inscriptions (003-inscriptions)

**Date**: 2026-07-09 | **Branch**: `003-inscriptions`

## Prérequis

- [ ] 002-eleves implémenté (StudentSearch réutilisé)
- [ ] Agent service démarré : `cd services/agent && uv run uvicorn main:app --reload --port 8001`
- [ ] Web démarré : `cd apps/web && bun dev` (ou `npx next dev`)

## Étape 1 — Tests agent (avant implémentation)

```bash
cd services/agent
uv run pytest tests/test_enrollment_validate.py -v
# Doit échouer (tests écrits en TDD avant le code)
```

## Étape 2 — Tool agent propose_enrollment_validate

Ajouter dans `services/agent/tools/enrollment_tools.py` :

```python
async def propose_enrollment_validate(
    enrollment_ids: list[str],
    ctx: AgentContext,
) -> dict:
    """HITL — Propose la validation d'une liste d'inscriptions en attente."""
    # ... voir data-model.md
```

Relancer les tests : `uv run pytest tests/test_enrollment_validate.py -v`

## Étape 3 — Génération échéancier dans hitl.py

Modifier `_execute_enrollment_validate` dans `core/hitl.py` pour générer les `payment_items` après la mise à jour du statut.

## Étape 4 — API routes web

```bash
# Créer les endpoints
# /api/enrollments (GET + POST)
# /api/enrollments/validate-batch (POST)
# /api/enrollments/[id] (GET + PATCH)
# /api/classes (GET)
# /api/academic-years (GET)
```

## Étape 5 — Cockpit inscriptions

```bash
cd apps/web && npx next dev
```

1. Ouvrir `http://localhost:3000/inscriptions`
2. Créer une inscription via le formulaire
3. Vérifier qu'elle apparaît dans la liste avec statut « En attente »
4. Valider unitairement → vérifier que l'échéancier est généré dans payment_items
5. Créer 3+ inscriptions → sélectionner toutes → « Valider tout » → confirmer
6. Ouvrir l'assistant → « inscris Yassine en 6ème A, frais 1500, scolarité 800 » → vérifier canvas

## Commandes utiles

```bash
# TypeScript check
cd apps/web && npx tsc --noEmit

# Tests agent
cd services/agent && uv run pytest tests/ -v

# Ruff + mypy agent
cd services/agent && uv run ruff check . && uv run mypy . --ignore-missing-imports
```

## Structure finale attendue

```
apps/web/src/
├── app/(cockpit)/inscriptions/
│   └── page.tsx
├── app/api/enrollments/
│   ├── route.ts
│   ├── validate-batch/route.ts
│   └── [id]/route.ts
├── app/api/classes/route.ts
├── app/api/academic-years/route.ts
├── components/inscriptions/
│   ├── EnrollmentForm.tsx
│   ├── EnrollmentList.tsx
│   └── InscriptionsClient.tsx
├── hooks/useEnrollments.ts
└── types/enrollment.ts

services/agent/
├── tools/enrollment_tools.py    (+ propose_enrollment_validate)
└── tests/test_enrollment_validate.py
```
