-- Catégorie « achats locaux pour équipementier » (替设备商本地代采).
-- + autorise la modification des notes rejetées par l’employé (resoumission → pending).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'expense_category'
      AND e.enumlabel = 'local_procurement'
  ) THEN
    ALTER TYPE public.expense_category ADD VALUE 'local_procurement';
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can update own pending expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own pending or rejected expenses" ON public.expenses;

CREATE POLICY "Users can update own pending or rejected expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending', 'rejected'))
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'rejected'));
