-- Permet à un employé de voir le nom de l'admin qui a validé/refusé sa note de frais.
DROP POLICY IF EXISTS "Users can view reviewers of their expenses" ON public.profiles;
CREATE POLICY "Users can view reviewers of their expenses"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.reviewed_by = profiles.id
        AND e.user_id = auth.uid()
    )
  );
