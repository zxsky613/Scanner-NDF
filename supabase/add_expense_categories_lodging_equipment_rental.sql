-- Catégories lodging (logement / 住宿) et equipment_rental (location matériel / 设备租赁).
-- À exécuter dans SQL Editor Supabase si l’erreur :
--   invalid input value for enum expense_category: "lodging"

DO $mig$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    INNER JOIN pg_type t ON t.oid = e.enumtypid
    INNER JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'expense_category'
      AND e.enumlabel = 'lodging'
  ) THEN
    ALTER TYPE public.expense_category ADD VALUE 'lodging';
  END IF;
END
$mig$;

DO $mig$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    INNER JOIN pg_type t ON t.oid = e.enumtypid
    INNER JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'expense_category'
      AND e.enumlabel = 'equipment_rental'
  ) THEN
    ALTER TYPE public.expense_category ADD VALUE 'equipment_rental';
  END IF;
END
$mig$;
