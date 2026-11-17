-- Restrict internal financial helpers and trigger routines from direct RPC use.

do $block$
declare r record;
begin
  for r in
    select n.nspname, p.proname, pg_catalog.oidvectortypes(p.proargtypes) as argtypes
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and p.prorettype in ('trigger'::regtype, 'event_trigger'::regtype)
  loop
    execute pg_catalog.format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      r.nspname, r.proname, r.argtypes
    );
  end loop;
end
$block$;

revoke all on function public.record_stock_movement(
  uuid, uuid, uuid, uuid, numeric, text, uuid, text, uuid, text, uuid, numeric
) from public, anon, authenticated;
revoke all on function public.post_inventory_journal_entry(
  uuid, uuid, uuid, uuid, numeric, text, text, uuid
) from public, anon, authenticated;
revoke all on function public.ai_process_bank_transaction(uuid)
  from public, anon, authenticated;
revoke all on function public.check_engagement_reminders()
  from public, anon, authenticated;
revoke all on function public.maybe_notify_reminder(uuid, uuid, text, text, text, text)
  from public, anon, authenticated;

revoke all on function public.post_invoice_journal(uuid) from public, anon, authenticated;
revoke all on function public.post_payment_journal(uuid) from public, anon, authenticated;
revoke all on function public.post_bill_journal(uuid) from public, anon, authenticated;
revoke all on function public.post_bill_payment_journal(uuid) from public, anon, authenticated;
revoke all on function public.post_credit_note_journal(uuid) from public, anon, authenticated;
revoke all on function public.post_expense_journal(uuid) from public, anon, authenticated;
revoke all on function public.recalc_invoice_status(uuid) from public, anon, authenticated;
revoke all on function public.recalc_bill_status(uuid) from public, anon, authenticated;

do $block$
declare r record;
begin
  for r in
    select n.nspname, p.proname, pg_catalog.oidvectortypes(p.proargtypes) as argtypes
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='update_own_plan'
  loop
    execute pg_catalog.format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      r.nspname, r.proname, r.argtypes
    );
  end loop;
end
$block$;

alter function public.get_public_invoice(uuid) set search_path = pg_catalog;
