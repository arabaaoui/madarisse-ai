# ADR 001 — Next.js App Router pour le front cockpit + assistant

**Date :** 2026-07-09  
**Statut :** Accepté

## Contexte
Le front actuel (`ecole-muret`) est en React 18 + Vite. On reconstruit dans un nouveau repo.
On a besoin d'un framework qui supporte : SSR/RSC pour le cockpit, **streaming** pour l'assistant IA
(Vercel AI SDK), API routes comme BFF vers l'agent service, i18n FR/AR, shadcn/ui.

## Décision
**Next.js App Router** (Next.js 15, React 19).

## Raisons
- **Vercel AI SDK** (`ai` package) est conçu pour Next.js App Router : streaming RSC, `useChat`, `useCompletion`, generative UI out-of-the-box.
- **API routes** = BFF naturel : proxy JWT vers l'agent, validation zod, sans backend séparé pour les appels simples.
- **shadcn/ui** supporte Next.js nativement (portage direct depuis l'app actuelle).
- **Server Components** : les vues cockpit lourdes (listes, dashboards) peuvent être rendues serveur → performances.
- Cohérent avec l'écosystème Supabase (SSR helpers officiels).

## Conséquences
- Réécriture des composants React existants (Vite → Next.js App Router) : les composants shadcn/ui sont portables quasi à l'identique ; les hooks TanStack Query et les patterns de data-fetching changent légèrement.
- Layout imbriqués (App Router) pour le shell cockpit + le panneau assistant.
- Pas de CRA/Vite dans ce repo.
