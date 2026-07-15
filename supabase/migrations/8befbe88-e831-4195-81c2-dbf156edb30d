
do $$
declare
  tbl text;
  pol record;
  tbls text[] := array[
    'customers','vendors','items','item_categories','stock_movements',
    'accounts','journal_entries','journal_lines',
    'invoices','invoice_items','estimates','estimate_items',
    'recurring_invoices','credit_notes','payments',
    'bills','bill_items','bill_payments','purchase_orders','purchase_order_items',
    'bank_accounts','bank_transfers','bank_transactions','expenses'
  ];
begin
  foreach tbl in array tbls loop
    -- drop every existing policy on this table (all were user_id-based)
    for pol in select policyname from pg_policies where schemaname='public' and tablename=tbl loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
    end loop;

    execute format($f$
      create policy "company members select"
        on public.%I for select
        using (public.is_company_member(company_id))
    $f$, tbl);

    execute format($f$
      create policy "company members insert"
        on public.%I for insert
        with check (public.is_company_member(company_id) and public.get_company_role(company_id) <> 'viewer')
    $f$, tbl);

    execute format($f$
      create policy "company members update"
        on public.%I for update
        using (public.is_company_member(company_id) and public.get_company_role(company_id) <> 'viewer')
        with check (public.is_company_member(company_id) and public.get_company_role(company_id) <> 'viewer')
    $f$, tbl);

    execute format($f$
      create policy "company admins delete"
        on public.%I for delete
        using (public.is_company_admin(company_id))
    $f$, tbl);
  end loop;
end $$;
