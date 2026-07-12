-- Ajoute la FK manquante entre enrollments.academic_year_id et academic_years.id
-- Sans cette contrainte, PostgREST refusait le join academic_years!inner(year)
-- causant un 500 sur GET /api/enrollments.

ALTER TABLE public.enrollments
  ADD CONSTRAINT fk_enrollments_academic_year
  FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);

-- Recharge le cache de schéma PostgREST pour qu'il découvre la nouvelle FK
NOTIFY pgrst, 'reload schema';
