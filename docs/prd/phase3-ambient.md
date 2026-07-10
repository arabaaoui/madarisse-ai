# PRD — Phase 3 : Agent Ambiant Proactif

**Produit :** madarisse-ai  
**Scope :** Agent ambiant / QA — briefing quotidien, détection anomalies, relances adaptatives, QA automatique  
**Date :** 2026-07-10  
**Statut :** Draft  
**Prérequis :** Phase 1 + Phase 2 livrées

---

## 1. Personas

### Directeur
- **Qui :** Directeur de l'établissement.
- **Objectif :** Commencer sa journée informé sans effort — ouvrir l'app et trouver un résumé actionnable.
- **Douleurs actuelles :** Doit interroger manuellement le secrétariat ou l'app pour connaître l'état de l'école chaque matin.
- **Attentes phase 3 :** Briefing matinal automatique, alertes proactives sur les anomalies critiques, suggestions de relances prêtes à envoyer.

### Secrétariat
- **Qui :** Agent de secrétariat.
- **Objectif :** Ne pas manquer les impayés critiques ou les inscriptions bloquées.
- **Douleurs actuelles :** Doit scanner manuellement les listes d'impayés et de dossiers en attente.
- **Attentes phase 3 :** Notifications push ou résumé en début de journée, textes de relance proposés par l'agent (à valider avant envoi).

### Équipe madarisse-ai (QA interne)
- **Qui :** Développeurs / ops madarisse-ai.
- **Objectif :** Détecter les dérives de l'agent (hallucinations, mauvais calculs) avant qu'elles impactent les écoles.
- **Attentes phase 3 :** Rapport automatique comparant les réponses de l'agent aux données cockpit de référence.

---

## 2. Jobs-to-be-done (Phase 3)

| # | Job | Priorité |
|---|---|---|
| J1 | Recevoir un briefing matinal consolidé sans demander quoi que ce soit | P0 |
| J2 | Être alerté automatiquement quand une anomalie critique est détectée | P0 |
| J3 | Recevoir un texte de relance prêt-à-envoyer pour les impayés critiques, avec validation HITL | P1 |
| J4 | Détecter automatiquement les dérives de l'agent (QA auto) | P1 |
| J5 | Configurer les seuils d'alerte et les canaux de notification par école | P2 |

---

## 3. User Stories par module

### Module Briefing matinal (J1)

**US-01** — En tant que directeur, je veux recevoir chaque matin (à une heure configurable) un briefing consolidé de l'état de l'école, sans avoir à poser de question, pour démarrer ma journée avec les informations essentielles.

*Critères d'acceptation :*
- [ ] Un job cron (Supabase cron ou scheduler dédié) déclenche l'agent à l'heure configurée par tenant (défaut : 07h00 heure locale).
- [ ] L'agent lit en lecture seule (via ses tools) et produit un briefing structuré incluant :
  - Nombre d'élèves actifs / inscrits vs. capacité totale
  - Revenus encaissés ce mois vs. mois précédent (variation %)
  - Top 3 impayés les plus anciens (élève, classe, montant, ancienneté)
  - Inscriptions en attente de validation depuis > 48h
  - Anomalies détectées (voir US-02)
- [ ] Le briefing est déposé dans la liste des conversations de l'assistant (visible à l'ouverture de l'app) avec un horodatage.
- [ ] Une notification email est envoyée (optionnelle, activable dans les paramètres) avec le même contenu au format texte.
- [ ] Le briefing est généré avec Gemini Flash (coût < $0.001 par briefing).
- [ ] Si aucune anomalie n'est détectée, le briefing l'indique explicitement ("Tout est nominal").
- [ ] L'agent n'effectue aucune écriture lors du briefing (lecture seule stricte).

**US-02** — En tant que directeur, je veux que le briefing mentionne si des données semblent incohérentes (ex. : paiement enregistré sans inscription active), pour détecter les erreurs de saisie.

