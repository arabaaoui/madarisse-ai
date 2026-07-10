-- =============================================================================
-- Core tables — madarisse-ai
-- Crée toutes les tables métier manquantes (idempotent via IF NOT EXISTS).
-- À exécuter dans Supabase SQL Editor ou via supabase db push.
-- =============================================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enum rôles ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin','directeur','teacher','secretariat','parent','superadmin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── TENANTS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name                 text NOT NULL,
  name_ar              text,
  address              text,
  logo_url             text,
  slug                 text UNIQUE,
  active               boolean DEFAULT true,
  onboarding_completed boolean DEFAULT false,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- ─── ACADEMIC_YEARS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academic_years (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  year       text NOT NULL,
  start_date date,
  end_date   date,
  is_active  boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT academic_years_tenant_year_unique UNIQUE (tenant_id, year)
);

-- Une seule année active par tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_year_per_tenant
  ON public.academic_years (tenant_id)
  WHERE is_active = true;

-- ─── CLASSES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.classes (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  name             text NOT NULL,
  name_ar          text,
  level            text,
  capacity         integer,
  enrollment_fee   numeric DEFAULT 0,
  tuition_fee      numeric DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id            uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  email                text,
  first_name           text,
  last_name            text,
  avatar_url           text,
  must_change_password boolean DEFAULT false,
  academic_year_id     uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- Trigger : crée automatiquement un profil à chaque inscription utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── USER_ROLES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id        uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  role             public.app_role NOT NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT user_roles_user_tenant_role_unique UNIQUE (user_id, tenant_id, role)
);

-- ─── SETTINGS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id               uuid UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  active_academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  school_name             text NOT NULL DEFAULT 'École',
  school_name_ar          text DEFAULT '',
  school_logo             text,
  school_address          text DEFAULT '',
  school_address_ar       text DEFAULT '',
  school_phone            text DEFAULT '',
  school_email            text DEFAULT '',
  currency_code           text DEFAULT 'MAD',
  currency_symbol         text DEFAULT 'MAD',
  payment_mode            text DEFAULT 'installments'
                            CHECK (payment_mode IN ('installments','annual_upfront')),
  overdue_grace_period_days integer DEFAULT 5,
  annual_fee              numeric DEFAULT 0,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- ─── ACCOUNTING_CATEGORIES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounting_categories (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name_fr       text NOT NULL,
  name_ar       text,
  category_type text NOT NULL CHECK (category_type IN ('revenue','expense')),
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ─── STUDENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.students (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  class_id         uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  first_name       text NOT NULL,
  last_name        text NOT NULL,
  first_name_ar    text,
  last_name_ar     text,
  date_of_birth    date,
  gender           text,
  parent_name      text,
  parent_name_ar   text,
  address          text,
  phone            text,
  email            text,
  photo            text,
  annual_status    text DEFAULT 'pending',
  next_class       text,
  parent_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ─── ENROLLMENTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enrollments (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id            uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id      uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  enrollment_fee        numeric DEFAULT 0,
  tuition_fee           numeric DEFAULT 0,
  status                text NOT NULL DEFAULT 'pending',
  previous_class        text,
  new_class             text,
  enrollment_type       text DEFAULT 'new',
  notes                 text,
  enrollment_start_date date,
  enrollment_end_date   date,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  CONSTRAINT enrollments_unique UNIQUE (tenant_id, student_id, academic_year_id)
);

-- ─── FEE_TYPES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fee_types (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id              uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  accounting_category_id uuid REFERENCES public.accounting_categories(id) ON DELETE SET NULL,
  academic_year_id       uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  name_fr                text NOT NULL,
  name_ar                text,
  description_fr         text,
  default_amount         numeric DEFAULT 0,
  is_monthly             boolean DEFAULT false,
  is_mandatory           boolean DEFAULT true,
  is_active              boolean DEFAULT true,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

-- ─── PAYMENT_ITEMS ────────────────────────────────────────────────────────────
-- category_id nullable — ne pas bloquer les échéanciers automatiques
CREATE TABLE IF NOT EXISTS public.payment_items (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id       uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  enrollment_id    uuid REFERENCES public.enrollments(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  category_id      uuid REFERENCES public.accounting_categories(id) ON DELETE SET NULL,
  item_type        text NOT NULL,       -- 'enrollment_fee' | 'schedule' | 'manual'
  amount           numeric NOT NULL,
  paid_amount      numeric NOT NULL DEFAULT 0,
  remaining_amount numeric,
  due_date         date,
  payment_date     date,
  status           text NOT NULL DEFAULT 'pending', -- pending | partial | paid | overdue
  payment_method   text,
  reference_number text,
  settlement_date  date,
  notes            text,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ─── ACCOUNTING_TRANSACTIONS ──────────────────────────────────────────────────
-- student_id et payment_item_id ajoutés (simplification vs ecole-muret)
CREATE TABLE IF NOT EXISTS public.accounting_transactions (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id       uuid REFERENCES public.students(id) ON DELETE SET NULL,
  payment_item_id  uuid REFERENCES public.payment_items(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  category_id      uuid REFERENCES public.accounting_categories(id) ON DELETE SET NULL,
  transaction_type text DEFAULT 'payment',
  description_fr   text DEFAULT '',
  amount           numeric NOT NULL,
  transaction_date date DEFAULT CURRENT_DATE NOT NULL,
  payment_method   text,
  reference_number text,
  notes            text,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.tenants                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_types              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;

-- Fonction helper : retourne le tenant_id de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Politique générique : utilisateur authentifié voit son tenant
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'academic_years','classes','settings','accounting_categories',
    'students','enrollments','fee_types','payment_items','accounting_transactions'
  ] LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "tenant_isolation" ON public.%I;
      CREATE POLICY "tenant_isolation" ON public.%I
        FOR ALL TO authenticated
        USING (tenant_id = public.get_user_tenant_id())
        WITH CHECK (tenant_id = public.get_user_tenant_id());
    ', t, t);
  END LOOP;
END $$;

-- Profiles : chaque utilisateur voit/édite son propre profil
DROP POLICY IF EXISTS "own_profile" ON public.profiles;
CREATE POLICY "own_profile" ON public.profiles
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Tenants : un utilisateur voit son propre tenant
DROP POLICY IF EXISTS "own_tenant" ON public.tenants;
CREATE POLICY "own_tenant" ON public.tenants
  FOR ALL TO authenticated
  USING (id = public.get_user_tenant_id())
  WITH CHECK (id = public.get_user_tenant_id());

-- User_roles : un utilisateur voit ses propres rôles
DROP POLICY IF EXISTS "own_roles" ON public.user_roles;
CREATE POLICY "own_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role bypass (pour l'agent FastAPI)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenants','academic_years','classes','profiles','user_roles','settings',
    'accounting_categories','students','enrollments','fee_types',
    'payment_items','accounting_transactions'
  ] LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "service_role_bypass" ON public.%I;
      CREATE POLICY "service_role_bypass" ON public.%I
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    ', t, t);
  END LOOP;
END $$;
