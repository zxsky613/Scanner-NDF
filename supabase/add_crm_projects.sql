-- CRM & projets : table projects, enums, expenses.project_id + RLS.
-- PRÉREQUIS : exécuter une fois, dans une requête séparée : add_user_role_sales.sql
-- (sinon erreur 55P04 — la valeur enum « sales » doit être commitée avant les politiques qui l’utilisent.)
--
-- Puis exécuter ce fichier une fois (Run).

-- 1. Enums projets
DO $$ BEGIN
  CREATE TYPE project_category AS ENUM (
    'sorting_equipment',
    'warehouse_equipment',
    'low_voltage',
    'office_renovation',
    'procurement_equipment'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM (
    'lead',
    'quote',
    'contract',
    'delivery',
    'lost'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Table projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category project_category NOT NULL,
  status project_status NOT NULL DEFAULT 'lead',
  scale TEXT NOT NULL DEFAULT '',
  cycle TEXT NOT NULL DEFAULT '',
  client_contact TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
CREATE POLICY "Authenticated users can view projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Sales and finance can insert projects" ON public.projects;
CREATE POLICY "Sales and finance can insert projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (public.current_profile_role() IN ('sales', 'finance', 'manager'));

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

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- 3. Frais : projet lié (nullable = « Quotidien »)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON public.expenses(project_id);

-- Option (affichage « personne en charge » / jointure profil créateur) : exécuter aussi
-- add_project_creator_profile_rls.sql une fois sur la base.
