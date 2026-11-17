-- Stage A.6: protect organization ownership and membership from direct client DML.
-- Organization creation and membership acceptance remain server-controlled.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.organization_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.organization_members TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.organization_invitations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.organization_invitations FROM anon;
GRANT SELECT ON TABLE public.organization_invitations TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.organizations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.organizations FROM anon;
GRANT SELECT ON TABLE public.organizations TO authenticated;
GRANT UPDATE (name, slug) ON TABLE public.organizations TO authenticated;

-- Explicitly retain the controlled invitation acceptance path.
REVOKE ALL ON FUNCTION public.accept_organization_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(uuid) TO authenticated;
