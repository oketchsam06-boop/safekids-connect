CREATE OR REPLACE FUNCTION public.ensure_user_account_defaults(_full_name text DEFAULT NULL, _phone text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_email text := auth.jwt() ->> 'email';
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    current_user_id,
    COALESCE(NULLIF(BTRIM(_full_name), ''), current_email),
    NULLIF(BTRIM(_phone), '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(NULLIF(BTRIM(EXCLUDED.full_name), ''), public.profiles.full_name),
    phone = COALESCE(NULLIF(BTRIM(EXCLUDED.phone), ''), public.profiles.phone),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, 'parent_guardian')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_account_defaults(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_account_defaults(text, text) TO authenticated;