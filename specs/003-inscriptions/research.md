# Research — 003-inscriptions

## D1 — Schema enrollments (vérifié sur ecole-muret)

**Decision**: Utiliser le schéma existant tel quel — aucune migration nécessaire.  
**Fields confirmés**: `id, tenant_id, student_id, class_id, academic_year_id, enrollment_fee, tuition_fee, status (pending/confirmed/cancelled), created_at, updated_at`  
**Contrainte unique**: `(tenant_id, student_id, academic_year_id)` — un élève = une inscription par an.

## D2 — Génération de l'échéancier

**Decision**: Génération dans le handler Python `_execute_enrollment_validate` au moment de la confirmation, pas via trigger DB.  
**Rationale**: Contrôle total côté application, testable en isolation, pas de logique dans Supabase.  
**Pattern**: `payment_items` insérés avec `item_type='schedule'`, `due_date` calculé mois par mois (10 mois : sept → juin), `amount=tuition_fee`, `status='pending'` + 1 item `item_type='enrollment_fee'`.  
**Nb de mensualités**: Constante `SCHEDULE_MONTHS = 10` (année scolaire marocaine type).

## D3 — Validation en masse (cockpit)

**Decision**: Endpoint dédié `POST /api/enrollments/validate-batch` avec body `{ ids: string[] }`, exécution séquentielle dans Supabase (`.in_("id", ids)` + update status=confirmed + génération échéancier).  
**HITL**: Validation en masse cockpit = l'humain sélectionne lui-même les IDs → aucun intermédiaire agent → pas de canvas HITL (action directe cockpit, authentifiée par JWT).  
**Rationale**: HITL est requis uniquement quand l'agent propose une action. Le cockpit est une action humaine directe.

## D4 — Tool `propose_enrollment_validate` (agent)

**Decision**: Nouveau tool HITL qui propose la validation d'une liste d'inscriptions via canvas.  
**Signature**: `propose_enrollment_validate(enrollment_ids: list[str], ctx: AgentContext) -> dict`  
**Distinction**: Différent du validate-batch cockpit — ici c'est l'AGENT qui propose, donc canvas obligatoire.  
**Payload**: `{ enrollment_ids: [...], count: N }`  
**Handler**: `enrollment.validate` dans hitl.py déjà présent — réutilisé.

## D5 — Gestion des doublons (FR-009)

**Decision**: Vérification côté API avant insert — query `SELECT id FROM enrollments WHERE student_id=X AND academic_year_id=Y AND tenant_id=Z` → si existe et status != cancelled → retourner 409 avec le détail.  
**Rationale**: Plus clair que se fier à la contrainte unique Supabase (qui retourne une erreur générique).

## D6 — Classes avec frais (select dans EnrollmentForm)

**Decision**: GET /api/classes retourne les classes du tenant avec leurs frais — réutilise le pattern des autres API.  
**Note**: Si /api/classes n'existe pas encore, l'ajouter en read-only dans ce plan (simple select).

## D7 — Sélection élève dans EnrollmentForm

**Decision**: Réutiliser le composant `StudentSearch` existant (déjà construit en 002-eleves) pour la sélection de l'élève dans le formulaire d'inscription.  
**Avantage**: Cohérence UX, recherche FR/AR déjà fonctionnelle, zero code dupliqué.
