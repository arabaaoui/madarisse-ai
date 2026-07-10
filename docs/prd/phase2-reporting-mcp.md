# PRD — Phase 2 : Comptabilité avancée · Reporting · Config IA · Serveur MCP

**Produit :** madarisse-ai  
**Scope :** Comptabilité avancée + Reporting KPIs + Paramètres IA + Serveur MCP  
**Date :** 2026-07-10  
**Statut :** Draft  
**Prérequis :** Phase 1 livrée (Onboarding, Élèves, Inscriptions, Paiements)

---

## 1. Personas

### Directeur
- **Qui :** Directeur de l'établissement.
- **Objectif :** Piloter la santé financière de l'école sans passer par des tableurs.
- **Douleurs actuelles :** Agréger manuellement revenus/dépenses, absence de vue P&L mensuelle, dépend d'exports CSV pour les tendances.
- **Attentes phase 2 :** Dashboard financier temps réel, graphes mensuels, KPIs par classe, alerte si taux de recouvrement chute.

### Secrétariat
- **Qui :** Agent de secrétariat.
- **Objectif :** Saisir les dépenses courantes et consulter l'état des impayés par classe.
- **Douleurs actuelles :** Pas de module dépenses intégré, taux de recouvrement calculé à la main.
- **Attentes phase 2 :** Saisie rapide de transactions, historique filtrable, export PDF/CSV du reporting.

### Administrateur plateforme (SuperAdmin technique)
- **Qui :** Équipe madarisse-ai.
- **Objectif :** Accorder des quotas IA par tenant, choisir le modèle LLM par défaut.
- **Douleurs actuelles :** Configuration manuelle en base de données.
- **Attentes phase 2 :** Interface de config IA par tenant, indicateurs de consommation.

### Développeur / intégrateur externe
- **Qui :** Développeur qui connecte Claude Desktop ou Cursor à madarisse-ai.
- **Objectif :** Interroger les données de l'école en langage naturel via un client MCP.
- **Attentes phase 2 :** Serveur MCP stable, tools en lecture seule documentés, authentification sécurisée.

---

## 2. Jobs-to-be-done (Phase 2)

| # | Job | Priorité |
|---|---|---|
| J1 | Visualiser les revenus et dépenses mensuels sous forme de graphe | P0 |
| J2 | Consulter le P&L (Profit & Loss) de l'année scolaire en cours | P0 |
| J3 | Saisir une dépense (catégorie, montant, date, justificatif) | P0 |
| J4 | Voir les KPIs par classe (taux de remplissage, recouvrement, impayés) | P0 |
| J5 | Consulter l'évolution mensuelle du taux de recouvrement | P1 |
| J6 | Configurer les quotas IA et le modèle LLM par tenant | P1 |
| J7 | Exposer les données de l'école via un serveur MCP (lecture seule) | P1 |
| J8 | Exporter un rapport mensuel en PDF ou CSV | P2 |

---

## 3. User Stories par module

### Module Comptabilité avancée (J1, J2, J3)

**US-01** — En tant que directeur, je veux voir un graphe en barres mensuelles des revenus encaissés vs. dépenses sur l'année scolaire, pour identifier les mois déficitaires d'un coup d'œil.

