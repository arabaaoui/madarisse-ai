# Architecture — madarisse-ai

## 1. Vision

`madarisse-ai` est un **School OS agentique** multi-tenant qui **remplace** `ecole-muret` (React/Vite).
Il conserve **la même base Supabase** (`supabase.madarisse.com`) et **reconstruit** l'interface + la couche
agent en Next.js / Google ADK.

Paradigme UX : **Cockpit-first + assistant**. L'UI classique est la source de vérité et la couche de
contrôle. L'agent amplifie sans contourner.

---

## 2. Flux de données global

```
Utilisateur (secrétariat / directeur)
        │
        ▼
┌─────────────────────────────────────────┐
│  Next.js App Router  (apps/web)         │
│  ┌──────────────────┐ ┌───────────────┐ │
│  │  Cockpit (CRUD)  │ │ Assistant ⌘K  │ │
│  │  pages/modules   │ │ Vercel AI SDK │ │
│  │  TanStack Query  │ │ streaming RSC │ │
│  └────────┬─────────┘ └──────┬────────┘ │
│           │ Supabase JS       │ API route│
└───────────┼───────────────────┼──────────┘
            │                   │
            ▼                   ▼
┌───────────────────┐  ┌──────────────────────────────┐
│  Supabase         │  │  Agent Service (services/agent)│
│  Postgres + RLS   │  │  FastAPI + Google ADK          │
│  pgvector         │  │  LiteLLM router                │
│  Realtime + cron  │  │  FunctionTools (JWT user)      │
│  Edge functions   │  │  agent_action_logs             │
└───────────────────┘  └──────────────────────────────┘
        ▲                        │  JWT user (RLS hérité)
        └────────────────────────┘
```

### Règle JWT
- Le front transmet le **JWT Supabase de l'utilisateur** à l'agent service (header `Authorization: Bearer …`).
- L'agent instancie un client Supabase avec **ce JWT** → RLS appliqué automatiquement.
- `service_role` : uniquement pour les tâches système (cron, migrations) dans des contextes contrôlés.

---

## 3. Modules à porter (inventaire + priorité)

| # | Module | Complexité | Phase | Écrans clés |
|---|---|---|---|---|
| 1 | Onboarding tenant | M | 1 | Création école, année scolaire, classes, types de frais |
| 2 | Élèves | M | 1 | Liste, fiche, ajout/édition, import CSV |
| 3 | Inscriptions | H | 1 | Création, validation, statuts, échéanciers auto |
| 4 | Paiements | H | 1 | Encaissements, échéancier, historique, reçus |
| 5 | Comptabilité | M | 2 | Transactions, catégories, évolution mensuelle |
| 6 | Reporting | M | 2 | Dashboards KPIs, taux recouvrement, impayés |
| 7 | Paramètres | L | 2 | École, modes de paiement, AI config |
| 8 | Ambiant / QA | M | 3 | Briefing, anomalies, relances adaptatives |
| 9 | Présences | M | 4 | Saisie, rapports |
| 10 | Devoirs | M | 4 | Création, suivi |
| 11 | Notes / Bulletins | H | 4 | Saisie, génération bulletins |
| 12 | Calendrier | M | 4 | Événements, permissions |
| 13 | Messagerie | M | 4 | Conversations, notifications |
| 14 | Mobile parents | H | 4 | App Expo (phase distincte) |
| 15 | SuperAdmin | L | 4 | Gestion tenants plateforme |

**Phase 0** : shell cockpit + assistant minimal (1 tool read-only).

---

## 4. Couche agent — détail

### 4.1 Google ADK
- **Multi-agent** : un agent orchestrateur (`SchoolAgent`) délègue aux agents spécialisés (paiements, inscriptions, reporting, QA).
- **Sessions** : ADK gère la mémoire de session par utilisateur/tenant.
- **Evals** : `google.adk.evaluation` pour tester la sélection de tools et la non-hallucination.

### 4.2 LiteLLM (routage multi-modèle)
- **Flash** (Gemini 2.0 Flash) → intent classification, tâches simples, tri.
- **Pro** (Gemini 2.5 Pro ou Claude Opus) → raisonnement complexe, rédaction (relances), décisions multi-étapes.
- Fallback automatique + budget token par tenant via `tenant_ai_quotas`.

