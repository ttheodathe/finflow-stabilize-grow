
do $$
declare
  tbl text;
  default_company uuid;
  tbls text[] := array[
    'customers','vendors','items','item_categories','stock_movements',
    'accounts','journal_entries','journal_lines',
    'invoices','invoice_items','estimates','estimate_items',
    'recurring_invoices','credit_notes','payments',
    'bills','bill_items','bill_payments','purchase_orders','purchase_order_items',
    'bank_accounts','bank_transfers','bank_transactions','expenses'
  ];
begin
  select id into default_company from public.companies order by created_at asc limit 1;

  foreach tbl in array tbls loop
    execute format('alter table public.%I add column if not exists company_id uuid references public.companies(id) on delete cascade', tbl);
    execute format('update public.%I set company_id = %L where company_id is null', tbl, default_company);
  end loop;
end $$;
