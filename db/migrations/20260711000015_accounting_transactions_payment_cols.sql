-- accounting_transactions était un tableau comptable général.
-- Le code de paiement élève attend student_id, payment_item_id, notes
-- et n'inclut pas category_id / description_fr / transaction_type.
-- On adapte : ajout des colonnes manquantes + rendre optionnels les champs comptables.

ALTER TABLE public.accounting_transactions
  ADD COLUMN IF NOT EXISTS student_id      uuid REFERENCES public.students(id),
  ADD COLUMN IF NOT EXISTS payment_item_id uuid REFERENCES public.payment_items(id),
  ADD COLUMN IF NOT EXISTS notes           text;

ALTER TABLE public.accounting_transactions
  ALTER COLUMN category_id      DROP NOT NULL,
  ALTER COLUMN description_fr   DROP NOT NULL,
  ALTER COLUMN transaction_type DROP NOT NULL;

NOTIFY pgrst, 'reload schema';
