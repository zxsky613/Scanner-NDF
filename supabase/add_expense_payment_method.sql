-- Mode de paiement : carte ou espèces (obligatoire côté application à la soumission).
-- Exécuter dans le SQL Editor Supabase après déploiement de l’app.

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS payment_method TEXT
CHECK (payment_method IS NULL OR payment_method IN ('card', 'cash'));

COMMENT ON COLUMN public.expenses.payment_method IS 'Mode de paiement : card (carte) ou cash (espèces).';
