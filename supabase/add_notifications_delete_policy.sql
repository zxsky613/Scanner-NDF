-- Permet à chaque utilisateur de supprimer ses propres lignes dans notifications.
-- Exécuter une fois si la table existait déjà sans cette politique.

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);
