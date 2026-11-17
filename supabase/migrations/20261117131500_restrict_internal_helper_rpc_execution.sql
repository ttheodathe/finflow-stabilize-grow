-- Internal helpers are invoked by database triggers or trusted server-side
-- code. They are not intended as client-callable RPCs.

revoke all on function public.dispatch_stock(
  uuid, uuid, uuid, uuid, numeric, text, numeric, uuid, text, uuid, text, uuid
) from public, anon, authenticated;

revoke all on function public.find_account(uuid, text)
  from public, anon, authenticated;
revoke all on function public.find_account_by_company(uuid, text)
  from public, anon, authenticated;

revoke all on function public.match_or_create_vendor(uuid, uuid, text)
  from public, anon, authenticated;

revoke all on function public.company_wants_reminders(uuid, uuid)
  from public, anon, authenticated;
