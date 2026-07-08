# PRD — Core Ops v1 (Phase 1)

**Produit :** madarisse-ai  
**Scope :** Onboarding + Élèves + Inscriptions/Validation + Paiements  
**Date :** 2026-07-09  
**Statut :** Draft

---

## 1. Personas

### Secrétariat
- **Qui :** Agent de secrétariat, 1-3 personnes par école.
- **Objectif :** Gérer les inscriptions, les paiements, les dossiers élèves au quotidien.
- **Douleurs actuelles :** Tâches répétitives (relances impayés, saisie d'inscriptions), erreurs de saisie, pas de vue cross-module.
- **Attentes agent :** Gagner du temps sur les tâches répétitives, être alerté proactivement, ne pas avoir à chercher l'info.

### Directeur
- **Qui :** Directeur de l'établissement.
- **Objectif :** Piloter l'école (finances, taux de remplissage, anomalies).
- **Douleurs actuelles :** Reporting manuel, pas de briefing consolidé, dépend du secrétariat pour les chiffres.
- **Attentes agent :** Briefing quotidien, réponses instantanées aux questions stratégiques, alertes anomalies.

---

## 2. Jobs-to-be-done (Phase 1)

| # | Job | Priorité |
|---|---|---|
| J1 | Créer une école from scratch (tenant → année → classes → frais) | P0 |
| J2 | Ajouter des élèves (formulaire ou import CSV) | P0 |
| J3 | Inscrire un élève dans une classe avec ses frais | P0 |
| J4 | Valider une inscription (statut confirmé + génération échéancier) | P0 |
| J5 | Encaisser un paiement | P0 |
| J6 | Consulter l'état des paiements d'un élève | P0 |
| J7 | Importer une liste d'élèves (CSV) avec détection d'erreurs | P1 |
| J8 | Déléguer J3-J5 à l'assistant en langage naturel | P1 |

---

## 3. User Stories par module

### Module Onboarding (J1)

**US-01** — En tant que directeur, je veux créer mon école en moins de 15 min (nom, adresse, logo, année scolaire, semestres, classes, types de frais) pour pouvoir commencer à inscrire des élèves.

*Critères d'acceptation :*
- [ ] Le tenant est créé avec un slug unique.
- [ ] L'année scolaire est créée avec dates de début/fin.
- [ ] Au moins une classe est créée.
- [ ] Les frais d'inscription et de scolarité sont configurés.
- [ ] L'assistant d'onboarding guide avec un wizard conversationnel (alternative : wizard classique à étapes).

### Module Élèves (J2, J7)

**US-02** — En tant que secrétariat, je veux ajouter un élève (nom, prénom, date de naissance, classe, contact parent) via un formulaire pour constituer son dossier.

**US-03** — En tant que secrétariat, je veux importer une liste d'élèves depuis un fichier CSV (colonnes : nom, prénom, classe, email parent) pour éviter la saisie manuelle en masse.

*Critères d'acceptation US-03 :*
- [ ] Mapping des colonnes assisté (l'agent propose le mapping, l'humain valide).
- [ ] Les erreurs sont signalées ligne par ligne avant l'import.
- [ ] L'import est stoppé si > 20% d'erreurs (confirmation demandée).
- [ ] Les élèves importés apparaissent dans la liste avec statut « à inscrire ».

### Module Inscriptions (J3, J4)

**US-04** — En tant que secrétariat, je veux inscrire un élève dans une classe avec les frais associés, et que l'échéancier soit généré automatiquement.

**US-05** — En tant que secrétariat, je veux valider une inscription (passer de « en attente » à « confirmé ») pour déclencher la facturation.

**US-06** — En tant que secrétariat, je veux demander à l'assistant « inscris Yassine en 6ème A, frais 1500 + 800/mois » et voir un canvas de confirmation avant exécution.

*Critères d'acceptation US-06 :*
- [ ] L'agent retrouve l'élève « Yassine » (fuzzy search + confirmation si plusieurs résultats).
- [ ] L'agent retrouve la classe « 6ème A » dans le tenant.
- [ ] Le canvas affiche : élève, classe, frais inscription, frais scolarité, récapitulatif échéancier.
- [ ] Sur Valider → inscription créée + `agent_action_logs` enregistré.
- [ ] Sur Annuler → aucune écriture.

### Module Paiements (J5, J6)

**US-07** — En tant que secrétariat, je veux encaisser un paiement (montant, date, mode : espèces/virement/chèque) sur un élève.

**US-08** — En tant que secrétariat, je veux voir l'état des paiements d'un élève (échéancier, payé/dû, retard).

**US-09** — En tant que secrétariat, je veux demander à l'assistant « Yassine a payé 1500 en espèces » et que l'action soit enregistrée après confirmation.

---

## 4. Exigences non-fonctionnelles

| # | Exigence | Cible |
|---|---|---|
| NF-01 | Latence cockpit (chargement liste élèves) | < 500ms |
| NF-02 | Latence assistant (premier token streamé) | < 1.5s |
| NF-03 | Latence assistant (réponse complète) | < 5s |
| NF-04 | Disponibilité | 99.5% (SLA VPS) |
| NF-05 | Isolation tenant (aucune fuite inter-tenant) | 100% — testé en CI |
| NF-06 | i18n | Français et Arabe (RTL) sur tous les écrans |
| NF-07 | Coût par action agent assistée | < $0.01 (Flash) / < $0.05 (Pro) |
| NF-08 | Audit trail | Chaque écriture agent dans `agent_action_logs` |

---

## 5. Scénarios de dialogue clés

### Scénario A — Inscription assistée
```
Secrétariat : inscris Yassine Alaoui en 6ème A, frais inscription 1500, scolarité 800/mois
Agent        : ┌─────────────────────────────────────┐
               │ Nouvelle inscription                 │
               │ Élève    : Yassine Alaoui            │
               │ Classe   : 6ème A                    │
               │ Frais ins. : 1 500 MAD (sept. 2026) │
               │ Scolarité : 800 MAD × 10 mois       │
               │ Total    : 9 500 MAD                 │
               │         [Modifier]  [✓ Valider]      │
               └─────────────────────────────────────┘
Secrétariat : [✓ Valider]
Agent        : ✅ Inscription créée. Échéancier généré (10 mensualités + frais septembre).
```

### Scénario B — Validation en masse
```
Secrétariat : valide toutes les inscriptions en attente de ce matin
Agent        : J'ai trouvé 7 inscriptions en attente (créées aujourd'hui) :
               - Alaoui Yassine  6A   1500+800×10
               - Bennani Sara    5B   1500+700×10
               [...5 autres...]
               Confirmer la validation des 7 inscriptions ?  [✓ Valider tout]  [Voir détails]
Secrétariat : [✓ Valider tout]
Agent        : ✅ 7 inscriptions validées. Échéanciers générés. Loggé dans agent_action_logs.
```

### Scénario C — Question de reporting
```
Directeur    : quel est le taux de recouvrement de la 6ème A ce mois-ci ?
Agent        : Taux de recouvrement 6ème A — juillet 2026 :
               Attendu : 18 400 MAD  |  Encaissé : 14 200 MAD  |  Taux : 77%
               3 élèves avec retard > 30j : Bennani, Cherif, Douiri.
               Voulez-vous que je prépare un brouillon de relance pour eux ?
```

---

## 6. Hors périmètre (Phase 1)

- Présences, devoirs, notes/bulletins, calendrier, messagerie
- Mobile (app parents)
- Module SuperAdmin multi-tenant
- Agent ambiant / proactif (Phase 3)
- Serveur MCP (Phase 2)

---

## 7. KPIs de succès (Phase 1)

| KPI | Cible |
|---|---|
| Temps onboarding école from scratch | < 15 min |
| Taux d'adoption assistant (secrétariat) | > 30% des inscriptions via assistant |
| Taux de HITL validation (pas d'action auto) | 100% sur inscriptions + paiements |
| Score satisfaction secrétariat (test pilote) | ≥ 4/5 |
| Couverture tests e2e (parcours cockpit) | 100% des US-01 à US-08 |
| CI verte sur chaque PR | 100% |
