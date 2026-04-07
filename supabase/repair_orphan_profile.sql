-- Réparer un utilisateur présent dans auth.users mais absent de public.profiles
-- Remplace USER_UUID et les valeurs ci-dessous (depuis Authentication → utilisateur).

-- INSERT INTO public.profiles (id, email, full_name, role)
-- VALUES (
--   'USER_UUID'::uuid,
--   'meme-email@example.com',
--   'Prénom Nom',
--   'employee'::public.user_role
-- );
