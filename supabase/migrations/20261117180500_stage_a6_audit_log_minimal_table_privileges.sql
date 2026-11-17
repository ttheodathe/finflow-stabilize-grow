-- Stage A.6 follow-up: remove inherited non-read audit-log privileges from API roles.
REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;