*Critères d'acceptation :*
- [ ] L'agent vérifie les incohérences suivantes lors du briefing :
  - Paiements orphelins (pas d'inscription active associée)
  - Inscriptions confirmées sans échéancier généré
  - Élèves dans une classe supprimée ou inactive
- [ ] Les incohérences trouvées sont listées avec le nom de l'élève et la nature du problème.
- [ ] Le nombre de vérifications QA interne (assertions testées) est affiché dans les métadonnées du briefing.

---

### Module Détection d'anomalies (J2)

**US-03** — En tant que directeur ou secrétariat, je veux être alerté immédiatement (dans l'app, pas seulement au briefing) quand une anomalie critique est détectée, pour agir rapidement.

*Critères d'acceptation :*
- [ ] Les anomalies critiques déclenchant une alerte immédiate (en dehors du briefing) :
  - Classe sous-remplie < 50% de sa capacité à J+30 après la rentrée
  - Impayés critiques : montant total impayé > seuil configurable (défaut : 3 mois de scolarité) depuis > 30 jours
  - Inscription bloquée en statut "en attente" depuis > 7 jours
- [ ] Les alertes sont déposées dans un panneau "Alertes" accessible depuis le menu principal.
- [ ] Chaque alerte indique : type d'anomalie, entité concernée (élève / classe), date de détection, sévérité (critique / avertissement).
- [ ] Une alerte peut être marquée "traitée" (dismiss) par l'utilisateur, ce qui la retire du panneau actif.
- [ ] La détection tourne via un job cron toutes les heures (Supabase cron ou Edge Function schedulée).
- [ ] Les seuils d'alerte sont configurables par tenant dans les Paramètres.

---

### Module Relances adaptatives (J3)

**US-04** — En tant que secrétariat, je veux que l'agent propose un texte de relance personnalisé (SMS ou WhatsApp) pour chaque impayé critique détecté, que je valide avant envoi, pour gagner du temps sans perdre le contrôle.

*Critères d'acceptation :*
- [ ] Pour chaque impayé critique détecté (> 30j, montant > seuil), l'agent génère un brouillon de message de relance incluant :
  - Nom du parent / tuteur
  - Nom de l'élève
  - Montant dû et ancienneté
  - Proposition de contact (numéro secrétariat)
- [ ] Le brouillon est présenté dans un canvas HITL (même pattern que phase 1) avec options :
  - [Modifier le texte] — champ éditable avant validation
  - [Marquer comme traité] — clôt l'alerte sans envoi
  - [Valider et copier] — copie le texte dans le presse-papier (intégration SMS/WhatsApp externe)
- [ ] Aucun message n'est envoyé automatiquement sans validation explicite de l'humain.
- [ ] L'action (texte généré, validé ou annulé, par qui) est journalisée dans `agent_action_logs` (type `relance.draft`).
- [ ] Le texte de relance est généré avec Gemini Pro (qualité rédactionnelle), en français ou en arabe selon la préférence du tenant.
- [ ] L'agent adapte le ton selon le nombre de relances précédentes (première relance : ton cordial ; troisième relance : ton formel).

**US-05** — En tant que directeur, je veux pouvoir configurer les canaux de notification (email du directeur, email du secrétariat) et les seuils d'alerte depuis les Paramètres, pour adapter l'agent aux pratiques de mon école.

*Critères d'acceptation :*
- [ ] Page Paramètres > Agent ambiant avec les champs : heure du briefing matinal, emails de notification (liste), seuil impayé critique (en MAD), seuil ancienneté impayé critique (en jours), seuil remplissage classe (%), agent ambiant activé/désactivé.
- [ ] Les modifications prennent effet dès le prochain cycle cron.
- [ ] La désactivation de l'agent ambiant arrête tous les jobs cron du tenant immédiatement.

---

### Module QA automatique (J4)

**US-06** — En tant qu'équipe madarisse-ai, je veux qu'un job hebdomadaire compare les réponses de l'agent à des assertions vérifiables en base de données, pour détecter les dérives avant qu'elles atteignent les directeurs.

*Critères d'acceptation :*
- [ ] Un job hebdomadaire (lundi 06h00 UTC) exécute un ensemble de cas de test QA sur chaque tenant actif :
  - L'agent retourne le bon nombre d'élèves inscrits (assertion contre `COUNT(*)` Supabase)
  - Le taux de recouvrement calculé par l'agent correspond à la valeur de la RPC SQL (delta < 1%)
  - Le briefing ne mentionne aucun élève inexistant (vérification des noms contre la DB)
- [ ] Les résultats sont stockés dans une table `agent_qa_results` (tenant_id, test_name, passed, expected, actual, run_at).
- [ ] Un rapport QA est envoyé par email à l'équipe madarisse-ai avec le résumé (N tests passés / N total, taux de succès, anomalies détectées).
- [ ] Si le taux de succès d'un tenant chute < 90%, une alerte est créée dans le panneau Alertes de ce tenant (visible par le directeur).
- [ ] Les cas de test QA sont versionnés dans le dépôt (`services/agent/evals/`) et exécutables manuellement.

---

## 4. Infrastructure de scheduling

| Composant | Technologie | Fréquence | Scope |
|---|---|---|---|
| Briefing matinal | Supabase cron (pg_cron) → Edge Function → agent service | Quotidien, heure configurable par tenant | Par tenant actif |
| Détection anomalies | Supabase cron → Edge Function → agent service | Toutes les heures | Par tenant actif |
| QA automatique | Supabase cron → service dédié | Hebdomadaire (lundi 06h UTC) | Tous tenants |
| Génération relances | Déclenché à la demande (panneau Alertes → bouton "Générer relance") | On-demand | Par alerte impayé |

**Règle de sécurité :** Les jobs cron utilisent le `service_role` Supabase uniquement pour lire les données et écrire dans les tables système (`agent_qa_results`, `agent_alerts`). Toute action utilisateur (relance) reste en HITL.

---

## 5. Exigences non-fonctionnelles

| # | Exigence | Cible |
|---|---|---|
| NF-01 | Durée de génération du briefing matinal | < 10s par tenant |
| NF-02 | Fiabilité du job cron (briefing) | > 99% des jours ouvrables |
| NF-03 | Coût briefing matinal (Flash) | < $0.001 par tenant par jour |
| NF-04 | Coût relance adaptative (Pro) | < $0.01 par relance générée |
| NF-05 | Isolation tenant (jobs cron) | Chaque job est scopé au tenant_id — zéro fuite |
| NF-06 | Latence alerte critique (détection → affichage) | < 1h (cycle cron horaire) |
| NF-07 | Aucune écriture métier sans HITL | 100% — validé par audit `agent_action_logs` |
| NF-08 | Langue des relances | Paramétrable par tenant (français / arabe) |
| NF-09 | Conformité données | Aucun contenu de relance stocké sans chiffrement (données mineurs / parents) |

---

## 6. Scénarios de dialogue clés

### Scénario A — Briefing matinal (notification app)
```
[07:00 — Notification app au directeur]
Agent (briefing) :
  Bonjour ! Voici l'état de votre école ce jeudi 10 juillet 2026.

  Élèves : 187 actifs | Taux de remplissage global : 89%
  Revenus juillet : 28 400 MAD (+12% vs juin)
  Impayés critiques : 3 élèves, total 4 200 MAD (retard > 30j)
    — Bennani Sara   6A   1 400 MAD (47j)
    — Chraibi Amine  4B   1 600 MAD (38j)
    — Douiri Fatima  5C   1 200 MAD (31j)
  Inscriptions bloquées : aucune.
  Anomalies détectées : aucune.
  Tout est nominal. Bonne journée !
```

### Scénario B — Relance adaptative (HITL)
```
[Panneau Alertes — Secrétariat clique sur "Générer relance" pour Bennani Sara]
Agent       : ┌──────────────────────────────────────────────────────┐
              │ Brouillon de relance — Bennani Sara                  │
              │                                                      │
              │ "Madame, Monsieur,                                   │
              │  Nous vous contactons concernant le règlement de     │
              │  la scolarité de votre enfant Sara Bennani (6ème A). │
              │  Un montant de 1 400 MAD reste dû depuis 47 jours.  │
              │  Merci de bien vouloir régulariser votre situation   │
              │  ou de contacter notre secrétariat au 05XX-XXXXXX.  │
              │  Cordialement, Direction de l'école."                │
              │                                                      │
              │  [Modifier]  [Marquer traité]  [✓ Valider et copier]│
              └──────────────────────────────────────────────────────┘
Secrétariat : [✓ Valider et copier]
Agent       : Texte copié dans le presse-papier. Action journalisée.
```

### Scénario C — Alerte anomalie critique
```
[Panneau Alertes — apparu à 09:00]
CRITIQUE : Classe 3ème A — taux de remplissage 38% (seuil : 50%)
           Détecté le 10 juillet 2026 à 09:00.
           Capacité : 30 élèves | Inscrits : 11 élèves.
           [Voir les élèves]  [Marquer comme traité]
```

---

## 7. Hors périmètre (Phase 3)

- Envoi automatique de SMS ou WhatsApp (pas d'intégration directe — copier/coller uniquement)
- Notifications push mobile (application parents hors scope)
- Agent répondant aux messages des parents
- Relances automatiques sans validation humaine (HITL obligatoire)
- Tableau de bord QA visible par les directeurs (réservé à l'équipe madarisse-ai)
- Présences, devoirs, notes, calendrier, messagerie (Phase 4)

---

## 8. KPIs de succès (Phase 3)

| KPI | Cible |
|---|---|
| Taux de délivrance du briefing matinal (jours ouvrables) | > 99% |
| Temps moyen de génération du briefing | < 10s |
| Taux d'adoption HITL relances (vs. relances manuelles) | > 50% des relances via agent |
| Taux de succès QA automatique (assertions correctes) | > 95% par tenant par semaine |
| Alertes anomalies détectées avant signalement manuel | > 80% des anomalies critiques |
| Score satisfaction directeur (briefing) — test pilote | ≥ 4.5/5 |
