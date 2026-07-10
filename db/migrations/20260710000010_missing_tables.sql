-- =============================================================================
-- Migration: 20260710000010_missing_tables.sql
-- Description: Add all tables present in madarisse-src but missing from madarisse-ai
-- Tables: semesters, units, subjects, unit_class_associations,
--         teacher_subject_class_assignments, modules, tenant_modules,
--         tenant_module_role_permissions, parent_student_links,
--         employees, employee_salary_payments, student_notes, report_cards,
--         incidents, preinscriptions
-- Also: indexes, RLS policies, default module seeds, settings/tenants column additions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SEMESTERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.semesters (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name             text NOT NULL,
  name_ar          text,
  start_date       date,
  end_date         date,
  is_active        boolean DEFAULT false,
  order_num        integer DEFAULT 1,
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT semesters_tenant_year_name_unique UNIQUE (tenant_id, academic_year_id, name)
);

-- ---------------------------------------------------------------------------
-- 2. UNITS (pedagogic units — grouping of subjects)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.units (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name_fr     text NOT NULL,
  name_ar     text,
  coefficient numeric DEFAULT 1,
  created_at  timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. SUBJECTS (belong to a unit)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id     uuid REFERENCES public.units(id) ON DELETE SET NULL,
  name_fr     text NOT NULL,
  name_ar     text,
  coefficient numeric DEFAULT 1,
  created_at  timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. UNIT_CLASS_ASSOCIATIONS (which units are taught in which classes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unit_class_associations (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id          uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  class_id         uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT uca_unique UNIQUE (tenant_id, unit_id, class_id)
);

-- ---------------------------------------------------------------------------
-- 5. TEACHER_SUBJECT_CLASS_ASSIGNMENTS (teacher → subject → class)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_subject_class_assignments (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  teacher_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id       uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id         uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  unit_id          uuid REFERENCES public.units(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  semester_id      uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT tsca_unique UNIQUE (tenant_id, teacher_id, subject_id, class_id)
);

-- ---------------------------------------------------------------------------
-- 6. MODULES (global module catalog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.modules (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name             text NOT NULL UNIQUE,
  display_name_fr  text NOT NULL,
  display_name_ar  text,
  description_fr   text,
  icon             text,
  is_core          boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7. TENANT_MODULES (active modules per tenant)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_modules (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id    uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  is_active    boolean DEFAULT true,
  activated_at timestamptz DEFAULT now(),
  CONSTRAINT tenant_modules_unique UNIQUE (tenant_id, module_id)
);

-- ---------------------------------------------------------------------------
-- 8. TENANT_MODULE_ROLE_PERMISSIONS (which roles can access each module per tenant)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_module_role_permissions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id  uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  role       text NOT NULL,
  can_access boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tmrp_unique UNIQUE (tenant_id, module_id, role)
);

-- ---------------------------------------------------------------------------
-- 9. PARENT_STUDENT_LINKS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT psl_unique UNIQUE (tenant_id, parent_id, student_id)
);

-- ---------------------------------------------------------------------------
-- 10. EMPLOYEES (HR)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  first_name_ar text,
  last_name_ar  text,
  role          text DEFAULT 'teacher',
  email         text,
  phone         text,
  hire_date     date,
  salary_base   numeric DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 11. EMPLOYEE_SALARY_PAYMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_salary_payments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month       text NOT NULL,  -- YYYY-MM
  amount      numeric NOT NULL,
  paid_at     date,
  notes       text,
  created_at  timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 12. STUDENT_NOTES (JSONB source of truth for grades)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_notes (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id       uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id         uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  semester_id      uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  subject_scores   jsonb DEFAULT '{}',
  general_comment  text,
  teacher_comment  text,
  status           text DEFAULT 'draft',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT student_notes_unique UNIQUE (tenant_id, student_id, academic_year_id, semester_id)
);

-- ---------------------------------------------------------------------------
-- 13. REPORT_CARDS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_cards (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id       uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  semester_id      uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  class_id         uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  overall_average  numeric,
  rank_in_class    integer,
  teacher_comment  text,
  generated_at     timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 14. INCIDENTS (discipline)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incidents (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id      uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  severity      text DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'major')),
  description   text NOT NULL,
  action_taken  text,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 15. PREINSCRIPTIONS (public pre-registration form)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.preinscriptions (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  first_name       text NOT NULL,
  last_name        text NOT NULL,
  first_name_ar    text,
  last_name_ar     text,
  date_of_birth    date,
  gender           text,
  desired_class    text,
  parent_name      text,
  parent_phone     text,
  parent_email     text,
  notes            text,
  status           text DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'enrolled', 'rejected')),
  created_at       timestamptz DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_semesters_tenant     ON public.semesters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_semesters_year       ON public.semesters(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_units_tenant         ON public.units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subjects_tenant      ON public.subjects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subjects_unit        ON public.subjects(unit_id);
CREATE INDEX IF NOT EXISTS idx_uca_tenant           ON public.unit_class_associations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_uca_class            ON public.unit_class_associations(class_id);
CREATE INDEX IF NOT EXISTS idx_tsca_tenant          ON public.teacher_subject_class_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tsca_teacher         ON public.teacher_subject_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant ON public.tenant_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tmrp_tenant          ON public.tenant_module_role_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_psl_tenant           ON public.parent_student_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_psl_parent           ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_psl_student          ON public.parent_student_links(student_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant     ON public.employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_emp_salary_tenant    ON public.employee_salary_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_emp_salary_employee  ON public.employee_salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_tenant  ON public.student_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_student ON public.student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_tenant  ON public.report_cards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_student ON public.report_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_incidents_tenant     ON public.incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incidents_student    ON public.incidents(student_id);
CREATE INDEX IF NOT EXISTS idx_preinscriptions_tenant ON public.preinscriptions(tenant_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Helper: all tables below use the same two-policy pattern:
--   tenant_*  — authenticated users can only see/mutate rows for their own tenant
--   service_role_bypass — service_role skips RLS entirely

-- ----- semesters -----
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS semesters_tenant_select ON public.semesters
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS semesters_tenant_insert ON public.semesters
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS semesters_tenant_update ON public.semesters
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS semesters_service_role_bypass ON public.semesters
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- units -----
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS units_tenant_select ON public.units
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS units_tenant_insert ON public.units
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS units_tenant_update ON public.units
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS units_service_role_bypass ON public.units
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- subjects -----
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS subjects_tenant_select ON public.subjects
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS subjects_tenant_insert ON public.subjects
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS subjects_tenant_update ON public.subjects
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS subjects_service_role_bypass ON public.subjects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- unit_class_associations -----
ALTER TABLE public.unit_class_associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS uca_tenant_select ON public.unit_class_associations
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS uca_tenant_insert ON public.unit_class_associations
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS uca_tenant_update ON public.unit_class_associations
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS uca_service_role_bypass ON public.unit_class_associations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- teacher_subject_class_assignments -----
ALTER TABLE public.teacher_subject_class_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS tsca_tenant_select ON public.teacher_subject_class_assignments
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS tsca_tenant_insert ON public.teacher_subject_class_assignments
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS tsca_tenant_update ON public.teacher_subject_class_assignments
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS tsca_service_role_bypass ON public.teacher_subject_class_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- modules (global catalog — read-only for authenticated, managed via service_role) -----
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS modules_select ON public.modules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS modules_service_role_bypass ON public.modules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- tenant_modules -----
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS tenant_modules_tenant_select ON public.tenant_modules
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS tenant_modules_tenant_insert ON public.tenant_modules
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS tenant_modules_tenant_update ON public.tenant_modules
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS tenant_modules_service_role_bypass ON public.tenant_modules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- tenant_module_role_permissions -----
ALTER TABLE public.tenant_module_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS tmrp_tenant_select ON public.tenant_module_role_permissions
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS tmrp_tenant_insert ON public.tenant_module_role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS tmrp_tenant_update ON public.tenant_module_role_permissions
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS tmrp_service_role_bypass ON public.tenant_module_role_permissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- parent_student_links -----
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS psl_tenant_select ON public.parent_student_links
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS psl_tenant_insert ON public.parent_student_links
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS psl_tenant_update ON public.parent_student_links
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS psl_service_role_bypass ON public.parent_student_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- employees -----
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS employees_tenant_select ON public.employees
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS employees_tenant_insert ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS employees_tenant_update ON public.employees
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS employees_service_role_bypass ON public.employees
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- employee_salary_payments -----
ALTER TABLE public.employee_salary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS emp_salary_tenant_select ON public.employee_salary_payments
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS emp_salary_tenant_insert ON public.employee_salary_payments
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS emp_salary_tenant_update ON public.employee_salary_payments
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS emp_salary_service_role_bypass ON public.employee_salary_payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- student_notes -----
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS student_notes_tenant_select ON public.student_notes
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS student_notes_tenant_insert ON public.student_notes
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS student_notes_tenant_update ON public.student_notes
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS student_notes_service_role_bypass ON public.student_notes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- report_cards -----
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS report_cards_tenant_select ON public.report_cards
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS report_cards_tenant_insert ON public.report_cards
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS report_cards_tenant_update ON public.report_cards
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS report_cards_service_role_bypass ON public.report_cards
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- incidents -----
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS incidents_tenant_select ON public.incidents
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS incidents_tenant_insert ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS incidents_tenant_update ON public.incidents
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS incidents_service_role_bypass ON public.incidents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----- preinscriptions -----
ALTER TABLE public.preinscriptions ENABLE ROW LEVEL SECURITY;

-- Public insert (anonymous enrollment form)
CREATE POLICY IF NOT EXISTS preinscriptions_public_insert ON public.preinscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Tenant staff can read/update their own tenant's pre-registrations
CREATE POLICY IF NOT EXISTS preinscriptions_tenant_select ON public.preinscriptions
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS preinscriptions_tenant_update ON public.preinscriptions
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS preinscriptions_service_role_bypass ON public.preinscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- SEED: DEFAULT MODULES
-- =============================================================================
INSERT INTO public.modules (name, display_name_fr, display_name_ar, is_core) VALUES
  ('enrollment',   'Inscriptions',     'التسجيلات',      true),
  ('payments',     'Paiements',        'المدفوعات',      true),
  ('accounting',   'Comptabilité',     'المحاسبة',       false),
  ('notes',        'Notes & Bulletins','النقاط والكشوف', false),
  ('attendance',   'Présences',        'الحضور',         false),
  ('discipline',   'Discipline',       'الانضباط',       false),
  ('homework',     'Devoirs',          'الواجبات',       false),
  ('calendar',     'Calendrier',       'التقويم',        false),
  ('messages',     'Messagerie',       'المراسلة',       false),
  ('employees',    'Employés (RH)',    'الموظفون',       false),
  ('ai_assistant', 'Assistant IA',     'المساعد الذكي',  true),
  ('reporting',    'Reporting',        'التقارير',       false),
  ('mcp',          'Serveur MCP',      'خادم MCP',       false)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- ALTER EXISTING TABLES: settings
-- =============================================================================
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS overdue_grace_period_days       integer DEFAULT 5;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS active_semester_id              uuid
    REFERENCES public.semesters(id) ON DELETE SET NULL;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS achievement_levels              jsonb
    DEFAULT '{"rougeMax": 8, "jauneMax": 12, "bleuMax": 15, "vertMin": 15}';

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS discipline_thresholds           jsonb
    DEFAULT '{"minor_weight": 1, "moderate_weight": 3, "major_weight": 5, "good_max": 3, "average_max": 8}';

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS public_preinscription_enabled   boolean DEFAULT false;

-- =============================================================================
-- ALTER EXISTING TABLES: tenants
-- =============================================================================
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS slug                text UNIQUE;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
