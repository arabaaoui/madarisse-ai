# Research — 002-eleves

**Date**: 2026-07-09 | **Branch**: `002-eleves`

---

## Décision 1 : Schéma DB `students` (tables existantes)

**Decision**: Utiliser les tables Supabase existantes telles quelles — aucune migration nécessaire pour cette feature.

**Rationale**: Le schéma `students` contient déjà toutes les colonnes requises par la spec :
- Identité : `first_name`, `last_name`, `first_name_ar`, `last_name_ar`, `date_of_birth`, `gender`
- Contact parent : `parent_name`, `parent_name_ar`, `phone`, `email` (colonnes inline sur la table students)
- Statut : `annual_status` (valeurs: `pending` = "à inscrire", mappable à "inscrit" via enrollment confirmé)
- Multi-tenant : `tenant_id` présent + RLS actif (4 policies : superadmin, global admin, tenant admin, teachers read-only)
- Photo : `photo` (URL string)

**Alternatives considered**: Créer une table `parent_contacts` séparée → rejeté car le schéma existant gère déjà le contact parent inline sur `students` avec `parent_id` FK vers `auth.users` pour les parents qui ont un compte.

**Schéma confirmé (colonnes utilisées dans cette feature)**:
```
students (
  id uuid PK,
  tenant_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  first_name_ar text,
  last_name_ar text,
  date_of_birth date NOT NULL,
  gender text NOT NULL,           -- 'M' | 'F'
  annual_status text DEFAULT 'pending',  -- 'pending' | 'active' | 'inactive'
  class_id uuid FK classes(id),
  academic_year_id uuid FK academic_years(id),
  parent_name text,
  parent_name_ar text,
  phone text,
  email text,
  photo text,                     -- URL Storage Supabase
  created_at timestamptz,
  updated_at timestamptz
)
```

---

## Décision 2 : Recherche FR/AR temps réel

**Decision**: `ilike` sur 4 colonnes (`first_name`, `last_name`, `first_name_ar`, `last_name_ar`) via `or_()` Supabase, debounce 300ms côté client.

**Rationale**: 
- Les colonnes `_ar` existent déjà → pas de migration
- `ilike` insensible à la casse, fonctionnel pour les deux langues
- Pour 1000 élèves, `ilike` avec index est suffisant (index `idx_students_id_names` existant couvre `first_name`, `last_name`, `first_name_ar`, `last_name_ar`)
- Debounce 300ms respecte SC-002 (< 300ms pour 1000 élèves)

**Alternatives considered**: Full-text search (`to_tsvector`) → rejeté car complexité inutile à cette échelle; trigram index → à considérer si > 10k élèves (Phase 2+).

---

## Décision 3 : Création élève — formulaire direct vs HITL

**Decision**: Formulaire cockpit avec écriture directe Supabase (pas de HITL agent).

**Rationale**: La constitution réserve le HITL aux "écritures sensibles" (inscriptions, paiements). La création d'un dossier élève est une saisie administrative standard, réversible (l'élève peut être inactivé), et la responsabilité est claire (le secrétariat saisit lui-même). Ajouter du HITL ici serait une friction inutile.

**Alternatives considered**: HITL via agent pour la création → rejeté (surcharge UX, non aligné avec la constitution).

---

## Décision 4 : Fiche 360° — architecture des données

**Decision**: Server Component avec 2 fetches parallèles via `Promise.all` :
1. `students` JOIN `classes` JOIN `academic_years` (données élève)
2. `enrollments` + `payment_items` agrégé (état financier)

**Rationale**: Server Components évitent le round-trip client ; `Promise.all` minimise la latence ; pas de state client nécessaire pour la consultation. La mise à jour (formulaire édition) peut être un Client Component overlay.

**Alternatives considered**: Tout en client + TanStack Query → rejeté pour la fiche initiale (SSR plus rapide, meilleur SEO cockpit); RPC Supabase unifiée → à considérer si la fiche devient trop complexe (Phase 2+).

---

## Décision 5 : shadcn/ui

**Decision**: Installer shadcn/ui CLI dans `apps/web/` avec les composants nécessaires : `button`, `input`, `table`, `badge`, `card`, `dialog`, `form`, `label`.

**Rationale**: `components/ui/` est vide mais prévu dans la structure. shadcn/ui est compatible Tailwind 4 et React 19. Les composants sont copiés localement (pas de dépendance runtime).

**Alternatives considered**: Radix UI direct → plus verbeux; Headless UI → moins de composants prêts; composants custom → trop chronophage.

---

## Décision 6 : Tool agent `get_student_detail`

**Decision**: Nouveau tool Python qui fait un JOIN `students` → `classes` → `enrollments` (actif) → retourne un dict structuré pour l'agent.

**Rationale**: `search_student` retourne une liste minimale (id, name, class_name). Pour répondre à une question agent sur un élève spécifique ("quel est le statut de Yassine ?"), l'agent a besoin de plus de contexte.

**Schéma de retour**:
```python
{
  "id": str,
  "name": str,
  "name_ar": str | None,
  "class_name": str | None,
  "date_of_birth": str,
  "annual_status": str,   # pending | active | inactive
  "enrollment_status": str | None,  # pending | confirmed | None
  "phone": str | None,
  "email": str | None,
}
```
