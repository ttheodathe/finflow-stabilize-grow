-- Partner & Referral module, Phase 3, step 2: partner API keys.

create table public.partner_api_keys (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null default 'Default key',
  key_hash text not null unique,
  key_prefix text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index partner_api_keys_partner_idx on public.partner_api_keys (partner_id);

grant select, insert on public.partner_api_keys to authenticated;
grant all on public.partner_api_keys to service_role;
alter table public.partner_api_keys enable row level security;

create policy "partner can view own api keys" on public.partner_api_keys
  for select to authenticated
  using (
    public.is_platform_staff()
    or exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid())
  );

create policy "partner can create own api keys" on public.partner_api_keys
  for insert to authenticated
  with check (exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()));

create policy "partner can revoke own api keys" on public.partner_api_keys
  for update to authenticated
  using (exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()));

notify pgrst, 'reload schema';
