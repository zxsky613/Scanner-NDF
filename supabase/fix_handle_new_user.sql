-- À exécuter une fois dans Supabase → SQL Editor si l'inscription renvoie
-- "Database error saving new user" (trigger profiles / search_path / cast rôle).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_role public.user_role;
BEGIN
  BEGIN
    new_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'employee'::public.user_role
    );
  EXCEPTION
    WHEN OTHERS THEN
      new_role := 'employee'::public.user_role;
  END;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.email), ''),
      'Utilisateur'
    ),
    new_role
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
