-- Catégorie « Autres » (other) pour le filtre et les notes.
-- À exécuter une fois dans SQL Editor Supabase si l’erreur :
--   invalid input value for enum expense_category: "other"
-- (bases créées avant l’ajout de cette valeur dans l’enum.)

DO $mig$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    INNER JOIN pg_type t ON t.oid = e.enumtypid
    INNER JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'expense_category'
      AND e.enumlabel = 'other'
  ) THEN
    ALTER TYPE public.expense_category ADD VALUE 'other';
  END IF;
END
$mig$;
