# Quickstart — Module Élèves (002-eleves)

**Date**: 2026-07-09 | **Branch**: `002-eleves`

---

## Prérequis

- [ ] Supabase configuré : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans `.env.local`
- [ ] Agent service démarré : `cd services/agent && uv run uvicorn main:app --reload --port 8001`
- [ ] Web démarré : `cd apps/web && bun dev`

---

## Étape 1 — Installer shadcn/ui

```bash
cd apps/web
npx shadcn@latest init
# Répondre : Style=Default, Base color=Slate, CSS variables=Yes
```

Puis installer les composants nécessaires à cette feature :

```bash
npx shadcn@latest add button input table badge card dialog form label
```

---

## Étape 2 — Initialiser TanStack Query

Dans `apps/web/src/app/(cockpit)/layout.tsx`, ajouter le `QueryClientProvider` :

```tsx
// apps/web/src/app/(cockpit)/layout.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/query-client'  // à créer

export default async function CockpitLayout({ children }) {
  // ... auth check existant
  const queryClient = getQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {/* layout existant */}
    </QueryClientProvider>
  )
}
```

Créer `apps/web/src/lib/query-client.ts` :
```ts
import { QueryClient } from '@tanstack/react-query'
import { cache } from 'react'

export const getQueryClient = cache(() => new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000 } }
}))
```

---

## Étape 3 — Ajouter les tools agent

Créer `services/agent/tools/student_tools.py` :

```python
from core.auth import AgentContext, get_supabase_client_for_user
from google.adk.tools import FunctionTool

def get_student_detail(student_id: str, ctx: AgentContext) -> dict:
    """Retourne les informations complètes d'un élève (données + inscription active)."""
    client = get_supabase_client_for_user(ctx.user_jwt)
    result = client.table("students") \
        .select("id, first_name, last_name, first_name_ar, last_name_ar, date_of_birth, gender, annual_status, phone, email, classes(name)") \
        .eq("id", student_id) \
        .eq("tenant_id", ctx.tenant_id) \
        .single() \
        .execute()
    if not result.data:
        return {"error": "Élève introuvable"}
    s = result.data
    # Récupère l'inscription active
    enrollment = client.table("enrollments") \
        .select("id, status, enrollment_fee, tuition_fee, academic_years(year)") \
        .eq("student_id", student_id) \
        .eq("tenant_id", ctx.tenant_id) \
        .eq("status", "confirmed") \
        .limit(1).execute()
    return {
        "id": s["id"],
        "name": f"{s['first_name']} {s['last_name']}",
        "name_ar": f"{s.get('first_name_ar','')} {s.get('last_name_ar','')}".strip() or None,
        "class_name": s["classes"]["name"] if s.get("classes") else None,
        "date_of_birth": s["date_of_birth"],
        "annual_status": s["annual_status"],
        "enrollment_status": enrollment.data[0]["status"] if enrollment.data else None,
        "phone": s.get("phone"),
        "email": s.get("email"),
    }

def get_student_payment_summary(student_id: str, ctx: AgentContext) -> dict:
    """Résumé des paiements d'un élève (total dû, payé, retards)."""
    from datetime import date
    client = get_supabase_client_for_user(ctx.user_jwt)
    items = client.table("payment_items") \
        .select("amount, paid_amount, status, due_date") \
        .eq("student_id", student_id) \
        .eq("tenant_id", ctx.tenant_id) \
        .eq("item_type", "schedule") \
        .neq("status", "cancelled") \
        .execute().data or []
    total_due = sum(r["amount"] for r in items)
    total_paid = sum(r["paid_amount"] or 0 for r in items)
    overdue = [r for r in items if r["status"] == "overdue" or (r["due_date"] and r["due_date"] < date.today().isoformat() and r["status"] not in ("paid",))]
    return {
        "total_due": total_due,
        "total_paid": total_paid,
        "total_overdue": sum(r["amount"] - (r["paid_amount"] or 0) for r in overdue),
        "overdue_count": len(overdue),
    }

student_detail_tool = FunctionTool(func=get_student_detail)
student_payment_tool = FunctionTool(func=get_student_payment_summary)
```

Enregistrer dans `services/agent/agents/school_agent.py` :
```python
from tools.student_tools import student_detail_tool, student_payment_tool
# Ajouter dans _bind_tools() : student_detail_tool, student_payment_tool
```

---

## Étape 4 — Vérifier les tests agent

```bash
cd services/agent
uv run pytest tests/test_student_tools.py -v
# Les tests doivent passer AVANT d'aller plus loin (constitution §4)
```

---

## Étape 5 — Lancer et tester le cockpit

```bash
cd apps/web && bun dev
```

1. Ouvrir `http://localhost:3000/eleves`
2. Créer un élève via le formulaire
3. Vérifier qu'il apparaît dans la liste
4. Cliquer sur la fiche → vérifier la fiche 360°
5. Ouvrir l'assistant (⌘K) → taper « qui n'a pas payé ce mois-ci ? »

---

## Commandes utiles

```bash
# TypeScript check
cd apps/web && bun run typecheck

# Lint
cd apps/web && bun run lint

# Tests agent
cd services/agent && uv run pytest tests/ -v

# Ruff + mypy agent
cd services/agent && uv run ruff check . && uv run mypy . --ignore-missing-imports
```

---

## Structure finale attendue

```
apps/web/src/
├── app/(cockpit)/eleves/
│   ├── page.tsx               ✅ après impl.
│   └── [id]/page.tsx          ✅ après impl.
├── components/eleves/
│   ├── StudentList.tsx         ✅ après impl.
│   ├── StudentSearch.tsx       ✅ après impl.
│   ├── StudentForm.tsx         ✅ après impl.
│   └── Student360.tsx          ✅ après impl.
├── hooks/
│   ├── useStudents.ts          ✅ après impl.
│   └── useStudent.ts           ✅ après impl.
└── types/student.ts            ✅ après impl.

services/agent/
└── tools/student_tools.py      ✅ après impl.
```
