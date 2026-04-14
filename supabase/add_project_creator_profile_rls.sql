-- Permet à tout utilisateur connecté de voir nom / e-mail des profils qui sont
-- enregistrés comme créateurs d’un projet (embed PostgREST sur projects).
-- À exécuter une fois sur les bases déjà migrées sans cette politique.

DROP POLICY IF EXISTS "Authenticated can read project creator profiles" ON public.profiles;
CREATE POLICY "Authenticated can read project creator profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.created_by = profiles.id
    )
  );
