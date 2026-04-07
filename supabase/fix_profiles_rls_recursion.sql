-- Évite: "infinite recursion detected in policy for relation profiles"
-- Les politiques SELECT sur `profiles` ne doivent pas sous-requêter `profiles` sans contourner la RLS.

-- 1) Fonction stable, exécutée avec les droits du propriétaire (bypass RLS pour la lecture du rôle courant)
CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 2) Remplacer les politiques problématiques
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
CREATE POLICY "Managers can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.current_profile_role() IN ('manager', 'finance'));

DROP POLICY IF EXISTS "Managers can view all expenses" ON public.expenses;
CREATE POLICY "Managers can view all expenses"
  ON public.expenses FOR SELECT
  USING (public.current_profile_role() IN ('manager', 'finance'));

DROP POLICY IF EXISTS "Managers can update expenses" ON public.expenses;
CREATE POLICY "Managers can update expenses"
  ON public.expenses FOR UPDATE
  USING (public.current_profile_role() IN ('manager', 'finance'));
