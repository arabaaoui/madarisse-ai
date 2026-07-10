-- =============================================================================
-- Phase 4 modules — madarisse-ai
-- Devoirs, Notes, Calendrier, Messages
-- Idempotent via IF NOT EXISTS.
-- =============================================================================

-- ─── DEVOIRS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.devoirs (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  class_id         uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  subject          text NOT NULL,
  title            text NOT NULL,
  description      text,
  due_date         date NOT NULL,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devoirs_tenant_due ON public.devoirs(tenant_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_devoirs_class ON public.devoirs(class_id);

ALTER TABLE public.devoirs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devoirs_tenant_select" ON public.devoirs FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "devoirs_tenant_insert" ON public.devoirs FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "devoirs_tenant_update" ON public.devoirs FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "devoirs_tenant_delete" ON public.devoirs FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "devoirs_service_bypass" ON public.devoirs FOR ALL
  USING (auth.role() = 'service_role');

-- ─── NOTES ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notes (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id       uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id         uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  subject          text NOT NULL,
  exam_type        text DEFAULT 'cc',  -- 'cc' | 'exam' | 'oral' | 'project'
  grade            numeric CHECK (grade >= 0 AND grade <= 20),
  coefficient      numeric DEFAULT 1,
  semester         integer DEFAULT 1,  -- 1 | 2
  notes            text,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_tenant ON public.notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notes_student ON public.notes(student_id);
CREATE INDEX IF NOT EXISTS idx_notes_class ON public.notes(class_id);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_tenant_select" ON public.notes FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "notes_tenant_insert" ON public.notes FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "notes_tenant_update" ON public.notes FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "notes_tenant_delete" ON public.notes FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "notes_service_bypass" ON public.notes FOR ALL
  USING (auth.role() = 'service_role');

-- ─── CALENDRIER_EVENTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calendrier_events (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  start_date  date NOT NULL,
  end_date    date,
  event_type  text DEFAULT 'other',  -- 'holiday' | 'exam' | 'meeting' | 'other'
  class_id    uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendrier_tenant_start ON public.calendrier_events(tenant_id, start_date);
CREATE INDEX IF NOT EXISTS idx_calendrier_class ON public.calendrier_events(class_id);

ALTER TABLE public.calendrier_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendrier_tenant_select" ON public.calendrier_events FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "calendrier_tenant_insert" ON public.calendrier_events FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "calendrier_tenant_update" ON public.calendrier_events FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "calendrier_tenant_delete" ON public.calendrier_events FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "calendrier_service_bypass" ON public.calendrier_events FOR ALL
  USING (auth.role() = 'service_role');

-- ─── MESSAGES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject      text NOT NULL,
  body         text NOT NULL,
  is_read      boolean DEFAULT false,
  parent_id    uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_tenant ON public.messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON public.messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON public.messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_tenant_select" ON public.messages FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    AND (from_user_id = auth.uid() OR to_user_id = auth.uid() OR to_user_id IS NULL)
  );

CREATE POLICY "messages_tenant_insert" ON public.messages FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "messages_tenant_update" ON public.messages FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "messages_service_bypass" ON public.messages FOR ALL
  USING (auth.role() = 'service_role');
