# PRD — Phase 4 : Opérations Scolaires (Présences · Devoirs · Notes · Calendrier · Messagerie · SuperAdmin)

**Produit :** madarisse-ai  
**Scope :** Présences + Devoirs + Notes/Bulletins + Calendrier scolaire + Messagerie interne + SuperAdmin tenant  
**Date :** 2026-07-10  
**Statut :** Draft  
**Prérequis :** Phase 1 + Phase 2 + Phase 3 livrées  
**Note :** Application mobile parents — HORS PÉRIMÈTRE (décision produit)

---

## 1. Personas

### Enseignant
- **Qui :** Professeur de l'établissement, 1 à N par école.
- **Objectif :** Saisir les présences, publier des devoirs, noter les élèves, sans friction administrative.
- **Douleurs actuelles :** Registres papier, pas de vue cross-class, saisie des notes en double (registre + tableur).
- **Attentes phase 4 :** Saisie rapide présences/notes, assistant pour détecter absences répétées ou moyennes en chute.

### Secrétariat
- **Qui :** Agent de secrétariat.
- **Objectif :** Gérer les communications internes, générer les bulletins, coordonner le calendrier scolaire.
- **Douleurs actuelles :** Bulletins générés manuellement depuis des tableurs, messagerie par WhatsApp personnel.
- **Attentes phase 4 :** Génération bulletins automatisée, messagerie centralisée dans l'app.

### Directeur
- **Qui :** Directeur de l'établissement.
- **Objectif :** Superviser les absences répétées, les moyennes par classe, les communications inter-équipes.
- **Douleurs actuelles :** Visibilité limitée sur l'assiduité et les résultats sans rapports manuels.
- **Attentes phase 4 :** Dashboard absences/notes, alertes élèves en difficulté, calendrier scolaire centralisé.

### Administrateur plateforme madarisse-ai (SuperAdmin)
- **Qui :** Équipe madarisse-ai.
- **Objectif :** Créer, configurer, suspendre des tenants, monitorer la plateforme.
- **Douleurs actuelles :** Gestion manuelle en base de données.
- **Attentes phase 4 :** Interface SuperAdmin dédiée, actions sécurisées, audit trail.

---

## 2. Jobs-to-be-done (Phase 4)

| # | Job | Priorité |
|---|---|---|
| J1 | Saisir les présences d'une classe en moins de 2 minutes | P0 |
| J2 | Consulter le taux d'absentéisme par élève et par classe | P0 |
| J3 | Publier un devoir (titre, matière, date limite, fichier joint optionnel) | P0 |
| J4 | Saisir les notes d'une évaluation et calculer la moyenne automatiquement | P0 |
| J5 | Générer le bulletin de notes d'un élève (PDF) | P0 |
| J6 | Gérer le calendrier scolaire (événements, congés, examens) | P1 |
| J7 | Échanger des messages entre enseignants, secrétariat et direction | P1 |
| J8 | Créer, configurer et suspendre un tenant depuis l'interface SuperAdmin | P1 |
| J9 | Alerter quand un élève cumule trop d'absences ou sa moyenne chute | P2 |
| J10 | Générer les bulletins de toute une classe en lot | P2 |

---

## 3. User Stories par module

### Module Présences (J1, J2, J9)

**US-01** — En tant qu'enseignant, je veux saisir la présence de chaque élève de ma classe (présent / absent / retard) en moins de 2 minutes, pour alimenter le registre sans perdre de temps en cours.

*Critères d'acceptation :*
- [ ] La liste des élèves de la classe s'affiche automatiquement (triée alphabétiquement).
- [ ] Le statut par défaut est "présent" — l'enseignant ne clique que sur les absents/retards (saisie par exception).
- [ ] La saisie est possible depuis un navigateur mobile (interface responsive Tailwind).
- [ ] La soumission est atomique : toutes les présences du créneau sont sauvegardées en une seule transaction.
- [ ] Un élève peut être marqué "absent justifié" avec un champ commentaire optionnel.
- [ ] L'horodatage de la saisie (créneau, date) est conservé pour audit.

**US-02** — En tant que directeur, je veux consulter le taux d'absentéisme par élève (sur la période choisie) et par classe, pour détecter les élèves à risque de décrochage.

*Critères d'acceptation :*
- [ ] Dashboard Présences : tableau par classe avec colonnes — élève, séances totales, absences, retards, taux présence (%).
- [ ] Filtre par période (semaine / mois / trimestre / année).
- [ ] Les élèves avec taux de présence < seuil configurable (défaut : 80%) sont surlignés en rouge.
- [ ] Export CSV du tableau filtré disponible.
- [ ] L'assistant peut répondre à « quels élèves ont plus de 5 absences ce mois ? » en utilisant ces données.

