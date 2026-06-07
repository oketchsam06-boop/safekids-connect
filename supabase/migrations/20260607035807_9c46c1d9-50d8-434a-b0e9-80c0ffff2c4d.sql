
-- 1. Storage: drop folder-prefix-based policies; all access goes through service role server-side
DROP POLICY IF EXISTS "child-photos delete own" ON storage.objects;
DROP POLICY IF EXISTS "child-photos read own or police" ON storage.objects;
DROP POLICY IF EXISTS "child-photos upload own" ON storage.objects;

-- No SELECT/INSERT/UPDATE/DELETE policies on child-photos = no direct client access.
-- Service role (used by server functions) bypasses RLS and remains the only path.

-- 2. user_roles: explicit policies so only super_admin can mutate roles
DROP POLICY IF EXISTS "user_roles super manage" ON public.user_roles;
CREATE POLICY "user_roles super manage"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 3. has_role: restrict EXECUTE so signed-in users can't call the SECURITY DEFINER fn directly.
-- RLS policies invoke it via the table owner, so revoking from authenticated/anon/public is safe.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
