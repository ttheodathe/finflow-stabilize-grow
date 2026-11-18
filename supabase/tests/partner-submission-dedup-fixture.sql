CREATE TABLE public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email text,
  status text NOT NULL DEFAULT 'pending'
);
