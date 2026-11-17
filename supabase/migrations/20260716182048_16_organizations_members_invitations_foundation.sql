-- ============================================================
-- Phase 0: Multi-user organizations foundation
-- Adds organizations, membership, and invitations as an
-- additive layer. Existing user_id-based tables/policies are
-- left untouched; companies gets an organization_id link and
-- backfilled data so nothing breaks for existing users.
--
-- NOTE: This migration was already applied directly to the
-- live Supabase project (igarniqiyityfbtmaqpa) via the
-- Supabase MCP tool. This file is provided so it can be
-- committed to supabase/migrations/ for history/version
-- control. Do NOT re-run against the same project.
-- ============================================================

CREATE TYPE public.org_member_role AS ENUM ('owner','admin','member');
CREATE TYPE public.org_member_status AS ENUM ('active','invited','suspended');

-- ORGANIZATIONS
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ORGANIZATION MEMBERS
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_member_role NOT NULL DEFAULT 'member',
  status public.org_member_status NOT NULL DEFAULT 'active',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_org_members_updated BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX org_members_org_idx ON public.organization_members(organization_id);
CREATE INDEX org_members_user_idx ON public.organization_members(user_id);

-- ORGANIZATION INVITATIONS
CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.org_member_role NOT NULL DEFAULT 'member',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invitations TO authenticated;
GRANT ALL ON public.organization_invitations TO service_role;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_org_invitations_updated BEFORE UPDATE ON public.organization_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX org_invitations_org_idx ON public.organization_invitations(organization_id);
CREATE UNIQUE INDEX org_invitations_token_idx ON public.organization_invitations(token);

-- HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid() AND status = 'active' AND role IN ('owner','admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;

-- ORGANIZATIONS RLS
CREATE POLICY "members view their orgs" ON public.organizations FOR SELECT
  USING (public.is_org_member(id));
CREATE POLICY "users create orgs" ON public.organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "admins update org" ON public.organizations FOR UPDATE
  USING (public.is_org_admin(id)) WITH CHECK (public.is_org_admin(id));
CREATE POLICY "owner deletes org" ON public.organizations FOR DELETE
  USING (owner_id = auth.uid());

-- ORGANIZATION_MEMBERS RLS
CREATE POLICY "members view org members" ON public.organization_members FOR SELECT
  USING (public.is_org_member(organization_id) OR user_id = auth.uid());
CREATE POLICY "owner bootstraps membership" ON public.organization_members FOR INSERT
  WITH CHECK (
    role = 'owner' AND user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.owner_id = auth.uid())
  );
CREATE POLICY "admins manage members" ON public.organization_members FOR ALL
  USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));

-- ORGANIZATION_INVITATIONS RLS
CREATE POLICY "admins manage invitations" ON public.organization_invitations FOR ALL
  USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "invitee views own invitation" ON public.organization_invitations FOR SELECT
  USING (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));

-- ACCEPT INVITATION RPC (bypasses RLS safely, validates email match)
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(_token uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv RECORD;
  uid uuid := auth.uid();
  uemail text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT email INTO uemail FROM auth.users WHERE id = uid;

  SELECT * INTO inv FROM public.organization_invitations
    WHERE token = _token AND status = 'pending' AND expires_at > now();
  IF inv IS NULL THEN
    RAISE EXCEPTION 'Invitation not found, already used, or expired';
  END IF;
  IF lower(inv.email) <> lower(uemail) THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, status, invited_by, joined_at)
  VALUES (inv.organization_id, uid, inv.role, 'active', inv.invited_by, now())
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET status = 'active', role = EXCLUDED.role, joined_at = now();

  UPDATE public.organization_invitations SET status = 'accepted', accepted_at = now() WHERE id = inv.id;

  RETURN inv.organization_id;
END $$;

REVOKE ALL ON FUNCTION public.accept_organization_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(uuid) TO authenticated;

-- LINK COMPANIES TO ORGANIZATIONS (additive, backfilled)
ALTER TABLE public.companies ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

DO $$
DECLARE
  r RECORD;
  org_name text;
  new_org_id uuid;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.companies WHERE organization_id IS NULL LOOP
    SELECT COALESCE(NULLIF(trim(full_name), ''), 'My Organization') INTO org_name
    FROM public.profiles WHERE id = r.user_id;

    INSERT INTO public.organizations (name, owner_id)
    VALUES (COALESCE(org_name, 'My Organization'), r.user_id)
    RETURNING id INTO new_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_at)
    VALUES (new_org_id, r.user_id, 'owner', 'active', now());

    UPDATE public.companies SET organization_id = new_org_id WHERE user_id = r.user_id AND organization_id IS NULL;
  END LOOP;
END $$;

ALTER TABLE public.companies ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX companies_organization_idx ON public.companies(organization_id);

-- Additive RLS: org members/admins can also access companies (existing user_id policy stays intact)
CREATE POLICY "org members view companies" ON public.companies FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "org admins manage companies" ON public.companies FOR ALL
  USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));
