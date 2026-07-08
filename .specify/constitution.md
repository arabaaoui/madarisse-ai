# Constitution — madarisse-ai Spec Kit

## Identité du projet
Application de gestion scolaire **cockpit-first + agent-native** multi-tenant.
Remplace `ecole-muret` (React/Vite) avec le même Supabase backend.

## Principes non négociables

### 1. Isolation multi-tenant (CRITIQUE)
- Chaque requête filtre par `tenant_id` — jamais de données cross-tenant.
- Testé en CI : un utilisateur de tenant-A ne peut jamais voir les données de tenant-B.
- Les tools agent héritent du RLS via le JWT utilisateur.

### 2. Human-in-the-loop sur les écritures sensibles
- L'agent **propose**, l'humain **décide**.
- Aucune écriture (inscription, paiement, validation) sans confirmation explicite via canvas.
- Toutes les actions confirmées sont dans `agent_action_logs` (traçabilité totale).

### 3. JWT utilisateur dans les tools (pas service_role)
- Les tools agent utilisent le JWT utilisateur → RLS hérité.
- `service_role` : uniquement pour l'écriture dans `agent_action_logs` (après validation HITL).

### 4. Test-first
- Chaque feature commence par des tests (unit + e2e).
- CI doit être verte avant tout merge.
- Les evals agent sont des tests comme les autres (rejouées en CI).

### 5. Observabilité
- Chaque action agent est loggée (`agent_action_logs`, structlog).
- Les coûts LLM sont mesurés (LiteLLM logs).
- Latence cible < 1.5s pour le premier token, < 5s pour la réponse complète.

### 6. Conformité (CNDP Loi 09-08 + RGPD)
- Données de mineurs : pas d'agent parent-facing avant audit juridique formalisé.
- Aucune donnée personnelle dans les logs applicatifs.
- Résidence des données sur VPS marocain (Coolify self-host).

## Stack
Next.js App Router + shadcn/ui + Vercel AI SDK · Google ADK/Python + FastAPI · LiteLLM · Supabase · Docker + Coolify

## Patterns de code

### Composants Next.js
- Server Components par défaut, `'use client'` uniquement si nécessaire (interaction, hooks).
- Toujours utiliser le client Supabase SSR (pas le client browser dans les Server Components).

### Tools agent
- Signature : `def tool_name(param: type, ctx: AgentContext) -> type`
- Le `ctx` est toujours le dernier paramètre, jamais passé via l'interface LLM.
- Les tools read-only retournent des données, les tools d'écriture retournent un `action_log_id`.

### Naming
- Actions : `domain.verb` (ex: `enrollment.create`, `payment.record`)
- Tables DB : snake_case, pluriel (ex: `agent_action_logs`, `payment_items`)
- Composants React : PascalCase, fichiers PascalCase.tsx

## Critères d'acceptation d'une feature
1. Tests unit/e2e écrits et passants.
2. Isolation RLS testée (au moins un test cross-tenant refusé).
3. Si écriture : HITL implémenté + `agent_action_logs` vérifié.
4. CI verte.
5. Revue de code (si PR).
