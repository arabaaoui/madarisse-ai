# Feature Specification: Inscriptions — Inscription, validation et renouvellement

**Feature Branch**: `003-inscriptions`  
**Created**: 2026-07-09  
**Status**: Draft  

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inscription d'un élève avec génération d'échéancier (Priority: P1)

Le secrétariat inscrit un élève existant dans une classe pour l'année scolaire en cours. Le système génère automatiquement l'échéancier de paiement basé sur les frais de la classe. L'inscription est d'abord créée avec le statut « en attente » jusqu'à validation.

**Why this priority** : C'est l'acte fondamental de la gestion scolaire — sans inscription, pas de paiement ni de suivi. Toutes les fonctions de recouvrement dépendent de ce flux.

**Independent Test** : Peut être testé en inscrivant un élève, en vérifiant que son échéancier est généré correctement et que son statut est « en attente ».

**Acceptance Scenarios** :

1. **Given** un élève existant et une classe avec frais configurés, **When** le secrétariat crée une inscription, **Then** l'inscription est enregistrée avec statut « en attente » et un échéancier prévisionnel est généré (frais inscription + mensualités).
2. **Given** une inscription en attente, **When** le secrétariat la valide, **Then** le statut passe à « confirmé », l'échéancier devient définitif et est visible dans le module paiements.
3. **Given** une inscription déjà existante pour un élève dans une même année scolaire, **When** le secrétariat tente une deuxième inscription dans une autre classe, **Then** le système avertit et demande confirmation (changement de classe possible).

---

### User Story 2 - Validation en masse des inscriptions en attente (Priority: P1)

Le secrétariat peut valider plusieurs inscriptions en attente d'un seul geste (filtrage par date, classe ou lot), pour traiter efficacement les journées de forte activité (rentrée scolaire).

**Why this priority** : En période de rentrée, des dizaines d'inscriptions arrivent simultanément. La validation unitaire serait trop lente — la validation en masse est critique pour l'opérationnel.

**Independent Test** : Peut être testé en créant 10 inscriptions en attente, puis en les validant toutes en une seule action, et en vérifiant que les 10 statuts passent à « confirmé ».

**Acceptance Scenarios** :

1. **Given** plusieurs inscriptions en attente, **When** le secrétariat sélectionne un groupe et clique sur « Valider tout », **Then** une confirmation lui est demandée avec la liste des inscriptions concernées avant exécution.
2. **Given** une confirmation de validation en masse, **When** le secrétariat confirme, **Then** toutes les inscriptions passent à « confirmé », les échéanciers sont générés et l'action est tracée dans l'audit trail.
3. **Given** une validation en masse avec une inscription qui a une anomalie (ex. frais manquants), **When** l'anomalie est détectée, **Then** l'inscription concernée est exclue et signalée, les autres sont validées normalement.

---

### User Story 3 - Inscription assistée par l'agent (HITL) (Priority: P1)

Le secrétariat peut dicter une inscription en langage naturel à l'assistant (« inscris Yassine en 6ème A, frais inscription 1500, scolarité 800/mois ») et valider l'action sur un canvas de confirmation avant toute écriture.

**Why this priority** : C'est la démonstration principale de la valeur agent — déléguer la saisie à l'assistant tout en gardant le contrôle humain. Aligne avec l'objectif KPI de 30% d'inscriptions via assistant.

**Independent Test** : Peut être testé en dictant une inscription à l'assistant, en vérifiant le canvas de confirmation, puis en validant et en contrôlant que l'inscription et l'audit log sont correctement créés.

**Acceptance Scenarios** :

1. **Given** une demande en langage naturel pour inscrire un élève, **When** l'agent identifie l'élève et la classe (avec fuzzy search), **Then** il affiche un canvas structuré (élève, classe, frais, récapitulatif échéancier) avant toute écriture.
2. **Given** un canvas de confirmation affiché, **When** le secrétariat clique sur « Valider », **Then** l'inscription est créée, l'action est enregistrée dans `agent_action_logs` avec le snapshot avant/après.
3. **Given** un canvas de confirmation affiché, **When** le secrétariat clique sur « Annuler », **Then** aucune écriture n'est effectuée et l'action est annulée proprement.
4. **Given** un nom d'élève ambigu qui correspond à plusieurs résultats, **When** l'agent détecte l'ambiguïté, **Then** il présente les candidats et demande confirmation avant de procéder.

---

### Edge Cases

- Que se passe-t-il si un élève est inscrit dans une classe qui a atteint sa capacité maximale ? → Avertissement affiché, inscription bloquée sauf confirmation explicite du directeur.
- Que se passe-t-il si les frais d'une classe changent après la création d'une inscription en attente ? → L'inscription conserve les frais au moment de sa création, une note signale la divergence.
- Que se passe-t-il si l'agent ne retrouve pas l'élève mentionné ? → Il informe le secrétariat et propose de le créer ou de préciser le nom.
- Que se passe-t-il si la validation en masse est interrompue (panne réseau) ? → Les inscriptions déjà validées restent confirmées, les autres restent en attente — pas d'état intermédiaire incohérent.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** : Le système DOIT permettre de créer une inscription pour un élève existant dans une classe existante.
- **FR-002** : Le système DOIT générer automatiquement un échéancier de paiement basé sur les frais de la classe (frais inscription + mensualités sur la durée de l'année).
- **FR-003** : Le système DOIT gérer les statuts d'inscription : `en_attente` → `confirmé` (irréversible sauf annulation explicite).
- **FR-004** : Le système DOIT permettre la validation unitaire et en masse des inscriptions en attente.
- **FR-005** : La validation en masse DOIT afficher une liste récapitulative et demander confirmation avant exécution.
- **FR-006** : L'agent DOIT proposer une inscription via un canvas de confirmation (HITL) — aucune écriture sans validation humaine.
- **FR-007** : L'agent DOIT utiliser la recherche floue pour retrouver élève et classe à partir de mentions en langage naturel.
- **FR-008** : Toute écriture via agent (inscription créée, validée) DOIT être enregistrée dans `agent_action_logs` avec snapshot avant/après.
- **FR-009** : Le système DOIT détecter les doublons d'inscription (même élève, même classe, même année) et avertir avant enregistrement.
- **FR-010** : Le système DOIT avertir lorsqu'une classe a atteint sa capacité maximale.

### Key Entities

- **Inscription** : Lien entre un élève et une classe pour une année scolaire — statut, frais appliqués, date de création/validation.
- **Échéancier** : Ensemble des échéances de paiement générées à partir d'une inscription confirmée — date d'échéance, montant, statut (à payer/payé/en retard).
- **Action log** : Trace d'audit des actions agent — type d'action, snapshot avant/après, utilisateur, timestamp.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** : La création d'une inscription via le cockpit prend moins de 1 minute pour le secrétariat.
- **SC-002** : La validation en masse de 20 inscriptions prend moins de 10 secondes.
- **SC-003** : 100% des inscriptions créées via agent sont tracées dans `agent_action_logs`.
- **SC-004** : Zéro inscription créée sans confirmation explicite de l'humain lorsque l'agent est impliqué (HITL à 100%).
- **SC-005** : L'échéancier généré est exact à 100% par rapport aux frais configurés (testé unitairement).
- **SC-006** : Objectif KPI : 30% des inscriptions réalisées via l'assistant (mesuré en production).
