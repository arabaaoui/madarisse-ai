# madarisse-ai

> **School OS agentique multi-tenant** — remplace `ecole-muret` avec un cockpit opérationnel complet + assistant IA omniprésent.

## Ce que c'est

Application de gestion scolaire **cockpit-first + agent-native** :

- **Cockpit (UI classique)** : tous les modules opérationnels (Élèves, Inscriptions, Paiements, Comptabilité, Reporting…) avec CRUD complet, tableaux, formulaires, dashboards.
- **Assistant ⌘K** : copilote omniprésent qui pré-remplit les formulaires (canvas), exécute les actions après validation humaine (HITL), et répond aux questions cross-module en langage naturel.
- **Ambiant** : briefings proactifs, détection d'anomalies, relances adaptatives.

**Même Supabase** que l'app actuelle — la donnée ne migre pas, on reconstruit l'interface.

## Stack

| Couche | Techno |
|---|---|
| Front | Next.js App Router + shadcn/ui + Vercel AI SDK |
| Agents | Google ADK (Python) + FastAPI + LiteLLM |
| Données | Supabase (Postgres + RLS + pgvector) |
| Déploiement | Docker + Coolify (self-host VPS) |

## Structure

```
madarisse-ai/
  apps/web/          # Next.js — cockpit + assistant
  services/agent/    # Python ADK + FastAPI
  services/mcp/      # Serveur MCP (phase 2+)
  packages/shared/   # Types Supabase, schémas zod
  db/migrations/     # Nouvelles migrations agent
  docs/              # study/, prd/, adr/
  specs/             # Spec Kit features
  infra/             # Docker, Coolify
```

## Démarrage local

```bash
# Copier les variables d'environnement
cp .env.example .env
# (remplir les clés)

# Front
cd apps/web && npm install && npm run dev

# Agent
cd services/agent && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn main:app --reload --port 8001

# Docker (tout en une commande)
docker-compose -f infra/compose/docker-compose.yml up
```

## Phases

- **Phase 0** — Walking skeleton : auth + shell cockpit + assistant + 1 tool read-only (RLS prouvé)
- **Phase 1** — Cœur opérationnel : Élèves, Inscriptions, Paiements (cockpit + assistant HITL)
- **Phase 2** — Comptabilité, Reporting, MCP
- **Phase 3** — Ambiant, QA anomalies
- **Phase 4** — Parité complète + cutover (couper l'ancienne app)

## Sécurité

- L'agent agit avec le **JWT de l'utilisateur final** (RLS hérité)
- `service_role` réservé aux tâches système contrôlées
- Écritures sensibles = **HITL** + `agent_action_logs`
- Isolation multi-tenant stricte (tools/RAG/mémoire)
- CNDP Loi 09-08 + RGPD (données de mineurs)
