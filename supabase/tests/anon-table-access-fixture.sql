CREATE TABLE public.permissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.subscription_plans (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.testimonials (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.expenses (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.journal_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.company_members (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.partner_applications (id uuid PRIMARY KEY DEFAULT gen_random_uuid());

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