**US-03** — En tant que directeur, je veux être alerté automatiquement quand un élève cumule plus de N absences non justifiées consécutives (N configurable), pour intervenir rapidement.

*Critères d'acceptation :*
- [ ] Un job cron quotidien vérifie les absences consécutives non justifiées par élève.
- [ ] Une alerte est créée dans le panneau Alertes (module Phase 3) avec : nom élève, classe, nombre d'absences, dates.
- [ ] Le seuil N est configurable par tenant dans les Paramètres (défaut : 3 absences consécutives).
- [ ] L'agent peut proposer un message de contact au parent via le module Messagerie (HITL).

---

### Module Devoirs (J3)

**US-04** — En tant qu'enseignant, je veux publier un devoir (matière, titre, description, date limite, fichier joint optionnel) pour une classe ou un groupe d'élèves, pour centraliser les consignes.

*Critères d'acceptation :*
- [ ] Formulaire de création : matière (liste déroulante), titre, description (rich text minimaliste), date limite, classe(s) cible(s), fichier joint (PDF/image, max 10 Mo).
- [ ] Le devoir apparaît dans une liste "Devoirs à venir" triée par date limite pour les enseignants et le secrétariat.
- [ ] Un devoir peut être modifié ou supprimé par son auteur jusqu'à la date limite.
- [ ] L'assistant peut répondre à « quels devoirs sont à rendre cette semaine pour la 5ème B ? ».
- [ ] Les devoirs sont visibles dans le Calendrier scolaire (module dédié).

**US-05** — En tant que secrétariat, je veux avoir une vue consolidée de tous les devoirs publiés par tous les enseignants (filtrable par classe et par semaine), pour informer les parents si besoin.

*Critères d'acceptation :*
- [ ] Vue secrétariat : liste des devoirs avec colonnes — matière, titre, classe, enseignant, date limite.
- [ ] Filtres : classe, matière, semaine.
- [ ] Export de la liste hebdomadaire en PDF (pour affichage si besoin).

---

### Module Notes / Bulletins (J4, J5, J10)

