-- Partner payout integrity hardening.
-- A payout is a pending transfer until staff explicitly confirms settlement.
-- Failed payouts release their commission reservations without deleting history.

alter table public.partner_payout_commissions
  add column if not exists released_at timestamptz;

alter table public.partner_payout_commissions
  drop constraint if exists partner_payout_commissions_commission_id_key;

create unique index if not exists partner_payout_commissions_active_commission_idx
  on public.partner_payout_commissions (commission_id)
  where released_at is null;

create or replace function public.create_partner_payout(
  p_partner_id uuid,
  p_commission_ids uuid[],
  p_method text default null,
  p_reference text default null,
  p_notes text default null
)
returns public.partner_payouts
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_payout public.partner_payouts;
  v_total numeric(12,2);
  v_currency text;
  v_count int;
  v_distinct_count int;
begin
  if not public.is_platform_staff() then
    raise exception 'not authorized';
  end if;

  if p_commission_ids is null or cardinality(p_commission_ids) = 0 then
    raise exception 'select at least one approved commission';
  end if;

  if cardinality(p_commission_ids) <> (
    select count(distinct id) from unnest(p_commission_ids) as ids(id)
  ) then
    raise exception 'duplicate commission IDs are not allowed';
  end if;

  -- Lock the selected rows so concurrent payout requests cannot reserve them twice.
  perform id
  from public.partner_commissions
  where id = any(p_commission_ids)
  order by id
  for update;

  select
    coalesce(sum(commission_amount), 0),
    min(upper(currency)),
    count(*),
    count(distinct upper(currency))
  into v_total, v_currency, v_count, v_distinct_count
  from public.partner_commissions
  where id = any(p_commission_ids)
    and partner_id = p_partner_id
    and status = 'approved';

  if v_count <> cardinality(p_commission_ids) then
    raise exception 'one or more commissions are not approved or are not owned by this partner';
  end if;

  if v_distinct_count <> 1 then
    raise exception 'commissions must use the same currency; create separate payouts per currency';
  end if;

  if exists (
    select 1
    from public.partner_payout_commissions pc
    where pc.commission_id = any(p_commission_ids)
      and pc.released_at is null
  ) then
    raise exception 'one or more commissions are already reserved by an active payout';
  end if;

  insert into public.partner_payouts (
    partner_id, total_amount, currency, method, reference, notes, created_by, status
  )
  values (
    p_partner_id, v_total, v_currency, p_method, p_reference, p_notes, auth.uid(), 'pending'
  )
  returning * into v_payout;

  insert into public.partner_payout_commissions (payout_id, commission_id)
  select v_payout.id, ids.id
  from unnest(p_commission_ids) as ids(id);

  -- Do not mark commissions paid here. They remain approved while transfer is pending.
  return v_payout;
end;
$$;

create or replace function public.mark_partner_payout_paid(p_payout_id uuid)
returns public.partner_payouts
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.partner_payouts;
  v_linked_count int;
  v_updated_count int;
begin
  if not public.is_platform_staff() then
    raise exception 'not authorized';
  end if;

  select * into v_row
  from public.partner_payouts
  where id = p_payout_id
  for update;

  if not found then raise exception 'payout not found'; end if;
  if v_row.status <> 'pending' then
    raise exception 'only pending payouts can be marked paid';
  end if;

  select count(*) into v_linked_count
  from public.partner_payout_commissions
  where payout_id = p_payout_id and released_at is null;

  update public.partner_commissions c
  set status = 'paid', updated_at = now()
  from public.partner_payout_commissions pc
  where pc.payout_id = p_payout_id
    and pc.commission_id = c.id
    and pc.released_at is null
    and c.status = 'approved';

  get diagnostics v_updated_count = row_count;
  if v_linked_count = 0 or v_updated_count <> v_linked_count then
    raise exception 'payout commissions are no longer all approved; payout was not settled';
  end if;

  update public.partner_payouts
  set status = 'paid', paid_at = now(), updated_at = now()
  where id = p_payout_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.mark_partner_payout_failed(p_payout_id uuid, p_notes text default null)
returns public.partner_payouts
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.partner_payouts;
begin
  if not public.is_platform_staff() then
    raise exception 'not authorized';
  end if;

  select * into v_row
  from public.partner_payouts
  where id = p_payout_id
  for update;

  if not found then raise exception 'payout not found'; end if;
  if v_row.status <> 'pending' then
    raise exception 'only pending payouts can be marked failed';
  end if;

  update public.partner_payouts
  set status = 'failed',
      notes = coalesce(p_notes, notes),
      updated_at = now()
  where id = p_payout_id
  returning * into v_row;

  -- Preserve the historical payout and its line items, but release commissions for retry.
  update public.partner_payout_commissions
  set released_at = now()
  where payout_id = p_payout_id and released_at is null;

  return v_row;
end;
$$;

-- Replace direct table writes that lacked matching authenticated table grants.
create or replace function public.set_partner_status(
  p_partner_id uuid,
  p_status public.partner_status
)
returns public.partners
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.partners;
begin
  if not public.is_platform_staff() then
    raise exception 'not authorized';
  end if;

  update public.partners
  set status = p_status, updated_at = now()
  where id = p_partner_id
  returning * into v_row;

  if not found then raise exception 'partner not found'; end if;
  return v_row;
end;
$$;

create or replace function public.update_partner_program_settings(
  p_multi_tier_enabled boolean,
  p_max_tiers smallint,
  p_tier2_rate numeric,
  p_tier3_rate numeric
)
returns public.partner_program_settings
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.partner_program_settings;
begin
  if not public.is_platform_staff() then
    raise exception 'not authorized';
  end if;

  update public.partner_program_settings
  set multi_tier_enabled = p_multi_tier_enabled,
      max_tiers = p_max_tiers,
      tier2_rate = p_tier2_rate,
      tier3_rate = p_tier3_rate,
      updated_at = now(),
      updated_by = auth.uid()
  where id = true
  returning * into v_row;

  if not found then raise exception 'partner program settings row not found'; end if;
  return v_row;
end;
$$;

grant execute on function public.create_partner_payout(uuid, uuid[], text, text, text) to authenticated;
grant execute on function public.mark_partner_payout_paid(uuid) to authenticated;
grant execute on function public.mark_partner_payout_failed(uuid, text) to authenticated;
grant execute on function public.set_partner_status(uuid, public.partner_status) to authenticated;
grant execute on function public.update_partner_program_settings(boolean, smallint, numeric, numeric) to authenticated;

notify pgrst, 'reload schema';
