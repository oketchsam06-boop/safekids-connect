
-- Enums
CREATE TYPE public.app_role AS ENUM ('parent_guardian','school_shelter','police_admin','super_admin');
CREATE TYPE public.case_status AS ENUM ('open','under_review','matched','closed');
CREATE TYPE public.match_decision AS ENUM ('pending','confirmed','rejected','escalated');
CREATE TYPE public.org_type AS ENUM ('police','school','shelter','hospital','ngo');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table to avoid recursive RLS)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_type public.org_type NOT NULL,
  county TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO anon, authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orgs public read" ON public.organizations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "super admin manage orgs" ON public.organizations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- Consents (versioned, immutable history)
CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  version TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  ip_address TEXT
);
GRANT SELECT, INSERT, UPDATE ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

-- Missing children cases
CREATE TABLE public.missing_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_initial TEXT,
  age INTEGER NOT NULL CHECK (age >= 0 AND age <= 18),
  gender TEXT,
  last_seen_at TIMESTAMPTZ,
  last_seen_lat DOUBLE PRECISION,
  last_seen_lng DOUBLE PRECISION,
  last_seen_location_text TEXT,
  description TEXT,
  status public.case_status NOT NULL DEFAULT 'open',
  county TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.missing_children TO authenticated;
GRANT ALL ON public.missing_children TO service_role;
ALTER TABLE public.missing_children ENABLE ROW LEVEL SECURITY;

-- Photos (private storage paths)
CREATE TABLE public.child_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.missing_children(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_photos TO authenticated;
GRANT ALL ON public.child_photos TO service_role;
ALTER TABLE public.child_photos ENABLE ROW LEVEL SECURITY;

-- Sightings
CREATE TABLE public.sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  location_text TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sightings TO authenticated;
GRANT ALL ON public.sightings TO service_role;
ALTER TABLE public.sightings ENABLE ROW LEVEL SECURITY;

-- Match candidates (AI suggestion, human-confirmed)
CREATE TABLE public.match_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sighting_id UUID NOT NULL REFERENCES public.sightings(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.missing_children(id) ON DELETE CASCADE,
  ai_score DOUBLE PRECISION NOT NULL,
  ai_rationale TEXT,
  decision public.match_decision NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_reason TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sighting_id, child_id)
);
GRANT SELECT, INSERT, UPDATE ON public.match_candidates TO authenticated;
GRANT ALL ON public.match_candidates TO service_role;
ALTER TABLE public.match_candidates ENABLE ROW LEVEL SECURITY;

-- Emergency contacts
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.missing_children(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relation TEXT,
  phone TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Case updates
CREATE TABLE public.case_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.missing_children(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.case_updates TO authenticated;
GRANT ALL ON public.case_updates TO service_role;
ALTER TABLE public.case_updates ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Audit logs (append-only)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Block UPDATE/DELETE on audit_logs even if grants exist
CREATE OR REPLACE FUNCTION public.audit_logs_no_mutate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;
CREATE TRIGGER trg_audit_no_update BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_no_mutate();

-- RLS policies
-- profiles
CREATE POLICY "profile self read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'police_admin'));
CREATE POLICY "profile self upsert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profile self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- user_roles: only super_admin can read everyone; users read own
CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));

-- consents
CREATE POLICY "consents self all" ON public.consents FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- missing_children: guardian sees own; police/super sees all
CREATE POLICY "cases reporter read" ON public.missing_children FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'police_admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "cases reporter insert" ON public.missing_children FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND public.has_role(auth.uid(),'parent_guardian'));
CREATE POLICY "cases reporter update" ON public.missing_children FOR UPDATE TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'police_admin'))
  WITH CHECK (reporter_id = auth.uid() OR public.has_role(auth.uid(),'police_admin'));

-- child_photos: reporter of parent case OR police/super
CREATE POLICY "photos reporter read" ON public.child_photos FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.missing_children mc WHERE mc.id = child_id AND mc.reporter_id = auth.uid())
    OR public.has_role(auth.uid(),'police_admin') OR public.has_role(auth.uid(),'super_admin')
  );
CREATE POLICY "photos reporter insert" ON public.child_photos FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.missing_children mc WHERE mc.id = child_id AND mc.reporter_id = auth.uid()
    )
  );
CREATE POLICY "photos reporter delete" ON public.child_photos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.missing_children mc WHERE mc.id = child_id AND mc.reporter_id = auth.uid()));

-- sightings: reporter reads own; police/super read all
CREATE POLICY "sightings reporter read" ON public.sightings FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'police_admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "sightings reporter insert" ON public.sightings FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND (public.has_role(auth.uid(),'school_shelter') OR public.has_role(auth.uid(),'police_admin') OR public.has_role(auth.uid(),'parent_guardian')));

-- match_candidates: police/super see all; guardian sees confirmed for their child only
CREATE POLICY "matches police read" ON public.match_candidates FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'police_admin') OR public.has_role(auth.uid(),'super_admin')
    OR (decision='confirmed' AND EXISTS(SELECT 1 FROM public.missing_children mc WHERE mc.id = child_id AND mc.reporter_id = auth.uid()))
  );
CREATE POLICY "matches police update" ON public.match_candidates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'police_admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'police_admin') OR public.has_role(auth.uid(),'super_admin'));

-- emergency_contacts
CREATE POLICY "contacts reporter all" ON public.emergency_contacts FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.missing_children mc WHERE mc.id = child_id AND (mc.reporter_id = auth.uid() OR public.has_role(auth.uid(),'police_admin'))))
  WITH CHECK (EXISTS(SELECT 1 FROM public.missing_children mc WHERE mc.id = child_id AND mc.reporter_id = auth.uid()));

-- case_updates
CREATE POLICY "updates reporter and police read" ON public.case_updates FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.missing_children mc WHERE mc.id = child_id AND (mc.reporter_id = auth.uid() OR public.has_role(auth.uid(),'police_admin') OR public.has_role(auth.uid(),'super_admin'))));
CREATE POLICY "updates author insert" ON public.case_updates FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS(SELECT 1 FROM public.missing_children mc WHERE mc.id = child_id AND (mc.reporter_id = auth.uid() OR public.has_role(auth.uid(),'police_admin'))));

-- notifications
CREATE POLICY "notif self read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif self update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- audit logs: super_admin reads all; users read own actions
CREATE POLICY "audit super read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR actor_id = auth.uid());

-- Auto profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'parent_guardian')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER tg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_cases_updated BEFORE UPDATE ON public.missing_children FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('child-photos','child-photos', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated can upload to own folder (path begins with auth.uid())
CREATE POLICY "child-photos upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'child-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "child-photos read own or police" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'child-photos' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(),'police_admin')
      OR public.has_role(auth.uid(),'super_admin')
    )
  );
CREATE POLICY "child-photos delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'child-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