### 4.3 FunctionTools → Supabase
```python
# Exemple tool lecture (RLS hérité via JWT user)
@tool
def get_unpaid_students(class_id: str, ctx: AgentContext) -> list[dict]:
    """Retourne les élèves avec impayés pour une classe donnée."""
    supabase = create_client_with_jwt(ctx.user_jwt)
    result = supabase.rpc("get_payment_schedules_with_stats",
                          {"p_class_id": class_id}).execute()
    return result.data
```

### 4.4 Human-in-the-loop (HITL)
Toute écriture sensible suit le pattern :
1. L'agent génère un **canvas** (composant React dans le fil de chat) décrivant l'action avec son impact.
2. L'utilisateur clique **Valider** ou **Annuler**.
3. Sur validation, le front appelle une API route sécurisée qui exécute la RPC.
4. L'action est enregistrée dans `agent_action_logs` (who, what, when, before/after snapshot).

---

## 5. Nouvelles tables DB (db/migrations/)

### `agent_action_logs`
```sql
CREATE TABLE agent_action_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  user_id      UUID NOT NULL,                 -- l'humain qui a validé
  agent_id     TEXT NOT NULL,                 -- quel agent a proposé
  action_type  TEXT NOT NULL,                 -- 'enrollment.create', 'payment.record', etc.
  payload      JSONB,                         -- paramètres de l'action
  snapshot_before JSONB,                      -- état avant (réversibilité)
  snapshot_after  JSONB,                      -- état après
  status       TEXT DEFAULT 'pending',        -- pending | confirmed | cancelled | failed
  confirmed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);
-- RLS : tenant_id = auth.jwt()->'user_metadata'->>'tenant_id'
```

### Extension pgvector (RAG)
```sql
CREATE EXTENSION IF NOT EXISTS vector;
-- Table pour la mémoire sémantique (recherche élèves, docs école, historique agent)
CREATE TABLE agent_memory (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL,
  content    TEXT NOT NULL,
  embedding  vector(1536),
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. Modèle de sécurité

| Niveau | Mécanisme |
|---|---|
| Authentification | Supabase Auth (JWT) — identique à l'app actuelle |
| Autorisation data | RLS Postgres — le client Supabase agent utilise le JWT user |
| Isolation tenant | Toutes les tables ont `tenant_id` ; les tools vérifient la cohérence |
| Écriture sensible | HITL obligatoire + `agent_action_logs` |
| RAG/mémoire | Filtrage strict `tenant_id` dans les requêtes vectorielles |
| Conformité | CNDP Loi 09-08 + RGPD : pas d'agent parent-facing avant audit juridique |
| Secrets | Variables d'env Coolify, jamais dans le code ou les logs |

---

## 7. Coûts LLM estimés (par interaction)

| Scénario | Modèle | Tokens estimés | Coût approx. |
|---|---|---|---|
| Question read-only | Gemini Flash | ~2k | ~$0.0002 |
| CRUD assisté (canvas) | Gemini Pro | ~5k | ~$0.005 |
| Rapport cross-module | Gemini Pro | ~8k | ~$0.008 |
| Briefing ambiant | Gemini Flash | ~3k | ~$0.0003 |

Budget quota par tenant configurable dans `tenant_ai_quotas` (existant).

---

## 8. Risques et mitigations

| Risque | Mitigation |
|---|---|
| Hallucination agent sur données financières | HITL obligatoire + affichage des données source dans le canvas |
| Latence > 3s sur interactions agent | Flash pour l'intent, streaming RSC, cache Supabase |
| Fuite inter-tenant dans tools | Filtre `tenant_id` systématique + test isolation en CI |
| Rupture de parité avec l'app actuelle | Cutover module par module, ancienne app en secours |
| Coût LLM dérapant | Quotas `tenant_ai_quotas` + alertes LiteLLM |
| Données mineurs | Pas d'agent parent-facing avant audit CNDP/RGPD |
