# Feature Specification: Paiements — Encaissement, suivi et rapport financier

**Feature Branch**: `004-paiements`  
**Created**: 2026-07-09  
**Status**: Draft  

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultation de l'état des paiements d'un élève (Priority: P1)

Le secrétariat consulte l'état des paiements d'un élève : échéancier complet, montants payés, montants dus, échéances en retard, historique des encaissements.

**Why this priority** : La consultation précède toujours l'encaissement — le secrétariat vérifie l'état avant d'enregistrer un paiement. C'est aussi la réponse à la question la plus fréquente des parents (« qu'est-ce qu'il reste à payer ? »).

**Independent Test** : Peut être testé en affichant l'état des paiements d'un élève avec un échéancier existant et en vérifiant que les montants affichés correspondent aux données en base.

**Acceptance Scenarios** :

1. **Given** un élève avec une inscription confirmée et un échéancier, **When** le secrétariat ouvre son état de paiement, **Then** il voit l'échéancier complet avec pour chaque ligne : date d'échéance, montant, statut (payé/dû/en retard) et mode de paiement si réglé.
2. **Given** un élève avec des paiements en retard, **When** le secrétariat consulte son état, **Then** les retards sont mis en évidence visuellement avec le nombre de jours de retard.
3. **Given** un directeur qui consulte l'état des paiements d'une classe entière, **When** il accède à la vue classe, **Then** il voit un récapitulatif (total attendu, encaissé, en retard) avec la liste des élèves défaillants.

---

### User Story 2 - Encaissement d'un paiement via le cockpit (Priority: P1)

Le secrétariat enregistre un paiement (montant, date, mode : espèces/virement/chèque) sur un élève spécifique, en associant le paiement à une ou plusieurs échéances.

**Why this priority** : Action quotidienne — chaque encaissement doit être tracé immédiatement pour maintenir un état comptable à jour et éviter les doubles enregistrements.

**Independent Test** : Peut être testé en enregistrant un paiement sur une échéance en attente et en vérifiant que l'échéance passe à « payé » et que le solde restant est mis à jour.

**Acceptance Scenarios** :

1. **Given** un élève avec des échéances en attente, **When** le secrétariat saisit un paiement (montant, date, mode), **Then** le paiement est associé aux échéances correspondantes, le statut de chaque échéance réglée passe à « payé », et un reçu peut être généré.
2. **Given** un paiement partiel (montant inférieur à une échéance), **When** le secrétariat l'enregistre, **Then** l'échéance est partiellement soldée et le reliquat reste visible comme « en attente ».
3. **Given** un paiement en double (même montant, même date, même élève), **When** le système détecte la suspicion de doublon, **Then** une alerte est affichée et une confirmation est demandée avant enregistrement.

---

### User Story 3 - Encaissement assisté par l'agent (HITL) (Priority: P1)

Le secrétariat dicte un paiement à l'assistant (« Yassine a payé 1500 en espèces ») et valide l'enregistrement sur un canvas de confirmation.

**Why this priority** : Aligné avec l'objectif de déléguer les opérations répétitives à l'assistant. Même priorité que l'US2 cockpit car les deux canaux doivent coexister dès le lancement.

**Independent Test** : Peut être testé en dictant un paiement à l'agent, en validant le canvas, et en vérifiant que le paiement est enregistré et tracé dans `agent_action_logs`.

**Acceptance Scenarios** :

1. **Given** une demande en langage naturel pour enregistrer un paiement, **When** l'agent identifie l'élève et le montant, **Then** il affiche un canvas (élève, montant, date, mode, échéance(s) impactée(s)) avant toute écriture.
2. **Given** un canvas de confirmation affiché, **When** le secrétariat valide, **Then** le paiement est créé, l'échéance mise à jour, et l'action tracée dans `agent_action_logs` avec snapshot avant/après.
3. **Given** un canvas de confirmation affiché, **When** le secrétariat annule, **Then** aucune écriture n'est effectuée.

---

### User Story 4 - Rapport de recouvrement (Priority: P2)

Le directeur interroge l'assistant ou accède à un écran de reporting pour connaître le taux de recouvrement par classe, par mois, avec identification des élèves défaillants.

