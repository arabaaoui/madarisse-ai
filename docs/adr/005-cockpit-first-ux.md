# ADR 005 — Paradigme UX : Cockpit-first + assistant

**Date :** 2026-07-09  
**Statut :** Accepté (validé par l'utilisateur)

## Contexte
Trois paradigmes possibles pour intégrer l'IA dans l'interface :
1. Cockpit-first + assistant (replié, ouvert par ⌘K)
2. Hybride équilibré (cockpit + assistant côte à côte en permanence)
3. Assistant-first (chat central, formulaires en canvas)

## Décision
**Cockpit-first + assistant** (option 1, choisie par l'utilisateur).

## Raisons
- **Adoption** : le secrétariat reconnaît l'interface (sidebar, modules, tableaux) — courbe d'apprentissage nulle pour les workflows existants.
- **Remplacement sûr** : on ne perd rien de l'app actuelle. Parité fonctionnelle dès Phase 1.
- **Flexibilité** : l'assistant est omniprésent mais non-intrusif. On l'ouvre quand on en a besoin.
- **Confiance progressive** : les utilisateurs validant les actions de l'agent *dans* les formulaires qu'ils connaissent → confiance plus naturelle que des canvas purement conversationnels.
- **Cutover graduel** : les utilisateurs peuvent passer module par module, l'assistant restant optionnel.

## Implémentation
- Layout Next.js App Router : sidebar (modules) + zone centrale (cockpit) + panneau droit (assistant, repliable).
- Panneau assistant : `<Sheet>` ou `<Drawer>` shadcn, persistant en session, ouvert/fermé par ⌘K.
- L'agent agit **sur l'écran actif** : sait quel module est ouvert, peut injecter des données dans le tableau ou pré-remplir le formulaire courant.
- **Canvas** : composants shadcn rendus dans le fil de chat (via generative UI SDK), pas du texte. Boutons Valider/Annuler déclenchent les API routes.

## Conséquences
- Le panneau assistant est un composant global, pas module-spécifique.
- Le contexte de l'écran actif est passé à chaque requête agent (module courant, filtres actifs, sélection courante).
- Les canvas sont des composants React typés (zod) exportés depuis `packages/shared`.
