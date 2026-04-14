-- Projets : mise à jour / suppression réservées au créateur du projet ou au rôle finance.
-- (Les autres commerciaux voient les projets mais ne peuvent pas les modifier ni les supprimer.)
-- Exécuter une fois sur une base déjà migrée (CRM).

DROP POLICY IF EXISTS "Sales and finance can update projects" ON public.projects;
DROP POLICY IF EXISTS "Creator or finance can update projects" ON public.projects;
CREATE POLICY "Creator or finance can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    public.current_profile_role() = 'finance'
    OR (created_by IS NOT NULL AND created_by = auth.uid())
  )
  WITH CHECK (
    public.current_profile_role() = 'finance'
    OR (created_by IS NOT NULL AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Finance can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Creator or finance can delete projects" ON public.projects;
CREATE POLICY "Creator or finance can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (
    public.current_profile_role() = 'finance'
    OR (created_by IS NOT NULL AND created_by = auth.uid())
  );
