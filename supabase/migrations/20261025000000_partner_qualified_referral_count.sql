-- Partner commission tiers: count of qualified referrals for a partner.
-- ADDITIVE ONLY: one read-only function, callable by the service role (the Polar
-- webhook) only. No tables, columns or data are changed.
-- Rollback: DROP FUNCTION public.partner_qualified_referral_count(uuid, uuid);
--
-- "Qualified referral" = a distinct referred company with at least one tier-1
-- commission for this partner that was not rejected, cancelled or reversed.
-- The company passed in is always counted (it is the referral being paid now).

create or replace function public.partner_qualified_referral_count(
  _partner_id uuid,
  _company_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (
    select count(distinct c.company_id)
    from public.partner_commissions c
    where c.partner_id = _partner_id
      and c.tier = 1
      and c.status not in ('rejected', 'cancelled', 'reversed')
  )::integer
  + case when exists (
      select 1 from public.partner_commissions c
      where c.partner_id = _partner_id
        and c.company_id = _company_id
        and c.tier = 1
        and c.status not in ('rejected', 'cancelled', 'reversed')
    ) then 0 else 1 end;
$$;

revoke all on function public.partner_qualified_referral_count(uuid, uuid) from public, anon, authenticated;
grant execute on function public.partner_qualified_referral_count(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
