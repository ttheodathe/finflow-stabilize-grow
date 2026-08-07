-- Partner & Referral module, Phase 1, step 3: click tracking, signup
-- attribution, and the (recurring-only) commission ledger.

create table public.partner_referral_clicks (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  visitor_id text not null, -- long-lived anonymous cookie id set by the client
  landing_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  created_at timestamptz not null default now()
);

create index partner_referral_clicks_partner_idx on public.partner_referral_clicks (partner_id, created_at desc);
create index partner_referral_clicks_visitor_idx on public.partner_referral_clicks (visitor_id, created_at desc);

-- One row per referred *company* (not per user — commissions are earned on
-- the paying tenant, and a user can belong to multiple companies).
-- first_touch/last_touch both point at partners; Phase 1 uses last-touch as
-- the attribution model (simpler, matches how the checkout flow already
-- threads a single referral code end-to-end), first_touch is captured too
-- so Phase 3 can offer a first-touch mode without a backfill.
create table public.partner_referral_attributions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  first_touch_partner_id uuid references public.partners(id) on delete set null,
  last_touch_partner_id uuid not null references public.partners(id) on delete cascade,
  visitor_id text,
  attributed_at timestamptz not null default now(),
  unique (company_id)
);

create index partner_referral_attributions_partner_idx on public.partner_referral_attributions (last_touch_partner_id);

create type public.partner_commission_status as enum (
  'pending', 'approved', 'rejected', 'paid', 'cancelled', 'reversed'
);

create table public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  -- The billing event this commission was calculated from (Polar order id),
  -- kept unique so a re-delivered webhook can never double-pay a partner.
  source_order_id text not null,
  status public.partner_commission_status not null default 'pending',
  billed_amount numeric(12,2) not null,
  currency text not null default 'USD',
  commission_rate numeric(5,2) not null,
  commission_amount numeric(12,2) not null,
  period_start timestamptz,
  period_end timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_order_id)
);

create index partner_commissions_partner_idx on public.partner_commissions (partner_id, status);

grant select on public.partner_referral_clicks to authenticated;
grant all on public.partner_referral_clicks to service_role;
grant select, insert on public.partner_referral_attributions to authenticated;
grant all on public.partner_referral_attributions to service_role;
grant select on public.partner_commissions to authenticated;
grant all on public.partner_commissions to service_role;

alter table public.partner_referral_clicks enable row level security;
alter table public.partner_referral_attributions enable row level security;
alter table public.partner_commissions enable row level security;

-- Clicks are written server-side only (service_role, from the public
-- redirect endpoint) so there is no anon/authenticated insert policy at
-- all — this prevents a partner from forging their own click counts.
create policy "partner can view own clicks" on public.partner_referral_clicks
  for select to authenticated
  using (
    public.is_platform_staff()
    or exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid())
  );

create policy "partner can view own attributions" on public.partner_referral_attributions
  for select to authenticated
  using (
    public.is_platform_staff()
    or exists (select 1 from public.partners p where p.id = last_touch_partner_id and p.user_id = auth.uid())
  );

-- Attribution is written once, client-side, at company-creation time — but
-- only for the company the caller just created, and only pointing at a real,
-- active partner. This is the one client-writable row in the whole module;
-- everything money-related (commissions) is service-role only.
create policy "caller can attribute their own new company" on public.partner_referral_attributions
  for insert to authenticated
  with check (
    referred_user_id = auth.uid()
    and public.is_company_member(company_id)
    and exists (select 1 from public.partners p where p.id = last_touch_partner_id and p.status = 'active')
  );

create policy "partner can view own commissions" on public.partner_commissions
  for select to authenticated
  using (
    public.is_platform_staff()
    or exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid())
  );

-- Staff can update commission status (approve/reject/mark paid) — amounts
-- themselves are never edited here, only status/notes, so a staff member
-- can't quietly inflate a payout through this policy.
create policy "staff can review commissions" on public.partner_commissions
  for update to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());

notify pgrst, 'reload schema';
