alter table public.company_tax_settings
  add column if not exists jurisdiction text,
  add column if not exists authority_name text,
  add column if not exists filing_frequency text not null default 'monthly'
    check (filing_frequency in ('monthly', 'quarterly', 'annually')),
  add column if not exists is_active boolean not null default true;

comment on column public.company_tax_settings.jurisdiction is 'e.g. RW, US-CA, UK - free text jurisdiction code for now, multi-country ready';
comment on column public.company_tax_settings.filing_frequency is 'drives tax_periods generation';
