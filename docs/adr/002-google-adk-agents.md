# ADR 002 — Google ADK (Python) pour le runtime agent

**Date :** 2026-07-09  
**Statut :** Accepté

## Contexte
On a besoin d'un framework pour orchestrer des agents multi-étapes capables d'appeler des tools
(Supabase RPC), de gérer des sessions, et de supporter HITL (pause avant confirmation).
Le stack agent doit être indépendant du front (service séparé).

## Décision
**Google Agent Development Kit (ADK) — Python**, exposé via **FastAPI**.

## Raisons
- **Multi-agent natif** : ADK supporte l'orchestration (agent racine → agents spécialisés), idéal pour séparer les domaines (paiements, inscriptions, reporting, QA).
- **FunctionTools Python** : wrapping direct des appels Supabase (client Python + JWT user).
- **Sessions et mémoire** : ADK gère l'état de session par utilisateur nativement.
- **ADK Evaluation** : framework d'eval intégré pour tester les scénarios agent en CI.
- **HITL** : le cycle `propose → pause → confirm → execute` est un pattern ADK standard.
- **FastAPI** : API async Python avec validation Pydantic, facilement dockerisable, compatible Coolify.
- **LiteLLM** s'intègre dans ADK via le paramètre `model` (n'importe quel provider).

## Alternatives rejetées
- **LangGraph** : plus mature mais plus verbeux ; ADK est plus idiomatique pour les workflows multi-agent déclaratifs.
- **CrewAI** : orienté "rôles d'équipe", moins adapté à un agent opérationnel mono-utilisateur avec HITL.
- **Node.js Mastra/Vercel AI SDK agents** : cohérent avec le front mais Python est plus naturel pour l'écosystème ML/eval.

## Conséquences
- Service Python séparé (`services/agent/`) avec son propre Docker, ses propres tests pytest.
- Communication Next.js → Agent : HTTP/JSON (API route BFF → FastAPI). Pas de gRPC pour l'instant.
- Streaming : FastAPI Server-Sent Events → Next.js `ReadableStream` → Vercel AI SDK `useChat`.
