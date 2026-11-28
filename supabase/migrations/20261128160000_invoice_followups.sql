-- Invoice follow-up history and company/permission-scoped access.
-- Additive only: existing invoices are not modified and have no synthetic history.

create table if not exists public.invoice_followups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  contacted_at timestamptz not null,
  channel text not null check (
    channel in ('email', 'phone', 'whatsapp', 'sms', 'in_person', 'other')
  ),
  note text check (note is null or char_length(note) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invoice_followups_company_invoice_contacted_idx
  on public.invoice_followups (company_id, invoice_id, contacted_at desc);

create index if not exists invoice_followups_company_contacted_idx
  on public.invoice_followups (company_id, contacted_at desc);

alter table public.invoice_followups enable row level security;

grant select, insert, delete on public.invoice_followups to authenticated;
grant all on public.invoice_followups to service_role;

-- Security-definer helper avoids relying on client-side permission checks or
-- recursive RLS evaluation of company_members / role_permissions.
create or replace function public.user_has_company_permission(
  p_company_id uuid,
  p_permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
      from public.company_members cm
      join public.role_permissions rp on rp.role_id = cm.role_id
      join public.permissions p on p.id = rp.permission_id
     where cm.company_id = p_company_id
       and cm.user_id = auth.uid()
       and cm.status = 'active'
       and p.key = p_permission_key
  );
$function$;

revoke all on function public.user_has_company_permission(uuid, text) from public, anon;
grant execute on function public.user_has_company_permission(uuid, text) to authenticated;

drop policy if exists "invoice followups readable by company members" on public.invoice_followups;
create policy "invoice followups readable by company members"
  on public.invoice_followups for select to authenticated
  using (
    public.is_company_member(company_id)
    and exists (
      select 1
        from public.invoices i
       where i.id = invoice_followups.invoice_id
         and i.company_id = invoice_followups.company_id
    )
  );

drop policy if exists "invoice followups insert by invoice editors" on public.invoice_followups;
create policy "invoice followups insert by invoice editors"
  on public.invoice_followups for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_company_member(company_id)
    and public.user_has_company_permission(company_id, 'invoice.edit')
    and exists (
      select 1
        from public.invoices i
       where i.id = invoice_followups.invoice_id
         and i.company_id = invoice_followups.company_id
    )
  );

drop policy if exists "invoice followups delete by invoice editors" on public.invoice_followups;
create policy "invoice followups delete by invoice editors"
  on public.invoice_followups for delete to authenticated
  using (
    public.is_company_member(company_id)
    and public.user_has_company_permission(company_id, 'invoice.edit')
    and exists (
      select 1
        from public.invoices i
       where i.id = invoice_followups.invoice_id
         and i.company_id = invoice_followups.company_id
    )
  );

comment on table public.invoice_followups is
  'Contact history for invoices; last contact is derived from max(contacted_at).';
comment on column public.invoice_followups.channel is
  'Contact channel: email, phone, whatsapp, sms, in_person, or other.';

notify pgrst, 'reload schema';
