-- Flux d'inscription agentique : l'agent crée une inscription en attente sans élève.
-- L'élève est créé seulement lors de la validation admin (enrollment.validate).

-- 1. student_id devient nullable : permet une inscription sans élève préexistant
ALTER TABLE public.enrollments ALTER COLUMN student_id DROP NOT NULL;

-- 2. Colonnes pour stocker l'identité du candidat (rempli par l'agent)
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS candidate_first_name text,
  ADD COLUMN IF NOT EXISTS candidate_last_name  text;

-- 3. Mise à jour du trigger : ne pas tenter de créer les payment_items si student_id est NULL
--    (les items seront créés par _execute_enrollment_validate après création de l'élève)
CREATE OR REPLACE FUNCTION public.create_payment_schedules_for_enrollment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  month_offset integer;
  due_date date;
  monthly_amount numeric;
  active_semester uuid;
  enrollment_category uuid;
  tuition_category uuid;
  academic_year_start date;
  academic_year_end date;
  total_months integer;
  v_year_text text;
  v_start_year int;
  current_month date;
  start_enrollment_date date;
  end_enrollment_date date;
  school_payment_mode text;
BEGIN
  -- Inscription agent en attente : pas de student_id encore, on ne crée pas les échéances
  IF NEW.student_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- IMPORTANT: Check school payment mode from settings
  SELECT COALESCE(payment_mode, 'installments') INTO school_payment_mode
  FROM settings
  WHERE tenant_id = NEW.tenant_id
  LIMIT 1;

  -- Determine active semester for this academic year
  SELECT id INTO active_semester
  FROM semesters
  WHERE academic_year_id = NEW.academic_year_id AND is_active = true
  LIMIT 1;

  -- Guard: avoid duplicates - check if any schedule exists linked to this enrollment
  IF EXISTS (
    SELECT 1 FROM payment_items
    WHERE enrollment_id = NEW.id
      AND item_type = 'schedule'
  ) THEN
    RETURN NEW;
  END IF;

  -- Ensure required accounting categories exist
  SELECT id INTO enrollment_category
  FROM accounting_categories
  WHERE tenant_id = NEW.tenant_id AND name_fr = 'Frais d''inscription'
  LIMIT 1;

  IF enrollment_category IS NULL THEN
    INSERT INTO accounting_categories (tenant_id, name_fr, name_ar, category_type)
    VALUES (NEW.tenant_id, 'Frais d''inscription', 'رسوم التسجيل', 'revenue')
    RETURNING id INTO enrollment_category;
  END IF;

  SELECT id INTO tuition_category
  FROM accounting_categories
  WHERE tenant_id = NEW.tenant_id AND name_fr = 'Frais de scolarité'
  LIMIT 1;

  IF tuition_category IS NULL THEN
    INSERT INTO accounting_categories (tenant_id, name_fr, name_ar, category_type)
    VALUES (NEW.tenant_id, 'Frais de scolarité', 'الرسوم الدراسية', 'revenue')
    RETURNING id INTO tuition_category;
  END IF;

  -- Get academic year dates
  SELECT start_date, end_date, year INTO academic_year_start, academic_year_end, v_year_text
  FROM academic_years
  WHERE id = NEW.academic_year_id;

  -- Calculate academic year start if not set
  IF academic_year_start IS NULL THEN
    IF v_year_text IS NOT NULL AND v_year_text ~ '^[0-9]{4}' THEN
      v_start_year := split_part(v_year_text, '-', 1)::int;
      academic_year_start := make_date(v_start_year, 9, 1);
    ELSE
      IF EXTRACT(MONTH FROM CURRENT_DATE) >= 7 THEN
        v_start_year := EXTRACT(YEAR FROM CURRENT_DATE)::int;
      ELSE
        v_start_year := (EXTRACT(YEAR FROM CURRENT_DATE)::int) - 1;
      END IF;
      academic_year_start := make_date(v_start_year, 9, 1);
    END IF;
  END IF;

  -- Use enrollment dates if provided, otherwise use academic year dates
  start_enrollment_date := COALESCE(NEW.enrollment_start_date, academic_year_start);
  end_enrollment_date   := COALESCE(NEW.enrollment_end_date,   academic_year_end);

  -- Calculate total months between start and end enrollment dates
  IF end_enrollment_date IS NOT NULL THEN
    total_months := EXTRACT(MONTH FROM age(end_enrollment_date, start_enrollment_date))::integer + 1;
    total_months := GREATEST(1, LEAST(12, total_months));
  ELSE
    total_months := 10;
  END IF;

  -- Create enrollment fee schedule (always created regardless of payment mode)
  IF COALESCE(NEW.enrollment_fee, 0) > 0 THEN
    INSERT INTO payment_items (
      tenant_id, student_id, category_id, academic_year_id, semester_id,
      item_type, amount, due_date, status, enrollment_id
    ) VALUES (
      NEW.tenant_id, NEW.student_id, enrollment_category, NEW.academic_year_id,
      active_semester, 'schedule', NEW.enrollment_fee, CURRENT_DATE, 'pending', NEW.id
    );
  END IF;

  -- Create tuition schedules - BEHAVIOR DEPENDS ON PAYMENT MODE
  IF COALESCE(NEW.tuition_fee, 0) > 0 THEN

    IF school_payment_mode = 'annual_upfront' THEN
      -- ANNUAL MODE: single schedule created elsewhere, skip here
      NULL;

    ELSE
      -- INSTALLMENTS MODE: Create monthly schedules
      monthly_amount := NEW.tuition_fee;
      current_month  := date_trunc('month', start_enrollment_date);

      FOR month_offset IN 0..(total_months - 1) LOOP
        due_date := (current_month + (month_offset || ' month')::interval)::date;

        IF end_enrollment_date IS NOT NULL AND due_date > end_enrollment_date THEN
          EXIT;
        END IF;

        INSERT INTO payment_items (
          tenant_id, student_id, category_id, academic_year_id, semester_id,
          item_type, amount, due_date, status, enrollment_id
        ) VALUES (
          NEW.tenant_id, NEW.student_id, tuition_category, NEW.academic_year_id,
          active_semester, 'schedule', monthly_amount, due_date, 'pending', NEW.id
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
