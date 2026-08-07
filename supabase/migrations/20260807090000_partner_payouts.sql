-- Partner & Referral module, Phase 2, step 1: manual payouts.
--
-- A payout batches N approved commissions for one partner into a single
-- record staff can mark paid. Gateway integration (Stripe/Wise/PayPal/
-- Flutterwave) is out of scope here — `method` is a free-text field staff
-- fill in manually (e.g. "Bank transfer", "Wise") — but the schema doesn't
-- need to change when that's wired up later, only how a row gets created.

create type public.partner_payout_status as enum ('pending', 'paid', 'failed');

create table public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  status public.partner_payout_status not null default 'pending',
  total_amount numeric(12,2) not null,
  currency text not null default 'USD',
  method text,
  reference text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_payouts_partner_idx on public.partner_payouts (partner_id, created_at desc);

create table public.partner_payout_commissions (
  payout_id uuid not null references public.partner_payouts(id) on delete cascade,
  commission_id uuid not null references public.partner_commissions(id) on delete cascade,
  primary key (payout_id, commission_id),
  unique (commission_id)
);

grant select on public.partner_payouts to authenticated;
grant all on public.partner_payouts to service_role;
grant select on public.partner_payout_commissions to authenticated;
grant all on public.partner_payout_commissions to service_role;

alter table public.partner_payouts enable row level security;
alter table public.partner_payout_commissions enable row level security;

create policy "partner can view own payouts" on public.partner_payouts
  for select to authenticated
  using (
    public.is_platform_staff()
    or exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid())
  );

create policy "staff can manage payouts" on public.partner_payouts
  for all to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());

create policy "partner can view own payout line items" on public.partner_payout_commissions
  for select to authenticated
  using (
    public.is_platform_staff()
    or exists (
      select 1 from public.partner_payouts po
      join public.partners p on p.id = po.partner_id
      where po.id = payout_id and p.user_id = auth.uid()
    )
  );

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
begin
  if not public.is_platform_staff() then
    raise exception 'not authorized';
  end if;

  select coalesce(sum(commission_amount), 0), min(currency), count(*)
  into v_total, v_currency, v_count
  from public.partner_commissions
  where id = any(p_commission_ids)
    and partner_id = p_partner_id
    and status = 'approved';

  if v_count = 0 or v_count <> array_length(p_commission_ids, 1) then
    raise exception 'one or more commissions are not approved / not owned by this partner';
  end if;

  insert into public.partner_payouts (partner_id, total_amount, currency, method, reference, notes, created_by, status)
  values (p_partner_id, v_total, coalesce(v_currency, 'USD'), p_method, p_reference, p_notes, auth.uid(), 'pending')
  returning * into v_payout;

  insert into public.partner_payout_commissions (payout_id, commission_id)
  select v_payout.id, unnest(p_commission_ids);

  update public.partner_commissions
  set status = 'paid', updated_at = now()
  where id = any(p_commission_ids);

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
begin
  if not public.is_platform_staff() then
    raise exception 'not authorized';
  end if;

  update public.partner_payouts
  set status = 'paid', paid_at = now(), updated_at = now()
  where id = p_payout_id
  returning * into v_row;

  if not found then raise exception 'payout not found'; end if;
  return v_row;
end;
$$;

grant execute on function public.create_partner_payout(uuid, uuid[], text, text, text) to authenticated;
grant execute on function public.mark_partner_payout_paid(uuid) to authenticated;

notify pgrst, 'reload schema';
