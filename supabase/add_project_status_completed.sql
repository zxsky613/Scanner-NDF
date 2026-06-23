-- Statut projet « terminé » (完成).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'project_status'
      AND e.enumlabel = 'completed'
  ) THEN
    ALTER TYPE public.project_status ADD VALUE 'completed';
  END IF;
END $$;
