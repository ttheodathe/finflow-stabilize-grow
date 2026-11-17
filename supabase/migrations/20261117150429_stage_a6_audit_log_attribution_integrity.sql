-- Stage A.6: make audit-log attribution server-controlled and append-only for clients.
-- Security-definer application workflows may continue writing audit rows atomically.

CREATE OR REPLACE FUNCTION public.log_document_audit_event(
  p_company_id uuid,
  p_document_id uuid,
  p_action text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_status text;
  v_reviewed_by uuid;
  v_log_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_action NOT IN ('document_approved', 'document_rejected') THEN
    RAISE EXCEPTION 'Unsupported document audit action';
  END IF;

  SELECT d.status, d.reviewed_by
    INTO v_status, v_reviewed_by
    FROM public.documents d
   WHERE d.id = p_document_id
     AND d.company_id = p_company_id
   FOR SHARE;

  IF NOT FOUND OR v_reviewed_by IS DISTINCT FROM v_uid
     OR (p_action = 'document_approved' AND v_status <> 'approved')
     OR (p_action = 'document_rejected' AND v_status <> 'rejected') THEN
    RAISE EXCEPTION 'Document review state does not authorize this audit event';
  END IF;

  INSERT INTO public.audit_logs (
    company_id, user_id, action, entity_type, entity_id, metadata, created_at
  )
  VALUES (
    p_company_id, v_uid, p_action, 'documents', p_document_id,
    COALESCE(p_metadata, '{}'::jsonb), pg_catalog.now()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.log_document_audit_event(uuid, uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_document_audit_event(uuid, uuid, text, jsonb) TO authenticated;

-- Clients may read company audit history but cannot directly forge, rewrite, or erase it.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "system inserts audit log" ON public.audit_logs;
