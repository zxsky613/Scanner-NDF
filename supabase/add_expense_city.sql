-- Lieu (ville) obligatoire côté application pour les nouvelles notes.
-- Exécuter dans le SQL Editor Supabase (ou migration) après déploiement de l’app.

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.expenses.city IS 'Ville du lieu de dépense (saisie employé ou extraction IA).';
