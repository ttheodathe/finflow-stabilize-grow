-- Ensure inventory journal helper cannot post using another company's
-- chart-of-accounts IDs. This function is internal-only.

create or replace function public.post_inventory_journal_entry(
  p_company_id uuid,
  p_user_id uuid,
  p_debit_account_id uuid,
  p_credit_account_id uuid,
  p_amount numeric,
  p_memo text,
  p_source_type text,
  p_source_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_entry_id uuid;
begin
  delete from public.journal_entries
  where source_type = p_source_type and source_id = p_source_id;

  if p_debit_account_id is null or p_credit_account_id is null
     or p_amount is null or p_amount <= 0 then
    return null;
  end if;

  if not exists (
    select 1 from public.accounts
    where id = p_debit_account_id and company_id = p_company_id
  ) then
    raise exception 'debit account does not belong to this company';
  end if;

  if not exists (
    select 1 from public.accounts
    where id = p_credit_account_id and company_id = p_company_id
  ) then
    raise exception 'credit account does not belong to this company';
  end if;

  insert into public.journal_entries (
    company_id, user_id, entry_date, memo, source_type, source_id, is_posted
  )
  values (
    p_company_id, p_user_id, pg_catalog.current_date, p_memo, p_source_type, p_source_id, true
  )
  returning id into v_entry_id;

  insert into public.journal_lines (
    company_id, user_id, entry_id, account_id, debit, credit, description
  )
  values
    (p_company_id, p_user_id, v_entry_id, p_debit_account_id, pg_catalog.round(p_amount, 2), 0, p_memo),
    (p_company_id, p_user_id, v_entry_id, p_credit_account_id, 0, pg_catalog.round(p_amount, 2), p_memo);

  return v_entry_id;
end;
$function$;

revoke all on function public.post_inventory_journal_entry(uuid, uuid, uuid, uuid, numeric, text, text, uuid)
from public, anon, authenticated;
