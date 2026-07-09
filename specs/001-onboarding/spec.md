# Feature Specification: Onboarding — Création d'école from scratch

**Feature Branch**: `001-onboarding`  
**Created**: 2026-07-09  
**Status**: Draft  

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configuration initiale de l'établissement (Priority: P1)

Un directeur qui ouvre madarisse-ai pour la première fois doit pouvoir créer son établissement scolaire complet — identité, année scolaire, classes et grille tarifaire — sans aide technique, en moins de 15 minutes, pour être immédiatement opérationnel.

**Why this priority** : Sans cette étape, aucune autre fonctionnalité n'est utilisable. C'est le prérequis absolu à toute inscription ou paiement.

**Independent Test** : Peut être testé de bout en bout par un directeur qui commence avec un compte vide et termine avec une école configurée depuis laquelle un premier élève peut être inscrit.

**Acceptance Scenarios** :

1. **Given** un compte directeur sans école configurée, **When** il complète le wizard d'onboarding (nom, adresse, logo, année, classes, frais), **Then** un établissement actif est créé avec un identifiant unique, une année scolaire en cours, et au moins une classe tarifée.
2. **Given** un wizard en cours de remplissage, **When** le directeur quitte et revient plus tard, **Then** sa progression est sauvegardée et il reprend là où il s'est arrêté.
3. **Given** une étape du wizard avec une erreur de saisie (ex. dates incohérentes), **When** le directeur tente de passer à l'étape suivante, **Then** une explication claire est affichée et la progression est bloquée jusqu'à correction.

---

### User Story 2 - Configuration assistée par l'agent conversationnel (Priority: P2)

En alternative au wizard classique, le directeur peut décrire son école en langage naturel (« j'ai 3 classes de collège, les frais d'inscription sont 1500 MAD et la scolarité 800 MAD par mois ») et laisser l'agent structurer automatiquement la configuration, en lui soumettant chaque décision pour validation avant enregistrement.

**Why this priority** : Réduit la friction pour les directeurs non habitués aux formulaires ; illustre la valeur différenciante de madarisse-ai. Second après le wizard classique qui assure la couverture universelle.

**Independent Test** : Peut être testé par un directeur qui tape une description libre de son école et termine avec la même configuration qu'en US1, sans remplir manuellement les champs.

**Acceptance Scenarios** :

