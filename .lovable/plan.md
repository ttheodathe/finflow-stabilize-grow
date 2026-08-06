# Partner & Referral System — Architecture Review & Phase 1 Plan

## 1. Architecture review (what exists today)

- **Framework**: TanStack Start v1 (React 19, Vite 7, Tailwind v4 tokens in `src/styles.css`), deployed on an edge worker.
- **Routing**: file-based in `src/routes`. Public pages at top level (`pricing.tsx`, `about.tsx`, …) using `SiteHeader`/`SiteFooter`. App pages under `src/routes/_authenticated/` behind an `ssr:false` gate that enforces auth → email verified → company membership → payment.
- **Auth**: Supabase; `requireSupabaseAuth` middleware for server functions; RLS everywhere.
- **Data access**: two patterns already in use — browser client + `src/services/<domain>/*.service.ts` + React Query hooks (team, tax, inventory), and `createServerFn` in `src/lib/*.functions.ts` for privileged/server logic (billing, payroll, AI).
- **Billing**: Paddle (`src/lib/paddle/*`), `subscriptions` / `billing_events` tables, webhook at `src/routes/api/public/paddle/webhook.ts`.
- **RBAC**: `roles`, `permissions`, `role_permissions`, `company_members`, plus `usePermissions` / `useCurrentRole` hooks. Feature gating via `src/lib/features/catalog.ts` + `useFeatureGate` + `plan-guard.ts`.
- **Company scoping**: active company in localStorage (`useActiveCompanyId`), inserts wrapped by `scoped()` in `src/lib/company-scope.ts`.
- **Emails**: Resend via lazy `getResend()`; React Email templates in `src/emails/`.
- **UI**: shadcn components in `src/components/ui`, semantic tokens only, dark/light supported.

## 2. Compatibility report

No existing table, route, component, or API needs to change. The module is fully additive:
- New public routes `/partners` and `/partners/apply` (no collision with existing files).
- New authenticated subtree `_authenticated/partner.*` and `_authenticated/admin.partners.*`.
- New tables prefixed `partner_*` / `referral_*`.
- One **additive, nullable** column set on attribution: referral link recorded in a new `referral_attributions` table keyed by `user_id` — `profiles`/`subscriptions` are **not** altered.
- Paddle webhook: append a commission-accrual call inside the existing handler (additive branch, no behaviour change if the customer has no referral).

**No breaking change detected**, so implementation can proceed incrementally.

## 3. Risk analysis

| Risk | Mitigation |
| --- | --- |
| Money correctness | All commission math server-side in SQL functions/server fns; ledger is append-only with reversal rows, never in-place edits. |
| Self-referral / fraud | Block partner's own user_id, unique constraint on (referred_user_id), IP+UA hash on clicks, rate limits on the public click endpoint. |
| Attribution loss | First-touch + last-touch stored in a cookie (90d) AND persisted server-side at signup; refresh-safe. |
| Webhook double-pay | Idempotency on `billing_events.event_id` + unique (subscription_id, period_start) on commission rows. |
| Bundle size | Partner routes are separate route files → code-split by default; QR generated with a small dep only on the dashboard route. |
| RLS leakage | Partner sees only own rows; admin access via a `partner_admins`/`has_role` check in security-definer functions. |

## 4. Database changes (Phase 1, new tables only)

`partners`, `partner_applications`, `referral_links`, `referral_clicks`, `referral_attributions`, `commission_rules`, `commissions`, `partner_payouts`, `partner_audit_logs`.

Each: PK uuid, FKs to `auth.users`/`companies`, `created_at/updated_at` + trigger, indexes on lookup columns (`code`, `partner_id`, `status`, `created_at`), CHECK constraints on enums, `GRANT`s for `authenticated`/`service_role` (+ `anon` SELECT only on active `referral_links` for click resolution), RLS policies, and a matching `rollback.sql`.

Helper SQL: `is_partner_admin()`, `resolve_referral_code(text)`, `record_referral_click(...)`, `attach_referral_on_signup(...)`, `accrue_commission(subscription_id, amount, currency)`.

## 5. Folder / file changes (Phase 1)

```text
supabase/partner_module.sql            (+ partner_module_rollback.sql)
src/types/partner.types.ts
src/services/partner/partner.service.ts
src/services/partner/referral.service.ts
src/services/partner/commission.service.ts
src/lib/partner/referral-tracking.ts   cookie/UTM capture, first+last touch
src/lib/partner.functions.ts           server fns: apply, approve, stats, accrual
src/hooks/usePartner.ts  usePartnerStats.ts  useReferralLink.ts
src/components/partner/*               StatsCards, ReferralLinkCard, ReferralsTable,
                                       CommissionsTable, ApplicationForm, StatusBadge
src/routes/partners.tsx                public "Become a Partner" landing
src/routes/partners.apply.tsx          application form
src/routes/r.$code.tsx                 referral redirect + click tracking
src/routes/_authenticated/partner.dashboard.tsx
src/routes/_authenticated/partner.referrals.tsx
src/routes/_authenticated/partner.commissions.tsx
src/routes/_authenticated/admin.partners.tsx
src/emails/PartnerApplicationReceived.tsx / PartnerApproved.tsx
```

Touched existing files (additive only): `src/components/app-sidebar.tsx` (Partner section), `src/routes/api/public/paddle/webhook.ts` (accrual hook), `src/routes/auth.tsx` (persist referral cookie at signup), `SiteFooter` link.

## 6. API endpoints

Server functions (`src/lib/partner.functions.ts`): `submitPartnerApplication`, `getMyPartner`, `getPartnerStats`, `getPartnerReferrals`, `getPartnerCommissions`, `adminListApplications`, `adminDecideApplication`, `adminAdjustCommission`.
Public route: `GET /r/$code` (redirect + click record), reusing `/api/public/*` conventions for anything external.

## 7. UI screens (Phase 1)

Become a Partner (public, SEO head), Application form + status page, Partner dashboard (stat cards, referral link + QR + copy, funnel, recent referrals), Referrals table, Commissions table, Admin partners table with approve/reject/need-info. All shadcn + existing tokens, responsive, dark/light.

## 8. Security review

RLS on every table; partner rows scoped by `auth.uid()`; admin actions behind security-definer functions checking `is_partner_admin()`; zod validation on every server fn; parameterised queries only (no string SQL); no client-side commission math; audit log on every admin action; rate limit on `/r/$code` and the application form; payout details stored in a restricted table not exposed by the Data API to `anon`.

## 9. Performance review

Indexed lookups, keyset/offset pagination + server-side filters on all tables, aggregated stats via a SQL function (single round-trip) with React Query `staleTime`, click writes are fire-and-forget inserts, route-level code splitting, QR generated client-side.

## 10. Migration plan

1. Apply `supabase/partner_module.sql` (additive; existing app unaffected).
2. Ship Phase 1 code behind a sidebar entry visible only to approved partners/admins.
3. Verify typecheck, lint, build, and existing routes.
4. Phase 2: marketing center, analytics dashboards, payouts + statements, automated emails.
5. Phase 3: multi-tier (L1–L3), reseller tools, fraud detection, cross-device attribution, partner API.
Rollback: run `partner_module_rollback.sql` and remove the additive call sites.

## Phase 1 scope to implement on approval

Referral links + tracking, partner applications, admin approval, partner dashboard, basic recurring commission accrual — plus tests for tracking, commission math, and permissions.
