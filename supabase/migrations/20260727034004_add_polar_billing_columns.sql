-- Additive columns so the Polar webhook can write to the same
-- subscriptions/customers/billing_events tables the Paddle code uses.
-- Idempotent — safe to run multiple times.

alter table public.subscriptions
  add column if not exists polar_customer_id text,
  add column if not exists polar_subscription_id text;

drop index if exists subscriptions_polar_subscription_id_key;
create unique index subscriptions_polar_subscription_id_key
  on public.subscriptions (polar_subscription_id)
  where polar_subscription_id is not null;

alter table public.customers
  add column if not exists polar_customer_id text;

drop index if exists customers_polar_customer_id_key;
create unique index customers_polar_customer_id_key
  on public.customers (polar_customer_id)
  where polar_customer_id is not null;

-- billing_events was built Paddle-only (paddle_event_id NOT NULL).
-- Relax that and add a parallel column + source tag for Polar events.
alter table public.billing_events
  alter column paddle_event_id drop not null;

alter table public.billing_events
  add column if not exists polar_event_id text,
  add column if not exists source text not null default 'paddle';

drop index if exists billing_events_polar_event_id_key;
create unique index billing_events_polar_event_id_key
  on public.billing_events (polar_event_id)
  where polar_event_id is not null;

alter table public.billing_events
  drop constraint if exists billing_events_source_check;
alter table public.billing_events
  add constraint billing_events_source_check
  check (source in ('paddle','polar'));
