# FinFlow Paddle Sandbox Billing

Using pre-provisioned Paddle sandbox price IDs and API keys. Only `PADDLE_WEBHOOK_SECRET` will be added after webhook URL is deployed.

## 1. Secrets

Store the Paddle env vars via `add_secret` (server-only). Also expose `VITE_PADDLE_CLIENT_TOKEN` and `VITE_PADDLE_ENV` for browser Paddle.js. Add placeholder for `PADDLE_WEBHOOK_SECRET` (user pastes after registering webhook in Paddle dashboard).

## 2. Database migration (`supabase/paddle_billing.sql`)

Create if missing (idempotent):

- `subscriptions` — id, company_id (FK), owner_id (FK auth.users), paddle_customer_id, paddle_subscription_id (unique), price_id, plan (`free|pro|business|enterprise`), status, billing_cycle (`monthly|yearly|null`), current_period_start, current_period_end, cancel_at_period_end, timestamps.
- `customers` — id, user_id, company_id, paddle_customer_id (unique), billing_email, created_at.
- `billing_events` — id, event_type, paddle_event_id (unique for idempotency), payload jsonb, processed bool, error text, created_at.

GRANTs, RLS: owners & company admins read their own; only service_role writes. Add helper `get_active_subscription(company_id)`.

## 3. Paddle module (`src/lib/paddle/`)

- `config.ts` — plan→price_id map (monthly/yearly), plan metadata (limits: companies, seats, feature flags).
- `client.ts` — browser Paddle.js loader + `openCheckout({ priceId, customerEmail, companyId, userId, plan, cycle })` passing `customData` for webhook mapping.
- `webhook.server.ts` — signature verification (HMAC over raw body using `Paddle-Signature` header per Paddle spec), typed handlers per event.

## 4. Server routes / functions

- `src/routes/api/public/paddle/webhook.ts` — POST; verify signature, upsert `billing_events` (idempotent by `paddle_event_id`), handle `subscription.created|updated|canceled|paused|resumed`, `transaction.completed`, `payment.failed|succeeded`; upsert `subscriptions` via `supabaseAdmin`.
- `src/lib/billing.functions.ts` — `getMySubscription({companyId})` (auth middleware), `cancelSubscription`, `resumeSubscription`, `createFreeSubscription` (used at onboarding).

## 5. Pricing page (`src/routes/pricing.tsx`)

Update plans to exact copy from spec. Monthly/yearly toggle. Buttons:
- Free → signup or "Current"
- Pro/Business → open Paddle checkout (redirect to `/auth?next=/settings/billing&plan=…` if not logged in)
- Enterprise → `/contact`

## 6. Billing settings page (`src/routes/_authenticated/settings.billing.tsx`)

Show current plan, status, cycle, renewal, IDs, upgrade options (opens checkout), cancel button, invoice history from Paddle (list via API in server fn).

Add "Billing" tab entry in existing settings page.

## 7. Onboarding

After company creation, add "Choose Plan" step. Free → insert `subscriptions` row with plan=free directly; paid → open Paddle Checkout with `customData: { company_id, user_id }`, then redirect to dashboard (webhook activates).

## 8. Gating helpers (`src/lib/subscription-limits.ts`)

`canCreateCompany`, `canInviteUser`, `canUseInventory`, `canUsePayroll`, `canUseCRM`, `canUseProjects`, `canUseAPI` — read active subscription plan, compare with limits table. Both:
- Client hook `useSubscriptionLimits(companyId)` for UI.
- Server enforcement in relevant server fns (add checks to invite/create-company flows).

## 9. Cleanup

- Remove Razorpay references: search `razorpay`, `RAZORPAY_*`; delete provider toggle in `upgrade-settings-form.tsx`.
- Consolidate plan config to `src/lib/paddle/config.ts`; deprecate `src/components/Subscription_Plans.ts` re-export.

## 10. Verification

- `bun run build` green.
- Manual sanity via preview: pricing page renders, checkout opens (client token present).
- Webhook signature verification unit-tested with sample payload.

## Technical notes

- Paddle Billing webhook uses `Paddle-Signature: ts=…;h1=…`; HMAC-SHA256 of `${ts}:${rawBody}` with `PADDLE_WEBHOOK_SECRET`, timing-safe compare.
- Webhook route under `/api/public/paddle/webhook` (bypasses auth). Uses `supabaseAdmin` after signature verification.
- Reads all `process.env.*` inside handlers (Worker runtime).
- `customData` on checkout carries `company_id`, `user_id`, `plan`, `cycle` so webhook can attribute the subscription without extra lookups.
- Paddle.js loaded lazily on pricing/billing pages only.

## Out of scope

Not creating Paddle products/prices, not touching auth, dashboard, or unrelated features.
