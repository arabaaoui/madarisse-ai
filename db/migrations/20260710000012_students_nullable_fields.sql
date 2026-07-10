-- Les élèves créés via l'agent d'inscription (statut 'pending') n'ont pas
-- toujours date_of_birth/gender au moment de l'inscription — ces données
-- sont complétées dans la fiche élève par la suite.
ALTER TABLE public.students ALTER COLUMN date_of_birth DROP NOT NULL;
ALTER TABLE public.students ALTER COLUMN gender DROP NOT NULL;
