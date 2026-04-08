-- Politiques Storage pour le bucket "receipts" (bucket privé + URLs signées dans l’app).
-- À exécuter dans le SQL Editor Supabase après création du bucket `receipts` (non public).
-- Requis pour : employé = lecture de son dossier ; finance/manager = lecture de tous les justificatifs.

-- Supprimer d’anciennes politiques du même nom si vous ré-exécutez le script :
-- DROP POLICY IF EXISTS "receipts_select_own_folder" ON storage.objects;
-- DROP POLICY IF EXISTS "receipts_select_finance_manager" ON storage.objects;
-- DROP POLICY IF EXISTS "receipts_insert_own_folder" ON storage.objects;

CREATE POLICY "receipts_insert_own_folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND name LIKE auth.uid()::text || '/%'
  );

CREATE POLICY "receipts_select_own_folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND name LIKE auth.uid()::text || '/%'
  );

CREATE POLICY "receipts_select_finance_manager"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.current_profile_role() IN ('manager', 'finance')
  );
