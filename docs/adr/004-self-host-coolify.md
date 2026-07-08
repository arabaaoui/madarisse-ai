# ADR 004 — Self-host VPS + Coolify

**Date :** 2026-07-09  
**Statut :** Accepté

## Contexte
On doit choisir la stratégie d'hébergement. Contraintes : données scolaires marocaines (CNDP Loi 09-08),
coût maîtrisé, même VPS que l'infra actuelle (`84.247.164.211`), continuité opérationnelle.

## Décision
**Self-host sur VPS existant avec Coolify** (comme l'app actuelle).

## Raisons
- **Résidence des données** : la donnée Supabase reste sur le même VPS → conformité CNDP sans discussion.
- **Continuité** : même infra, même équipe ops, même pipeline Coolify déjà maîtrisé.
- **Coût** : pas de surcoût cloud (pas de Vercel, pas de GCP Cloud Run) — seul le VPS existant.
- **Contrôle** : LiteLLM, agent service, et le front Next.js tournent tous en Docker sur le même serveur.
- **Secrets** : variables d'env Coolify chiffrées, pas de vault externe nécessaire.

## Architecture de déploiement Coolify
```
VPS 84.247.164.211
├── Supabase (déjà déployé)
├── [NEW] madarisse-ai-web    (Next.js, port 3000 → nginx reverse proxy)
├── [NEW] madarisse-ai-agent  (FastAPI/ADK, port 8001, interne uniquement)
├── [NEW] madarisse-ai-litellm (LiteLLM proxy, port 4000, interne uniquement)
└── ecole-muret               (app actuelle, en parallèle pendant la transition)
```

## Conséquences
- 3 apps Coolify à créer (web, agent, litellm).
- Secrets partagés entre apps via variables d'env Coolify (pas de fichiers `.env` en prod).
- Le service agent (port 8001) et LiteLLM (port 4000) ne sont pas exposés publiquement — accessibles uniquement depuis le front Next.js via réseau Docker interne.
- Migrations DB : appliquées via `pg-meta` (`https://supabase.madarisse.com/pg/query`) comme pour l'app actuelle.
