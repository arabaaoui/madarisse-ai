-- =============================================================================
-- Seed — prérequis par défaut pour un nouveau tenant
-- À exécuter UNE FOIS après création du tenant, depuis Supabase SQL Editor.
-- Remplacer :TENANT_ID par l'UUID du tenant et :USER_ID par l'UUID du premier admin.
-- =============================================================================

-- ── 1. Catégories comptables par défaut ──────────────────────────────────────
INSERT INTO public.accounting_categories (tenant_id, name_fr, name_ar, category_type)
VALUES
  (:TENANT_ID, 'Frais d''inscription', 'رسوم التسجيل',   'revenue'),
  (:TENANT_ID, 'Scolarité mensuelle',  'الرسوم الشهرية',  'revenue'),
  (:TENANT_ID, 'Autres revenus',       'إيرادات أخرى',    'revenue'),
  (:TENANT_ID, 'Dépenses générales',   'مصاريف عامة',     'expense')
ON CONFLICT DO NOTHING;

-- ── 2. Paramètres école par défaut ───────────────────────────────────────────
INSERT INTO public.settings (tenant_id, school_name, currency_code, currency_symbol, payment_mode)
VALUES (:TENANT_ID, 'Mon École', 'MAD', 'MAD', 'installments')
ON CONFLICT (tenant_id) DO NOTHING;

-- ── 3. Rôle admin pour le premier utilisateur ─────────────────────────────────
INSERT INTO public.user_roles (user_id, tenant_id, role, is_active)
VALUES (:USER_ID, :TENANT_ID, 'admin', true)
ON CONFLICT (user_id, tenant_id, role) DO NOTHING;

-- ── 4. Lier le profil au tenant ───────────────────────────────────────────────
UPDATE public.profiles
SET tenant_id = :TENANT_ID
WHERE id = :USER_ID AND tenant_id IS NULL;

-- =============================================================================
-- Exemple complet de setup initial (décommentez et adaptez) :
-- =============================================================================
/*
-- Créer le tenant
INSERT INTO public.tenants (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'École Al-Nour', 'al-nour');

-- Année scolaire
INSERT INTO public.academic_years (tenant_id, year, start_date, end_date, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', '2025-2026', '2025-09-01', '2026-06-30', true);

-- Classe
INSERT INTO public.classes (tenant_id, name, enrollment_fee, tuition_fee)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'CP',  500, 400),
  ('00000000-0000-0000-0000-000000000001', 'CE1', 500, 400),
  ('00000000-0000-0000-0000-000000000001', 'CE2', 500, 400),
  ('00000000-0000-0000-0000-000000000001', 'CM1', 500, 400),
  ('00000000-0000-0000-0000-000000000001', 'CM2', 500, 400);
*/
