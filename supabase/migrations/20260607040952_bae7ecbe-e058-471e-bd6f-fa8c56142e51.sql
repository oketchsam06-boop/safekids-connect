
-- 1. Add 'found' to case_status enum
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'found';

-- 2. Extend missing_children with officer/source fields
ALTER TABLE public.missing_children
  ADD COLUMN IF NOT EXISTS found_at timestamptz,
  ADD COLUMN IF NOT EXISTS found_notes text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'parent',
  ADD COLUMN IF NOT EXISTS case_file_number text,
  ADD COLUMN IF NOT EXISTS station_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS investigating_officer text,
  ADD COLUMN IF NOT EXISTS assigned_officer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Add org_id to profiles (so officers can be linked to a station)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 4. Relax insert policy on missing_children so officers can also file station cases
DROP POLICY IF EXISTS "cases reporter insert" ON public.missing_children;
CREATE POLICY "cases reporter insert"
  ON public.missing_children
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'parent_guardian'::app_role)
      OR public.has_role(auth.uid(), 'police_admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  );