*Critères d'acceptation :*
- [ ] Le graphe affiche 12 mois (ou les mois de l'année scolaire active).
- [ ] Les barres "revenus" agrègent les paiements élèves (`payment_records`) par mois.
- [ ] Les barres "dépenses" agrègent les transactions de dépenses par mois.
- [ ] Un survol (tooltip) affiche le montant exact en MAD.
- [ ] Le graphe se recharge automatiquement lors d'une nouvelle saisie (invalidation TanStack Query).
- [ ] Accessible depuis le menu "Comptabilité" du cockpit.

**US-02** — En tant que directeur, je veux consulter un tableau P&L (revenus – dépenses = résultat) avec cumul annuel, pour piloter la rentabilité de l'école.

*Critères d'acceptation :*
- [ ] Le tableau affiche : mois, total revenus, total dépenses, résultat net, cumul YTD.
- [ ] Les totaux s'affichent en rouge si le résultat mensuel est négatif.
- [ ] Un bouton "Exporter CSV" génère le fichier côté client sans appel serveur supplémentaire.
- [ ] L'assistant peut répondre à « quel est notre résultat net depuis septembre ? » en lisant ce tableau.

**US-03** — En tant que secrétariat, je veux saisir une dépense (fournisseur, catégorie, montant, date, pièce justificative optionnelle) pour alimenter la comptabilité.

*Critères d'acceptation :*
- [ ] Le formulaire inclut : catégorie (liste déroulante configurable), description, montant MAD, date, upload fichier (PDF/image, max 5 Mo).
- [ ] La dépense est immédiatement visible dans le graphe mensuel.
- [ ] Le tenant_id est appliqué côté serveur (pas de confiance côté client).
- [ ] L'assistant peut saisir une dépense via HITL : « Enregistre une dépense fournitures scolaires 450 MAD du 10 juillet ».

**US-04** — En tant que directeur, je veux voir l'historique des transactions (revenus et dépenses) filtrable par mois, catégorie et type, pour auditer les flux financiers.

*Critères d'acceptation :*
- [ ] Filtres disponibles : période (mois/trimestre/année), type (revenu/dépense), catégorie.
- [ ] La liste est paginée (50 lignes par page) avec chargement virtuel.
- [ ] Chaque ligne affiche : date, type, catégorie, description, montant, auteur de la saisie.
- [ ] Export CSV de la sélection filtrée disponible.

---

### Module Reporting KPIs (J4, J5, J8)

**US-05** — En tant que directeur, je veux un dashboard de KPIs par classe (nombre d'élèves inscrits, taux de remplissage, montant attendu, montant encaissé, taux de recouvrement), pour comparer les classes d'un coup d'œil.

*Critères d'acceptation :*
- [ ] Chaque classe de l'année active est listée avec ses 5 KPIs.
- [ ] Le taux de remplissage = élèves inscrits / capacité max de la classe (configurée en onboarding).
- [ ] Le taux de recouvrement = montant encaissé / montant attendu sur la période sélectionnée.
- [ ] Un filtre par période (mois courant, trimestre, année) est disponible.
- [ ] Les lignes dont le taux de recouvrement < 70% sont surlignées en orange.
- [ ] L'assistant peut répondre à « quelle classe a le plus d'impayés ? » en utilisant ce reporting.

**US-06** — En tant que directeur, je veux visualiser l'évolution mensuelle du taux de recouvrement global (tous niveaux confondus) sous forme de courbe, pour détecter des tendances de paiement.

*Critères d'acceptation :*
- [ ] La courbe couvre l'année scolaire active mois par mois.
- [ ] Un marqueur visuel identifie les mois sous 80% (seuil configurable dans les paramètres).
- [ ] Un survol affiche : taux %, montant attendu, montant encaissé.
- [ ] La donnée est calculée par une fonction SQL ou RPC Supabase (pas côté client).

**US-07** — En tant que secrétariat, je veux exporter un rapport mensuel PDF récapitulant les KPIs (revenus, dépenses, P&L, taux recouvrement par classe) pour l'archiver ou le transmettre.

*Critères d'acceptation :*
- [ ] L'export PDF est généré côté serveur (Edge Function ou API route Next.js).
- [ ] Le PDF inclut : en-tête école (logo, nom), période, tableau P&L, tableau KPIs par classe.
- [ ] La génération prend moins de 5 secondes pour une école de 200 élèves.
- [ ] L'accès à cet export est limité aux rôles directeur et secrétariat (vérification JWT + RLS).

---

### Module Config IA / Paramètres (J6)

**US-08** — En tant qu'administrateur plateforme, je veux configurer pour chaque tenant : le quota mensuel de tokens IA (Flash et Pro séparément), le modèle LLM par défaut, et activer/désactiver l'agent ambiant (phase 3), pour contrôler les coûts et l'expérience par école.

*Critères d'acceptation :*
- [ ] L'interface de config est accessible uniquement au rôle `superadmin` (hors scope phase 2 complet — UI minimale en page `/admin/tenants/[id]/ai-config`).
- [ ] Les champs configurables : quota Flash (tokens/mois), quota Pro (tokens/mois), modèle par défaut (`flash` | `pro`), agent ambiant activé (booléen).
- [ ] Les modifications sont persistées dans `tenant_ai_quotas` et prennent effet immédiatement (pas de redémarrage requis).
- [ ] La consommation actuelle du mois (tokens utilisés / quota) est affichée en lecture seule.
- [ ] Un dépassement de quota renvoie une erreur claire à l'utilisateur dans le chat (`429 Quota dépassé`), sans planter le cockpit.

---

### Module Serveur MCP (J7)

**US-09** — En tant que développeur, je veux me connecter au serveur MCP de madarisse-ai depuis Claude Desktop ou Cursor et interroger les données de mon école en langage naturel, sans passer par l'interface web.

*Critères d'acceptation :*
- [ ] Le serveur MCP est exposé sur un endpoint dédié (`/mcp` ou port séparé) via FastAPI + SDK MCP.
- [ ] L'authentification est assurée par un token API généré par tenant (distinct du JWT Supabase de session).
- [ ] Les tools exposés en lecture seule (v1) :
  - `list_students` — liste des élèves actifs du tenant
  - `get_payment_status` — état des paiements d'un élève (par nom ou ID)
  - `get_class_kpis` — KPIs d'une classe (recouvrement, remplissage)
  - `get_financial_summary` — résumé P&L du mois courant ou d'une période
  - `list_unpaid_students` — élèves avec impayés > N jours
- [ ] Aucun tool d'écriture n'est exposé en phase 2.
- [ ] Le RLS Supabase est respecté via le JWT service du tenant (chaque token API est lié à un tenant_id).
- [ ] Une documentation OpenAPI/MCP est générée automatiquement et accessible sur `/mcp/docs`.
- [ ] Les appels MCP sont journalisés dans `agent_action_logs` (type `mcp.read`).

**US-10** — En tant que développeur, je veux générer et révoquer des tokens API MCP depuis l'interface Paramètres de mon école, pour sécuriser les accès externes.

*Critères d'acceptation :*
- [ ] La page Paramètres > API expose la liste des tokens actifs (nom, date de création, dernière utilisation, scope).
- [ ] Un bouton "Générer un token" crée un token unique affiché une seule fois (non récupérable ensuite).
- [ ] Un bouton "Révoquer" désactive immédiatement le token (sans délai de propagation > 1s).
- [ ] Maximum 5 tokens actifs par tenant.

---

## 4. Exigences non-fonctionnelles

| # | Exigence | Cible |
|---|---|---|
| NF-01 | Chargement dashboard Reporting (KPIs + graphes) | < 1s (données pré-agrégées en DB) |
| NF-02 | Génération export PDF mensuel | < 5s |
| NF-03 | Latence tool MCP (lecture simple) | < 800ms |
| NF-04 | Latence tool MCP (agrégat financier) | < 2s |
| NF-05 | Isolation tenant (MCP) | 100% — token API lié au tenant_id, RLS appliqué |
| NF-06 | Précision calculs financiers | Arithmétique entière en centimes (pas de float) |
| NF-07 | Audit MCP | Chaque appel MCP loggé dans `agent_action_logs` |
| NF-08 | Sécurité token API | Stocké haché en DB (bcrypt), affiché en clair une seule fois |
| NF-09 | Quota IA | Hard limit côté agent service — jamais outrepassée |
| NF-10 | i18n | Tous les écrans Reporting/Comptabilité en français et arabe (RTL) |

---

## 5. Scénarios de dialogue clés

### Scénario A — Question financière au directeur
```
Directeur  : quel est notre résultat net depuis le début de l'année ?
Agent      : Résultat net YTD (sept. 2025 → juillet 2026) :
             Revenus encaissés : 342 000 MAD
             Dépenses enregistrées : 87 500 MAD
             Résultat net       : +254 500 MAD
             Mois le plus chargé en dépenses : décembre 2025 (18 200 MAD).
             Voulez-vous voir le détail mois par mois ?
```

### Scénario B — Interrogation MCP depuis Claude Desktop
```
Utilisateur (Claude Desktop) : liste les élèves de la 5ème B avec impayés
Serveur MCP → tool list_unpaid_students(class="5B", min_days_overdue=0)
             → retourne 4 élèves avec montants dus
Agent Claude Desktop : 4 élèves de la 5ème B ont des impayés :
                       - Alaoui Yassine : 800 MAD (30j de retard)
                       [...]
```

### Scénario C — Saisie de dépense assistée
```
Secrétariat : enregistre une dépense maintenance climatisation 2 200 MAD ce jour
Agent       : ┌─────────────────────────────────────────┐
              │ Nouvelle dépense                        │
              │ Catégorie  : Maintenance                │
              │ Description: Climatisation              │
              │ Montant    : 2 200 MAD                  │
              │ Date       : 10 juillet 2026            │
              │         [Modifier]  [✓ Valider]         │
              └─────────────────────────────────────────┘
Secrétariat : [✓ Valider]
Agent       : Dépense enregistrée. P&L de juillet mis à jour.
```

---

## 6. Hors périmètre (Phase 2)

- Comptabilité analytique multi-centres de coût
- Intégration comptable externe (Sage, Odoo, etc.)
- Facturation fournisseurs automatisée
- Agent ambiant / proactif (Phase 3)
- Présences, devoirs, notes, calendrier, messagerie (Phase 4)
- Application mobile parents
- Tools MCP en écriture (écriture réservée à l'assistant in-app avec HITL)
- SuperAdmin complet (gestion tenants, UI complète — Phase 4)

---

## 7. KPIs de succès (Phase 2)

| KPI | Cible |
|---|---|
| Directeur pilote sans ouvrir de tableur | 100% des directeurs pilotes phase 2 |
| Temps pour obtenir le P&L mensuel | < 10 secondes (cockpit + assistant) |
| Taux d'adoption reporting dashboard | > 80% des sessions directeur incluent une visite dashboard |
| Connexions MCP actives (test pilote) | ≥ 2 tenants pilotes connectés via Claude Desktop |
| Couverture tests (calculs financiers) | 100% des fonctions SQL de calcul P&L et recouvrement |
| Zéro fuite inter-tenant via MCP | 100% — validé en CI avec tests d'isolation |
