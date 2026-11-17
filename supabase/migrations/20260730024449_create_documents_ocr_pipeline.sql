-- Already applied directly to your live Supabase project (zjaamxvqjiymgfujrtjm)
-- via the Supabase MCP connector. Copy this into
-- supabase/migrations/20260730_create_documents_ocr_pipeline.sql in your repo
-- so `list_migrations`/local history stay in sync — do not re-run it.
--
-- ============================================================
-- Intelligent Document Processing (IDP) foundation.
-- Scope: schema + storage only. Mirrors the tax_documents /
-- company_members RLS pattern already in use.
-- ============================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,

  doc_type text not null check (doc_type in (
    'receipt','purchase_invoice','sales_invoice','credit_note','debit_note',
    'bill','payroll_document','bank_statement','utility_bill','delivery_note',
    'tax_certificate','supporting_tax_document','other'
  )),

  file_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null,

  status text not null default 'uploaded' check (status in (
    'uploaded','processing','needs_review','approved','rejected','failed'
  )),

  linked_table text,
  linked_id uuid,

  ai_model text,
  overall_confidence numeric(4,3),
  error_message text,

  uploaded_at timestamptz not null default now(),
  extracted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_documents_company on public.documents(company_id);
create index idx_documents_status on public.documents(company_id, status);
create index idx_documents_linked on public.documents(linked_table, linked_id);

create trigger trg_documents_updated before update on public.documents
  for each row execute function public.set_updated_at();

create table public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  field_group text not null,
  field_name text not null,
  line_index int,
  field_value text,
  confidence numeric(4,3) not null default 0,
  was_edited_by_user boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_doc_extractions_document on public.document_extractions(document_id);

create table public.document_validations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  check_name text not null,
  severity text not null check (severity in ('info','warning','error')),
  message text not null,
  created_at timestamptz not null default now()
);

create index idx_doc_validations_document on public.document_validations(document_id);

alter table public.documents enable row level security;
alter table public.document_extractions enable row level security;
alter table public.document_validations enable row level security;

create policy "company members select documents" on public.documents for select
  using (is_company_member(company_id));
create policy "company members insert documents" on public.documents for insert
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company members update documents" on public.documents for update
  using (is_company_member(company_id) and get_company_role(company_id) <> 'viewer')
  with check (is_company_member(company_id) and get_company_role(company_id) <> 'viewer');
create policy "company admins delete documents" on public.documents for delete
  using (is_company_admin(company_id));

create policy "company members select extractions" on public.document_extractions for select
  using (is_company_member((select d.company_id from public.documents d where d.id = document_id)));
create policy "company members write extractions" on public.document_extractions for all
  using (is_company_member((select d.company_id from public.documents d where d.id = document_id))
         and get_company_role((select d.company_id from public.documents d where d.id = document_id)) <> 'viewer')
  with check (is_company_member((select d.company_id from public.documents d where d.id = document_id))
         and get_company_role((select d.company_id from public.documents d where d.id = document_id)) <> 'viewer');

create policy "company members select validations" on public.document_validations for select
  using (is_company_member((select d.company_id from public.documents d where d.id = document_id)));
create policy "company members write validations" on public.document_validations for all
  using (is_company_member((select d.company_id from public.documents d where d.id = document_id))
         and get_company_role((select d.company_id from public.documents d where d.id = document_id)) <> 'viewer')
  with check (is_company_member((select d.company_id from public.documents d where d.id = document_id))
         and get_company_role((select d.company_id from public.documents d where d.id = document_id)) <> 'viewer');

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "company members read documents bucket"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and is_company_member((storage.foldername(name))[1]::uuid)
  );

create policy "company members upload documents bucket"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and is_company_member((storage.foldername(name))[1]::uuid)
    and get_company_role((storage.foldername(name))[1]::uuid) <> 'viewer'
  );

create policy "company admins delete documents bucket"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and is_company_admin((storage.foldername(name))[1]::uuid)
  );

comment on table public.documents is 'IDP pipeline: one row per uploaded document (receipt, invoice, bill, etc).';
comment on table public.document_extractions is 'Per-field AI-extracted values with confidence scores, keyed to a document.';
comment on table public.document_validations is 'Deterministic validation findings (duplicates, math mismatches, missing fields) shown in the review workspace.';
