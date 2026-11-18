CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.companies (
  id uuid PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  customer_id uuid,
  invoice_number text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'USD',
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  share_token uuid NOT NULL DEFAULT gen_random_uuid()
);

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Simulate a legacy invoice that already has a public link before migration.
INSERT INTO public.companies (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Company');

INSERT INTO public.customers (id, name)
VALUES ('00000000-0000-0000-0000-000000000002', 'Test Customer');

INSERT INTO public.invoices (
  id, company_id, customer_id, invoice_number, status, total,
  share_token
)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'INV-LEGACY',
  'sent',
  125,
  '00000000-0000-0000-0000-000000000004'
);

INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price, amount)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Test service',
  1,
  125,
  125
);
