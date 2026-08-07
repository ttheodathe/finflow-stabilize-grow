# Partner & Referral Module — file bundle

This bundle contains every file added or modified to build the Partner &
Referral module for FinFlowTrack, across all three phases. It mirrors the
exact repo paths in `ttheodathe/finflow-stabilize-grow`, so each file can be
dropped straight into place, OR you can apply `partner-referral-module.patch`
with `git apply` from the repo root (see below).

## How to apply

**Option A — one command (recommended):**
```bash
cd finflow-stabilize-grow
git apply --index /path/to/partner-referral-module.patch
git commit -m "Add Partner & Referral module (Phases 1-3)"
git push
```
If `git apply` complains about context drift (only likely if the repo has
moved since this was built), fall back to Option B.

**Option B — copy files manually:**
Copy everything under this folder (except this README and the .patch file)
into your repo root, preserving paths, then commit.

## Database migrations — apply BEFORE the code

These six files are the actual database schema and must be applied to your
Supabase project first (via the Supabase CLI, dashboard SQL editor, or MCP),
in this exact order — they're numbered so this is also the correct
`supabase/migrations/` apply order:

1. `20260806120000_partner_platform_staff_flag.sql`
2. `20260806120500_partner_applications_and_partners.sql`
3. `20260806121000_partner_referral_tracking_and_commissions.sql`
4. `20260807090000_partner_payouts.sql`
5. `20260807100000_partner_multi_tier_and_commission_review.sql`
6. `20260807100500_partner_api_keys.sql`

These have **already been applied** to your live Supabase project
(`zjaamxvqjiymgfujrtjm`) during this session — this step is only needed if
you're setting up a fresh environment (staging, local dev, another
Supabase project) from scratch.

## New/changed files (29 total)

**Modified (6):**
- `src/components/app-sidebar.tsx` — added "Partners" nav link
- `src/integrations/supabase/types.ts` — regenerated Supabase types (includes all new tables)
- `src/routeTree.gen.ts` — TanStack Router auto-generated tree (regenerate with `vite build` if it drifts)
- `src/routes/__root.tsx` — added one-line referral-capture effect
- `src/routes/_authenticated/companies.tsx` — added one-line attribution call after company creation
- `src/routes/api/public/polar/webhook.ts` — added multi-tier commission calculation + fraud flags + emails on `order.paid`

**New — types & services (10):**
- `src/types/partner.types.ts`
- `src/services/partners/partnerApplications.service.ts`
- `src/services/partners/partners.service.ts`
- `src/services/partners/partnerAttribution.service.ts`
- `src/services/partners/partnerPayouts.service.ts`
- `src/services/partners/partnerAnalytics.service.ts`
- `src/services/partners/partnerProgram.service.ts`
- `src/services/partners/partnerApiKeys.service.ts`
- `src/hooks/usePartner.ts`
- `src/hooks/useAdminPartners.ts`
- `src/lib/referral.ts`

**New — routes (7):**
- `src/routes/partners.apply.tsx` — public "Become a Partner" page
- `src/routes/_authenticated/partners.tsx` — partner dashboard
- `src/routes/_authenticated/admin.partners.tsx` — staff admin panel
- `src/routes/api/public/partners/track-click.ts` — click tracking endpoint
- `src/routes/api/public/partners/stats.ts` — partner API-key stats endpoint
- `src/routes/api/partners/notify-application.ts` — staff-authenticated notification email endpoint

**New — migrations (6):** see above.

## Before you merge — verification already done

`npx tsc --noEmit`, `npx vite build` (full Nitro/Cloudflare production
build), and `npx eslint` were all run clean against this exact set of
files in the sandboxed clone this was built in. If you apply this to a
repo state that has diverged since, re-run all three before merging.

## Known gaps (see prior chat messages for full detail)

- No real brand assets (logos/banners/videos) — marketing resources page
  has guide text only.
- No payment gateway integration (Stripe/Wise/PayPal/Flutterwave) —
  payouts are manual, `partner_payouts.method` is free text.
- No reseller-specific tooling (white-label checkout, sub-accounts).
