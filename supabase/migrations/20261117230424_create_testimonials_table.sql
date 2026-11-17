-- Testimonials submitted by site visitors on the public /testimonials page.
-- Anyone can submit one; only approved rows are ever readable publicly.
-- Approval itself is done by you directly in the Supabase Table Editor
-- (toggle the `approved` checkbox) — there is intentionally no public
-- update/delete policy, so no visitor can approve their own review or
-- edit/remove someone else's.

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_company text,           -- optional, e.g. "Founder, Acme Co."
  rating smallint not null check (rating between 1 and 5),
  message text not null check (char_length(message) between 1 and 2000),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

-- Anyone (including anonymous visitors) can submit a testimonial.
-- `approved` always defaults to false and there's no way for the client
-- to override that via insert, since insert policies don't govern column
-- values beyond what's checked here — but since the column has a default
-- and no update policy exists, a submitted row simply can't become
-- approved from the client side.
drop policy if exists "Anyone can submit a testimonial" on public.testimonials;
create policy "Anyone can submit a testimonial"
on public.testimonials for insert
to anon, authenticated
with check (approved = false);

-- Only approved testimonials are ever visible publicly.
drop policy if exists "Anyone can view approved testimonials" on public.testimonials;
create policy "Anyone can view approved testimonials"
on public.testimonials for select
to anon, authenticated
using (approved = true);

-- No insert/update policy grants `approved = true` from the client, and
-- there is no public update or delete policy at all. Approving a review
-- means opening this table in the Supabase Table Editor and checking the
-- `approved` box (or using the service-role key from a trusted backend).

create index if not exists testimonials_approved_created_at_idx
  on public.testimonials (approved, created_at desc);
