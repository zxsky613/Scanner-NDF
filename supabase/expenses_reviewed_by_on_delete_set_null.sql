-- Libère les références reviewed_by lors de la suppression d’un profil (compte utilisateur).
-- À exécuter dans le SQL Editor Supabase avant d’utiliser la fonction Edge delete-account.

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_reviewed_by_fkey;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
