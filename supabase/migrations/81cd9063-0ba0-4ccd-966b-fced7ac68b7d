
do $$
declare
  tbl text;
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
    execute format('create index if not exists %I on public.%I(company_id)', 'idx_' || tbl || '_company', tbl);
  end loop;
end $$;
