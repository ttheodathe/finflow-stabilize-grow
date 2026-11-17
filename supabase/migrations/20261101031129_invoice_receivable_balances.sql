-- Invoice intelligence: per-invoice receivable balances.
-- ADDITIVE ONLY: creates one read-only function. No tables, columns, policies
-- or data are changed. Rollback: DROP FUNCTION public.invoice_receivable_balances(uuid, date);
--
-- Balance = invoice total - payments - ISSUED credit notes (never below 0),
-- in the invoice's own currency. Draft, paid, void and cancelled invoices are
-- excluded. Runs as the caller (SECURITY INVOKER) so existing RLS on invoices,
-- payments, credit_notes and customers still applies, and it also requires
-- company membership explicitly.

create or replace function public.invoice_receivable_balances(
  _company_id uuid,
  _as_of date default current_date
)
returns table (
  invoice_id uuid,
  invoice_number text,
  customer_id uuid,
  customer_name text,
  currency text,
  issue_date date,
  due_date date,
  status text,
  total numeric,
  amount_paid numeric,
  amount_credited numeric,
  balance numeric,
  days_overdue integer
)
language plpgsql
stable
security invoker
set search_path = public
as $$
#variable_conflict use_column
begin
  if auth.uid() is null or not public.is_company_member(_company_id) then
    raise exception 'Not authorized for this company' using errcode = '42501';
  end if;

  return query
  select
    b.id,
    b.invoice_number,
    b.customer_id,
    b.customer_name,
    b.currency,
    b.issue_date,
    b.due_date,
    b.status,
    b.total,
    b.paid,
    b.credited,
    b.bal,
    case when b.due_date is not null and b.due_date < _as_of
         then (_as_of - b.due_date)::integer else 0 end
  from (
    select
      i.id,
      i.invoice_number,
      i.customer_id,
      c.name as customer_name,
      i.currency,
      i.issue_date,
      i.due_date,
      i.status,
      i.total,
      coalesce(p.s, 0) as paid,
      coalesce(cn.s, 0) as credited,
      greatest(i.total - coalesce(p.s, 0) - coalesce(cn.s, 0), 0) as bal
    from public.invoices i
    left join public.customers c on c.id = i.customer_id
    left join lateral (
      select sum(pay.amount) as s
      from public.payments pay
      where pay.invoice_id = i.id
        and pay.company_id = i.company_id
        and pay.payment_date <= _as_of
    ) p on true
    left join lateral (
      select sum(n.amount) as s
      from public.credit_notes n
      where n.invoice_id = i.id
        and n.company_id = i.company_id
        and n.status = 'issued'
        and n.currency = i.currency
        and n.issue_date <= _as_of
    ) cn on true
    where i.company_id = _company_id
      and i.status not in ('draft', 'paid', 'void', 'voided', 'cancelled', 'canceled')
  ) b
  where b.bal > 0
  order by b.due_date nulls last, b.invoice_number;
end;
$$;

revoke all on function public.invoice_receivable_balances(uuid, date) from public, anon;
grant execute on function public.invoice_receivable_balances(uuid, date) to authenticated;

notify pgrst, 'reload schema';
