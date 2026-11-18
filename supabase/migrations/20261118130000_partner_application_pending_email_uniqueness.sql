-- Prevent repeated public partner submissions from creating an unbounded
-- queue of identical pending applications for the same normalized email.
-- A new application can be submitted after the prior one is reviewed.
CREATE UNIQUE INDEX IF NOT EXISTS partner_applications_one_pending_per_email
  ON public.partner_applications (lower(contact_email))
  WHERE status = 'pending' AND contact_email IS NOT NULL;