**Why this priority** : Pilotage stratégique — le directeur doit voir la santé financière de l'école sans dépendre du secrétariat. Dépend des US1/US2 (les données paiements doivent exister).

**Independent Test** : Peut être testé en demandant « quel est le taux de recouvrement de la 6ème A ce mois-ci ? » et en vérifiant que le résultat correspond aux données calculées.

**Acceptance Scenarios** :

1. **Given** des données de paiement pour une classe et un mois, **When** le directeur pose la question à l'assistant, **Then** il reçoit : montant attendu, montant encaissé, taux de recouvrement, liste des élèves en retard.
2. **Given** une liste d'élèves défaillants retournée par l'agent, **When** le directeur le demande, **Then** l'agent propose de préparer un brouillon de relance (sans l'envoyer sans confirmation).
3. **Given** un accès à l'écran de reporting cockpit, **When** le directeur sélectionne une classe et une période, **Then** les KPIs financiers sont affichés sous forme de tableaux et graphiques.

---

### Edge Cases

- Que se passe-t-il si un paiement est enregistré sur un élève sans inscription confirmée ? → Le système bloque avec un message indiquant qu'une inscription confirmée est requise.
- Que se passe-t-il si le montant payé dépasse le total dû (trop-perçu) ? → Avertissement affiché, l'excédent est signalé et tracé.
- Que se passe-t-il si l'agent ne retrouve pas l'élève mentionné pour un paiement ? → Il demande une précision et liste les candidats proches.
- Que se passe-t-il si le mode de paiement n'est pas mentionné ? → L'agent suppose « espèces » par défaut et l'affiche dans le canvas pour validation.
- Que se passe-t-il si un paiement doit être annulé/corrigé ? → Un responsable peut annuler et re-saisir ; l'annulation est tracée dans l'audit trail.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** : Le système DOIT afficher l'état de paiement complet d'un élève (échéancier, statuts, historique des encaissements).
- **FR-002** : Le système DOIT permettre d'enregistrer un paiement (montant, date, mode : espèces/virement/chèque) et de l'associer à une ou plusieurs échéances.
- **FR-003** : Le système DOIT gérer les paiements partiels (mise à jour du reliquat sur l'échéance).
- **FR-004** : Le système DOIT détecter les paiements suspects en doublon et demander confirmation.
- **FR-005** : L'agent DOIT proposer un encaissement via canvas HITL — aucune écriture sans validation humaine.
- **FR-006** : Toute écriture paiement via agent DOIT être tracée dans `agent_action_logs` avec snapshot.
- **FR-007** : Le système DOIT bloquer l'enregistrement d'un paiement si l'élève n'a pas d'inscription confirmée.
- **FR-008** : L'agent DOIT pouvoir calculer et restituer le taux de recouvrement par classe et par période (lecture seule).
- **FR-009** : L'écran de reporting DOIT présenter : total attendu, encaissé, en retard, par classe et par mois.
- **FR-010** : Tous les montants DOIT être affichés en MAD.
- **FR-011** : Le système DOIT avertir en cas de trop-perçu (paiement > solde dû).

### Key Entities

- **Paiement** : Transaction financière — montant, date, mode, élève, liste d'échéances imputées.
- **Échéance** : Ligne d'échéancier — date, montant, statut (à payer/payé/en retard/partiellement payé), lié à une inscription.
- **Rapport de recouvrement** : Agrégat par classe/période — total attendu, encaissé, taux, liste défaillants.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** : L'état de paiement d'un élève s'affiche en moins de 500ms.
- **SC-002** : L'enregistrement d'un paiement via le cockpit prend moins de 1 minute.
- **SC-003** : 100% des paiements enregistrés via agent sont tracés dans `agent_action_logs`.
- **SC-004** : Zéro paiement enregistré sans confirmation humaine lorsque l'agent est impliqué.
- **SC-005** : Le rapport de recouvrement d'une classe (12 mois) est généré en moins de 3 secondes.
- **SC-006** : 100% des trop-perçus détectés et signalés avant enregistrement.
