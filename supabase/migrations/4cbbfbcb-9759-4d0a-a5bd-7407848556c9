
create table public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  fiscal_year_start_month int not null default 1 check (fiscal_year_start_month between 1 and 12),
  default_payment_terms_days int not null default 14,
  invoice_prefix text not null default 'INV-',
  invoice_next_number int not null default 1,
  estimate_prefix text not null default 'EST-',
  estimate_next_number int not null default 1,
  bill_prefix text not null default 'BILL-',
  bill_next_number int not null default 1,
  default_invoice_notes text,
  timezone text not null default 'UTC',
  date_format text not null default 'MM/DD/YYYY' check (date_format in ('MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD')),
  theme text not null default 'system' check (theme in ('light','dark','system')),
  notify_payment_received boolean not null default true,
  notify_invoice_overdue boolean not null default true,
  notify_weekly_summary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_tax_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  rate numeric not null default 0,
  is_default boolean not null default false,
  tax_number text,
  is_inclusive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_company_tax_settings_company on public.company_tax_settings(company_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_company on public.audit_logs(company_id, created_at desc);

alter table public.company_settings enable row level security;
alter table public.company_tax_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "members view company settings"
  on public.company_settings for select
  using (public.is_company_member(company_id));

create policy "admins manage company settings"
  on public.company_settings for all
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

create policy "members view tax settings"
  on public.company_tax_settings for select
  using (public.is_company_member(company_id));

create policy "admins manage tax settings"
  on public.company_tax_settings for all
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

create policy "members view audit log"
  on public.audit_logs for select
  using (public.is_company_member(company_id));

create policy "system inserts audit log"
  on public.audit_logs for insert
  with check (public.is_company_member(company_id));

-- default settings row + default tax row for the existing company
insert into public.company_settings (company_id)
select id from public.companies
on conflict (company_id) do nothing;

insert into public.company_tax_settings (company_id, name, rate, is_default)
select id, 'No Tax', 0, true from public.companies
on conflict do nothing;
