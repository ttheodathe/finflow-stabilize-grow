-- Keep the reviewer queue RPC server-only without SECURITY DEFINER.
-- The authenticated Edge Function verifies the user and calls this RPC with service_role,
-- which already has the required SELECT grants on the private seo_ops tables.
alter function public.seo_ops_list_pending_editorial_reviews(uuid, text)
  security invoker;

revoke all on function public.seo_ops_list_pending_editorial_reviews(uuid, text)
  from public, anon, authenticated;
grant execute on function public.seo_ops_list_pending_editorial_reviews(uuid, text)
  to service_role;
