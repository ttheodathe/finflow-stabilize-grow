-- Partner & Referral module, Phase 3, step 1: multi-tier referrals +
-- the commission review workflow that Phase 1/2 never actually built
-- (commissions were created 'pending' but nothing ever moved them to
-- 'approved' — the payout queue only surfaces 'approved' rows, so without
-- this, commissions could accrue forever and never become payable).

alter table public.partners
  add column if not exists referred_by_partner_id uuid references public.partners(id) on delete set null;

create index if not exists partners_referred_by_idx on public.partners (referred_by_partner_id);

create table public.partner_program_settings (
  id boolean primary key default true check (id), -- forces exactly one row
  multi_tier_enabled boolean not null default false,
  max_tiers smallint not null default 1 check (max_tiers between 1 and 3),
  tier2_rate numeric(5,2) not null default 5.00 check (tier2_rate >= 0 and tier2_rate <= 100),
  tier3_rate numeric(5,2) not null default 2.00 check (tier3_rate >= 0 and tier3_rate <= 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.partner_program_settings (id) values (true);

grant select on public.partner_program_settings to authenticated;
grant all on public.partner_program_settings to service_role;
alter table public.partner_program_settings enable row level security;

create policy "anyone signed in can read program settings" on public.partner_program_settings
  for select to authenticated using (true);

create policy "staff can update program settings" on public.partner_program_settings
  for update to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());

alter table public.partner_commissions
  add column if not exists tier smallint not null default 1 check (tier between 1 and 3),
  add column if not exists flagged_for_review boolean not null default false,
  add column if not exists flag_reason text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.partner_commissions drop constraint if exists partner_commissions_source_order_id_key;
create unique index if not exists partner_commissions_order_partner_tier_idx
  on public.partner_commissions (source_order_id, partner_id, tier);

create or replace function public.review_partner_commission(
  p_commission_id uuid,
  p_status public.partner_commission_status,
  p_notes text default null
)
returns public.partner_commissions
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.partner_commissions;
begin
  if not public.is_platform_staff() then
    raise exception 'not authorized';
  end if;
  if p_status not in ('approved', 'rejected', 'cancelled', 'reversed') then
    raise exception 'invalid review status: %', p_status;
  end if;

  update public.partner_commissions
  set status = p_status,
      notes = coalesce(p_notes, notes),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_commission_id
  returning * into v_row;

  if not found then raise exception 'commission not found'; end if;
  return v_row;
end;
$$;

grant execute on function public.review_partner_commission(uuid, public.partner_commission_status, text) to authenticated;

drop policy if exists "caller can attribute their own new company" on public.partner_referral_attributions;
create policy "caller can attribute their own new company" on public.partner_referral_attributions
  for insert to authenticated
  with check (
    referred_user_id = auth.uid()
    and public.is_company_member(company_id)
    and exists (
      select 1 from public.partners p
      where p.id = last_touch_partner_id
        and p.status = 'active'
        and p.user_id <> referred_user_id
    )
  );

notify pgrst, 'reload schema';
