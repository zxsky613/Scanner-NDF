-- Colonnes financières projet + coûts fixes (marge nette).
-- À exécuter sur le projet Supabase après review.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS contract_amount NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS payment_terms TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cost_labor NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS cost_rent NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS cost_materials NUMERIC(14, 2);

COMMENT ON COLUMN public.projects.contract_amount IS 'Montant devis / contrat signé (€), saisi Sales (popup) ou Finance.';
COMMENT ON COLUMN public.projects.payment_terms IS 'Conditions de paiement (texte libre), saisi Finance.';
COMMENT ON COLUMN public.projects.cost_labor IS 'Coût main-d''œuvre estimé (€), saisi Finance.';
COMMENT ON COLUMN public.projects.cost_rent IS 'Coût location (€), saisi Finance.';
COMMENT ON COLUMN public.projects.cost_materials IS 'Coût matériaux (€), saisi Finance.';
