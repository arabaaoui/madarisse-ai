# Feature Specification: Élèves — Gestion des dossiers élèves

**Feature Branch**: `002-eleves`  
**Created**: 2026-07-09  
**Status**: Draft  

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saisie manuelle d'un dossier élève (Priority: P1)

Le secrétariat doit pouvoir créer le dossier d'un élève (nom, prénom, date de naissance, classe, contact parent) via un formulaire pour constituer sa fiche individuelle et préparer son inscription.

**Why this priority** : Prérequis de toute inscription — un élève doit exister avant d'être inscrit. C'est l'action quotidienne la plus fréquente du secrétariat.

**Independent Test** : Peut être testé en créant un élève, puis en vérifiant qu'il apparaît dans la liste de recherche et qu'il n'est visible que depuis le tenant correct.

**Acceptance Scenarios** :

1. **Given** un secrétariat connecté sur son tenant, **When** il saisit un dossier élève complet, **Then** l'élève est créé avec le statut « à inscrire » et apparaît dans la liste avec ses informations.
2. **Given** un champ obligatoire manquant (ex. prénom), **When** le formulaire est soumis, **Then** une validation claire indique le champ manquant sans perdre les données déjà saisies.
3. **Given** un élève créé dans le tenant A, **When** un utilisateur du tenant B accède à la liste, **Then** l'élève du tenant A n'est pas visible.

---

### User Story 2 - Recherche et consultation de la fiche élève (Priority: P1)

Le secrétariat doit pouvoir retrouver un élève rapidement via une recherche (nom, prénom, classe) et consulter sa fiche 360° : informations personnelles, inscription active, état des paiements, historique.

**Why this priority** : La recherche d'élève est le point d'entrée de toutes les interactions quotidiennes (encaisser un paiement, vérifier un retard, répondre à une question parent).

**Independent Test** : Peut être testé en cherchant un élève par nom partiel et en vérifiant que sa fiche affiche ses données consolidées (inscription, paiements) sans requête supplémentaire.

**Acceptance Scenarios** :

1. **Given** une liste d'élèves existants, **When** le secrétariat tape les premières lettres d'un nom, **Then** les résultats filtrent en temps réel et l'élève correspondant apparaît en moins de 500ms.
2. **Given** un élève avec une inscription active et un échéancier de paiement, **When** le secrétariat ouvre sa fiche, **Then** il voit les informations personnelles, la classe, le statut d'inscription et l'état des paiements (payé, dû, en retard) sur une seule page.
3. **Given** une recherche sans résultat, **When** aucun élève ne correspond, **Then** un message clair invite à créer un nouvel élève ou à vérifier l'orthographe.

---

### User Story 3 - Alerte proactive sur les situations critiques (Priority: P2)

L'assistant doit pouvoir être interrogé sur les élèves en situation critique (retard de paiement, inscription incomplète) et fournir une liste priorisée avec des suggestions d'action.

**Why this priority** : Transforme un cockpit passif en outil de pilotage actif. Dépend de US1/US2 (les élèves et leurs données doivent exister).

**Independent Test** : Peut être testé en demandant « quels élèves ont un retard de paiement de plus de 30 jours ? » et en vérifiant que la liste retournée correspond exactement aux données en base.

**Acceptance Scenarios** :

1. **Given** des élèves avec des paiements en retard, **When** le secrétariat demande à l'assistant « qui n'a pas payé ce mois-ci ? », **Then** l'agent retourne une liste priorisée avec nom, classe et montant dû, en moins de 5 secondes.
2. **Given** une liste d'élèves retournée par l'agent, **When** le secrétariat clique sur un élève dans la réponse, **Then** il est redirigé directement vers la fiche de cet élève dans le cockpit.
3. **Given** une question hors périmètre (ex. notes de cours), **When** l'agent reçoit la question, **Then** il répond qu'il ne peut pas accéder à cette information (Phase 1 scope).

---

### Edge Cases

- Que se passe-t-il si deux élèves ont le même nom et prénom ? → La recherche retourne les deux, différenciés par date de naissance et classe.
- Que se passe-t-il si un élève est supprimé alors qu'il a une inscription active ? → La suppression est bloquée avec message explicatif.
- Que se passe-t-il si le contact parent n'a pas d'email ? → Le champ est facultatif, mais un avertissement signale l'absence pour les relances futures.
- Que se passe-t-il si la recherche contient des caractères arabes ? → La recherche fonctionne en FR et AR sans distinction.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** : Le système DOIT permettre de créer un dossier élève avec au minimum : nom, prénom, date de naissance, classe (si connue), contact parent (optionnel).
- **FR-002** : Le système DOIT valider les champs obligatoires avant enregistrement et conserver les données saisies en cas d'erreur.
- **FR-003** : Le système DOIT afficher une liste paginée des élèves, triée par ordre alphabétique, avec filtre par classe et statut.
- **FR-004** : Le système DOIT permettre une recherche par nom ou prénom partiel (min. 2 caractères) avec résultats en temps réel.
- **FR-005** : La fiche élève DOIT afficher : données personnelles, inscription active (classe, statut), résumé paiements (payé, dû, retard), historique des actions agent.
- **FR-006** : Le système DOIT isoler les données de chaque tenant (un élève n'est visible que depuis son établissement).
- **FR-007** : L'agent DOIT pouvoir être interrogé sur les situations critiques (retards de paiement, inscriptions incomplètes) en lecture seule.
- **FR-008** : Les réponses de l'agent en mode lecture DOIT contenir des liens cliquables vers les fiches concernées.
- **FR-009** : La suppression d'un élève avec inscription active DOIT être bloquée avec message explicatif.
- **FR-010** : La recherche DOIT fonctionner en français et en arabe.

### Key Entities

- **Élève** : Personne scolarisée — nom, prénom, date de naissance, genre, statut (à inscrire / inscrit / inactif), appartient à un tenant.
- **Contact parent** : Responsable légal — nom, téléphone, email. Lié à un ou plusieurs élèves.
- **Fiche 360** : Vue consolidée d'un élève — données personnelles + inscription active + état paiements + historique agent.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** : La liste des élèves d'une classe se charge en moins de 500ms (NF-01 du PRD).
- **SC-002** : La recherche par nom retourne des résultats en moins de 300ms pour un tenant de 1000 élèves.
- **SC-003** : 100% d'isolation tenant — vérifiée par test automatisé cross-tenant.
- **SC-004** : L'agent répond à une question de lecture sur les élèves en moins de 5 secondes (NF-03).
- **SC-005** : Le secrétariat crée un dossier élève complet en moins de 2 minutes.
