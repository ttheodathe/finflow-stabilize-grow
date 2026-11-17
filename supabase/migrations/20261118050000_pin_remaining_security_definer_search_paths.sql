-- Remove mutable public and temporary schemas from the remaining exposed
-- SECURITY DEFINER functions. All non-catalog relations and helper calls in
-- these function bodies are schema-qualified; built-ins resolve from pg_catalog.
ALTER FUNCTION public.adjust_stock(uuid, uuid, uuid, numeric, text, uuid, uuid, text)
  SET search_path = pg_catalog;
ALTER FUNCTION public.ai_process_pending_transactions(uuid)
  SET search_path = pg_catalog;
ALTER FUNCTION public.ai_resolve_review_task(uuid, boolean)
  SET search_path = pg_catalog;
ALTER FUNCTION public.approve_partner_application(uuid, numeric)
  SET search_path = pg_catalog;
ALTER FUNCTION public.get_weekly_invoice_usage(uuid)
  SET search_path = pg_catalog;
ALTER FUNCTION public.is_platform_staff()
  SET search_path = pg_catalog;
ALTER FUNCTION public.log_document_audit_event(uuid, uuid, text, jsonb)
  SET search_path = pg_catalog;
ALTER FUNCTION public.receive_stock(uuid, uuid, uuid, numeric, numeric, uuid, uuid, text, uuid)
  SET search_path = pg_catalog;
ALTER FUNCTION public.record_session(text, text, text, text, text)
  SET search_path = pg_catalog;
ALTER FUNCTION public.revoke_session(uuid)
  SET search_path = pg_catalog;
ALTER FUNCTION public.set_partner_application_status(uuid, public.partner_application_status, text)
  SET search_path = pg_catalog;
ALTER FUNCTION public.touch_session(uuid)
  SET search_path = pg_catalog;
ALTER FUNCTION public.transfer_stock(uuid, uuid, uuid, uuid, numeric, uuid, uuid, text)
  SET search_path = pg_catalog;