1. **Given** un directeur qui décrit son école en langage naturel, **When** l'agent extrait les entités (nom, classes, frais), **Then** il affiche un récapitulatif structuré pour validation avant de créer quoi que ce soit.
2. **Given** une description ambiguë (ex. « j'ai des classes de primaire »), **When** l'agent ne peut pas inférer le nombre ou le nom des classes, **Then** il pose une question ciblée plutôt que de faire une supposition.
3. **Given** le directeur valide le récapitulatif, **When** l'agent crée la configuration, **Then** chaque action est confirmée visuellement et tracée dans l'audit trail.

---

### User Story 3 - Import initial des élèves existants (Priority: P3)

Après avoir configuré l'école, le directeur ou secrétariat peut importer une liste d'élèves existants depuis un fichier CSV pour peupler la base sans saisie manuelle.

**Why this priority** : Accélère l'adoption pour les écoles qui passent d'un autre système. Dépend des US1/US2 (l'école et les classes doivent exister).

**Independent Test** : Peut être testé en chargeant un fichier CSV de 50 élèves avec des erreurs délibérées, et en vérifiant que seuls les élèves valides sont importés après confirmation.

**Acceptance Scenarios** :

1. **Given** un fichier CSV avec des colonnes (nom, prénom, classe, email parent), **When** le fichier est chargé, **Then** l'agent propose un mapping des colonnes et liste les erreurs ligne par ligne avant import.
2. **Given** un fichier avec plus de 20% de lignes en erreur, **When** le système détecte ce seuil, **Then** il demande une confirmation explicite avant de continuer l'import partiel.
3. **Given** un import réussi de 50 élèves, **When** l'import est terminé, **Then** tous les élèves apparaissent dans la liste avec le statut « à inscrire » et aucune donnée cross-tenant n'est affectée.

---

### Edge Cases

- Que se passe-t-il si le nom d'école est déjà pris ? → Un slug unique est généré automatiquement (ex. `ecole-du-rif-2`).
- Que se passe-t-il si le directeur crée deux années scolaires qui se chevauchent ? → Validation bloquante avec message explicatif.
- Que se passe-t-il si le CSV contient des colonnes inconnues ? → Elles sont ignorées, un avertissement est affiché.
- Que se passe-t-il si le CSV contient des élèves déjà existants (même nom + prénom + classe) ? → Doublons détectés et signalés, import stoppé pour les doublons.
- Que se passe-t-il si l'agent crée une configuration erronée ? → Le directeur peut annuler toute action avant validation, aucune écriture sans confirmation.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** : Le système DOIT créer un établissement avec un identifiant unique (slug) à partir du nom.
- **FR-002** : Le système DOIT permettre de définir une année scolaire active (dates début/fin, pas de chevauchement).
- **FR-003** : Le système DOIT permettre de créer au moins une classe (nom, niveau, capacité maximale).
- **FR-004** : Le système DOIT permettre de configurer des types de frais (inscription, scolarité mensuelle/semestrielle) par classe.
- **FR-005** : Le système DOIT sauvegarder la progression du wizard à chaque étape pour permettre une reprise.
- **FR-006** : Le système DOIT afficher une validation explicite avant toute création d'entité via l'agent conversationnel.
- **FR-007** : Le système DOIT isoler chaque établissement dans son propre espace de données (aucune visibilité cross-tenant).
- **FR-008** : L'agent conversationnel DOIT poser des questions de clarification en cas d'ambiguïté plutôt que de supposer.
- **FR-009** : L'import CSV DOIT signaler les erreurs ligne par ligne avant d'exécuter l'import.
- **FR-010** : L'import CSV DOIT demander confirmation si le taux d'erreurs dépasse 20%.
- **FR-011** : Chaque action de l'agent (création entité) DOIT être tracée dans l'audit trail.
- **FR-012** : Le wizard DOIT être complétable en moins de 15 minutes pour une configuration standard (1 année, 3 classes, 2 types de frais).

### Key Entities

- **Établissement (Tenant)** : L'école — nom, adresse, logo, slug unique. Contient toutes les données isolées.
- **Année scolaire** : Période avec dates début/fin et statut actif. Un tenant peut avoir plusieurs années mais une seule active à la fois.
- **Classe** : Groupe d'élèves au sein d'une année scolaire — nom, niveau, capacité.
- **Type de frais** : Tarif associé à une classe — catégorie (inscription/scolarité), montant, périodicité.
- **Élève** : Personne physique — nom, prénom, date de naissance, contact parent. Appartient à un tenant.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** : Un directeur configure une école opérationnelle (tenant + année + 3 classes + frais) en moins de 15 minutes.
- **SC-002** : 100% d'isolation tenant — aucune donnée d'un établissement A n'est visible depuis l'établissement B (testé en CI).
- **SC-003** : L'import de 100 élèves (CSV valide) se termine en moins de 30 secondes.
- **SC-004** : Zéro écriture en base sans confirmation explicite lorsque l'agent est impliqué.
- **SC-005** : L'agent pose au plus 3 questions de clarification pour une description d'école standard.
- **SC-006** : 90% des directeurs en test pilote complètent l'onboarding sans aide externe.

---

## Assumptions

- Les tables métier (`tenants`, `academic_years`, `classes`, `fee_types`, `students`) existent déjà dans le Supabase partagé avec ecole-muret. Si certaines n'existent pas, une migration sera nécessaire.
- La gestion des comptes utilisateurs (création de compte directeur) est hors périmètre — Supabase Auth est supposé configuré.
- Le logo est stocké dans le storage Supabase existant.
- Le support bilingue FR/AR (RTL) est requis dès cette feature.