**US-06** — En tant qu'enseignant, je veux saisir les notes d'une évaluation (nom de l'éval, matière, coefficient, note sur N) pour chaque élève de ma classe, et voir la moyenne calculée automatiquement.

*Critères d'acceptation :*
- [ ] Formulaire d'évaluation : nom, matière, date, note maximale (sur 20 ou personnalisée), coefficient.
- [ ] Saisie des notes élève par élève dans un tableau inline (éditable en ligne, pas de formulaire par élève).
- [ ] Moyenne de classe calculée en temps réel à la saisie (côté client).
- [ ] Validation finale soumet toutes les notes en une seule transaction (atomique).
- [ ] Une note peut être corrigée tant que le bulletin n'est pas généré.
- [ ] L'assistant peut répondre à « quelle est la moyenne de la 6ème A en mathématiques ce trimestre ? ».

**US-07** — En tant que secrétariat, je veux générer le bulletin de notes d'un élève pour un trimestre donné (PDF), incluant les moyennes par matière, la moyenne générale, les appréciations enseignants et les informations de l'élève.

*Critères d'acceptation :*
- [ ] Le bulletin est généré en PDF côté serveur (API route Next.js ou Edge Function).
- [ ] Structure du bulletin : en-tête école (logo, nom), informations élève (nom, classe, année), tableau matières (matière, coefficient, note, appréciation), moyenne générale, appréciation du directeur, sceau/signature (image uploadée dans Paramètres).
- [ ] La génération prend < 3s par bulletin.
- [ ] Le PDF respecte le format A4 et est téléchargeable depuis la fiche élève.
- [ ] Une appréciation générale peut être saisie par l'enseignant responsable ou le directeur avant génération.
- [ ] Les bulletins générés sont archivés dans Supabase Storage (lien dans la fiche élève).

**US-08** — En tant que secrétariat, je veux générer les bulletins de tous les élèves d'une classe en un seul clic (lot), pour préparer la distribution en fin de trimestre sans répéter l'opération manuellement.

*Critères d'acceptation :*
- [ ] Un bouton "Générer les bulletins — [Classe] — Trimestre N" lance la génération en lot.
- [ ] La génération est asynchrone (job en background) avec une barre de progression visible.
- [ ] En cas d'erreur sur un élève (données manquantes), la génération continue pour les autres et liste les erreurs.
- [ ] Un ZIP contenant tous les PDFs est disponible en téléchargement à la fin du job.
- [ ] La génération en lot est limitée à un rôle autorisé (directeur ou secrétariat).

---

### Module Calendrier scolaire (J6)

**US-09** — En tant que directeur, je veux gérer le calendrier scolaire (jours fériés, vacances, examens, événements école) et que tous les utilisateurs puissent le consulter, pour coordonner l'établissement.

*Critères d'acceptation :*
- [ ] Vue calendrier mensuelle et hebdomadaire (composant existant ou bibliothèque légère compatible React 19).
- [ ] Types d'événements : jour férié, vacances, examen, réunion, autre (chaque type a une couleur distincte).
- [ ] Création d'événement : titre, type, date début, date fin (optionnelle), description, classes concernées (toutes ou sélection).
- [ ] Seul le directeur et le secrétariat peuvent créer / modifier / supprimer des événements.
- [ ] Les enseignants voient le calendrier en lecture seule.
- [ ] Les devoirs (module Devoirs) apparaissent automatiquement dans le calendrier à leur date limite.
- [ ] L'assistant peut répondre à « y a-t-il des examens la semaine prochaine ? ».

---

### Module Messagerie interne (J7)

**US-10** — En tant qu'enseignant, je veux envoyer un message à un collègue, au secrétariat ou à la direction depuis l'app, pour centraliser les communications professionnelles et ne plus dépendre de WhatsApp personnel.

*Critères d'acceptation :*
- [ ] Interface messagerie : liste de conversations à gauche, fil de messages à droite (layout classique).
- [ ] Un message peut être envoyé à : un utilisateur individuel, un groupe (tous les enseignants, tout le secrétariat, tous), ou une classe (diffusion aux enseignants de la classe).
- [ ] Les messages sont stockés dans Supabase avec `tenant_id` et chiffrés au repos.
- [ ] Les nouvelles conversations et messages déclenchent une notification in-app (badge sur l'icône messagerie).
- [ ] Supabase Realtime est utilisé pour l'affichage en temps réel des messages reçus (sans rechargement).
- [ ] Un message peut inclure une pièce jointe (PDF/image, max 5 Mo).
- [ ] Les messages peuvent être lus mais pas modifiés après envoi.

**US-11** — En tant que secrétariat, je veux envoyer une annonce à tous les enseignants en une action (type "broadcast"), pour communiquer des informations importantes rapidement.

*Critères d'acceptation :*
- [ ] Option "Envoyer à tous" disponible lors de la création d'un message.
- [ ] Les broadcasts sont marqués visuellement différemment des messages individuels (tag "Annonce").
- [ ] Seuls les rôles directeur et secrétariat peuvent envoyer des broadcasts.
- [ ] L'assistant peut rédiger un brouillon d'annonce sur demande (ex. : « rédige une annonce pour signaler que les examens du trimestre commencent lundi »), avec validation HITL avant envoi.

---

### Module SuperAdmin — Gestion tenants (J8)

**US-12** — En tant qu'administrateur plateforme madarisse-ai, je veux créer un nouveau tenant depuis l'interface SuperAdmin (nom école, slug, email directeur, plan), pour onboarder une nouvelle école sans manipulation directe en base de données.

*Critères d'acceptation :*
- [ ] L'interface SuperAdmin est accessible uniquement au rôle `superadmin` (contrôle middleware Next.js + RLS Supabase).
- [ ] Formulaire de création tenant : nom école, slug (unique, validé en temps réel), email directeur (invitation Supabase Auth envoyée automatiquement), plan (basique / pro), quotas IA initiaux (pré-remplis selon le plan).
- [ ] La création crée l'entrée dans `tenants`, `tenant_ai_quotas`, et envoie l'email d'invitation.
- [ ] L'action est journalisée dans `agent_action_logs` (type `superadmin.tenant.create`).

**US-13** — En tant qu'administrateur plateforme, je veux voir la liste de tous les tenants avec leurs métriques clés (élèves actifs, consommation IA du mois, statut), pour monitorer la santé de la plateforme.

*Critères d'acceptation :*
- [ ] Tableau des tenants : nom école, slug, plan, élèves actifs, tokens Flash utilisés ce mois, tokens Pro utilisés ce mois, statut (actif / suspendu / essai).
- [ ] Un filtre par statut et une recherche par nom sont disponibles.
- [ ] Les métriques sont calculées à la demande (pas de cache > 5 min).

**US-14** — En tant qu'administrateur plateforme, je veux suspendre ou réactiver un tenant, pour gérer les impayés d'abonnement ou les violations de conditions d'utilisation.

*Critères d'acceptation :*
- [ ] Action "Suspendre" : le tenant passe au statut `suspended`. Les utilisateurs du tenant voient un message de suspension à la connexion (middleware Next.js).
- [ ] Action "Réactiver" : le tenant repasse au statut `active` immédiatement.
- [ ] Les données du tenant ne sont pas supprimées lors d'une suspension.
- [ ] La suspension/réactivation est journalisée dans `agent_action_logs` avec le motif saisi par le superadmin.
- [ ] Un email de notification est envoyé au directeur du tenant lors de la suspension.

---

## 4. Exigences non-fonctionnelles

| # | Exigence | Cible |
|---|---|---|
| NF-01 | Saisie présences (chargement liste + soumission) | < 2s (interface mobile) |
| NF-02 | Génération bulletin PDF (unitaire) | < 3s |
| NF-03 | Génération bulletins en lot (classe de 30 élèves) | < 60s (asynchrone) |
| NF-04 | Latence messagerie (réception message via Realtime) | < 500ms |
| NF-05 | Chargement calendrier mensuel | < 800ms |
| NF-06 | Isolation tenant SuperAdmin | 100% — superadmin voit tous les tenants, les autres rôles voient uniquement le leur |
| NF-07 | Chiffrement messages | Au repos (Supabase Storage / chiffrement colonne) |
| NF-08 | i18n | Tous les écrans en français et arabe (RTL) — bulletins inclus |
| NF-09 | Accessibilité | Saisie présences accessible sur smartphone avec écran 5 pouces minimum |
| NF-10 | Conformité données mineurs (notes, bulletins) | Accès restreint aux rôles enseignant, secrétariat, directeur — RLS systématique |
| NF-11 | Taille max pièce jointe (devoirs, messagerie) | 10 Mo (devoirs) / 5 Mo (messages) |
| NF-12 | Archivage bulletins | Stockés dans Supabase Storage, rétention 5 ans minimum |

---

## 5. Scénarios de dialogue clés

### Scénario A — Saisie présences assistée
```
Enseignant : [ouvre la saisie présences 6ème A, 10h00]
             [tous marqués "présent" par défaut]
             [clique sur Bennani Sara → absent]
             [clique sur Chraibi Amine → retard]
             [clique sur Soumettre]
Agent       : Présences 6ème A du 10 juillet 10h00 enregistrées.
              2 absences / retards notés sur 28 élèves.
```

### Scénario B — Alerte absences répétées
```
[Panneau Alertes — détection automatique]
AVERTISSEMENT : Douiri Karim (4ème B) — 4 absences non justifiées consécutives.
                Dates : 6, 7, 8, 9 juillet 2026.
                [Voir fiche élève]  [Rédiger message pour la direction]  [Marquer traité]
```

### Scénario C — Question notes à l'assistant
```
Directeur  : quelle est la classe avec la plus faible moyenne générale ce trimestre ?
Agent      : Au 2ème trimestre 2025-2026 :
             Classe avec la plus faible moyenne : 3ème C — moyenne générale : 10.4/20
             Matières les plus critiques : Mathématiques (8.9) et Arabe (9.2).
             Voulez-vous voir le détail élève par élève pour la 3ème C ?
```

### Scénario D — SuperAdmin suspends un tenant
```
SuperAdmin : [clique sur "Suspendre" pour École Al Firdaws]
             [saisit motif : "Impayé abonnement — relance envoyée le 01/07"]
             [confirme]
Agent       : Tenant École Al Firdaws suspendu. Email envoyé au directeur.
              Action journalisée dans agent_action_logs.
```

### Scénario E — Génération bulletins en lot
```
Secrétariat : [clique sur "Générer bulletins — 6ème A — Trimestre 2"]
              [barre de progression : 1/28... 15/28... 28/28]
Agent       : Bulletins générés pour 28 élèves. 0 erreur.
              [Télécharger le ZIP — 6emeA_T2_bulletins.zip]
```

---

## 6. Hors périmètre (Phase 4)

- Application mobile parents (Expo / React Native) — exclus par décision produit
- Portail élèves en ligne (accès notes / bulletins par l'élève)
- Intégration SMS/WhatsApp pour la messagerie (copier/coller uniquement, comme en phase 3)
- Gestion RH / paie des enseignants
- Module cantine / transport
- Vidéoconférence intégrée
- Notation compétences (au-delà des notes chiffrées)
- Module comptabilité analytique des dépenses pédagogiques (Phase 2)
- Signature électronique bulletins (dépend d'audit juridique CNDP)

---

## 7. KPIs de succès (Phase 4)

| KPI | Cible |
|---|---|
| Temps de saisie présences (classe de 30 élèves) | < 2 min (P50) |
| Taux d'adoption saisie présences numérique vs. papier | > 80% à 3 mois |
| Temps de génération bulletin individuel | < 3s |
| Temps de génération lot (30 élèves) | < 60s |
| Taux de satisfaction enseignants (saisie notes) | ≥ 4/5 |
| Réduction des communications WhatsApp perso (messagerie interne) | > 60% des échanges intra-école passent par l'app (mesure déclarative) |
| Temps création tenant SuperAdmin (from scratch) | < 5 min |
| Couverture tests e2e (Présences + Notes + Bulletins) | 100% des US-01 à US-08 |
| CI verte sur chaque PR | 100% |
