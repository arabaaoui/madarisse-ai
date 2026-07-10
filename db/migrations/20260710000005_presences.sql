CREATE TABLE IF NOT EXISTS public.presences (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id        uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  date            date NOT NULL,
  period          text DEFAULT 'full_day',  -- 'full_day' | 'morning' | 'afternoon'
  status          text NOT NULL DEFAULT 'present',  -- 'present' | 'absent' | 'late' | 'excused'
  notes           text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  CONSTRAINT presences_student_date_period_unique UNIQUE (tenant_id, student_id, date, period)
);

CREATE INDEX IF NOT EXISTS idx_presences_tenant_date ON public.presences(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_presences_student ON public.presences(student_id);
CREATE INDEX IF NOT EXISTS idx_presences_class ON public.presences(class_id);

ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presences_tenant_select" ON public.presences FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "presences_tenant_insert" ON public.presences FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "presences_tenant_update" ON public.presences FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "presences_service_bypass" ON public.presences FOR ALL
  USING (auth.role() = 'service_role');
