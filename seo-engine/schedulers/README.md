# Three-scheduler SEO operations

All schedule expressions are UTC. Kigali uses UTC+2.

| Scheduler | UTC | Kigali | Responsibility |
|---|---:|---:|---|
| 1 — Search intelligence | 00:15 | 02:15 | GSC collection, evidence-based page opportunities, selected technical checks, durable opportunity records |
| 2 — Content operations | 01:45 | 03:45 | Requires today's successful Scheduler 1 run; creates a dry-run editorial queue and records the scheduler run |
| 3 — Performance and learning | 03:15 | 05:15 | Independently collects GSC/GA4, reports partial data and stores available aggregate snapshots |

The three daily workflows are the only daily SEO schedulers. The existing `seo-data-collection.yml` remains manual-dispatch only. The general CI workflow is not a scheduler.

## Safety contract

The production contract is fail-closed:

- `DRY_RUN=true`
- `PUBLISH_ENABLED=false`
- `CONTENT_UPDATE_ENABLED=false`
- `PRODUCTION_CONTENT_WRITE_ALLOWED=false`

Missing flags resolve to safe values. Invalid values and contradictory combinations throw errors. Scheduler 2 asserts this contract before processing its queue. The production values are explicitly set in every scheduler workflow.

## Approval and content operations

The GitHub content adapter now delegates approval verification to `github-approval.mjs`. It checks the current open PR, exact base branch, referenced GitHub review, latest reviewer decision, reviewer repository permission, current PR head SHA, exact proposed file contents, operation marker, content hash and a seven-day approval age. A caller-supplied approval object is a locator, not proof of identity.

The adapter supports repository Markdown create/update operations on an explicitly configured non-production staging branch. It binds approval to the exact path and content hash, stores immutable pre-update snapshots, rejects duplicate slugs and stale baselines, and writes operation records. Rollback supports new articles and updates; it checks the recorded blob SHA and refuses to overwrite a later concurrent change. Rollback is staging-only.

The adapter's public URL verifier currently checks HTTP success, expected title/text and canonical URL. It does **not yet** verify Vercel deployment state/commit identity, noindex, sitemap or RSS membership. A GitHub commit is not reported as publication success unless the configured URL check passes.

## Durable persistence

The acceptance project contains the private `seo_ops` schema with 11 RLS-enabled tables. Browser roles have no schema usage or table privileges; only `service_role` is granted access. Public-schema RPC entry points are executable only by `service_role` and write to the private schema.

Scheduler 1 persists its run and opportunity records. Scheduler 2 persists its run record. Scheduler 3 independently persists its run and available GSC/GA4 performance snapshots. The workflows expect repository secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; Scheduler 1 and Scheduler 2 fail closed if persistence credentials are absent. Scheduler 3 still emits its independent report when persistence is unavailable.

The activation snapshot schema and RPC are present. A synthetic acceptance fixture verifies the proposed user-level rule using registered users, completed onboarding, and persisted invoice/expense actions. It excludes known void/cancelled/reversed invoice states, counts each user once across companies, and defines a returning activated user as having qualifying actions on at least two UTC dates.

**Production activation is not yet connected.** The live schema inspection confirmed that Auth user creation triggers create both `profiles` and `onboarding_progress`; invoices and expenses carry `user_id` and `company_id`. The live invoice statuses observed were `draft`, `sent`, `overdue` and `paid`. The expense table has no status/reversal column, so a persisted expense row is currently treated as qualifying; that limitation must be retained in reporting. A least-privilege read-only production data credential is not configured, and no production schema or environment changes were made.

## Current boundaries

- Scheduler 2 deliberately creates review candidates, not articles. It does not generate drafts when verified research is missing.
- Source-backed research, claim-to-source validation, full article generation and keyword-cannibalization analysis remain incomplete.
- Content-operation records and research evidence are not yet fully written to Supabase; only scheduler runs and the currently supported opportunity/performance records are persisted.
- Attribution remains `UNKNOWN` unless first-party consented evidence is available. GSC query data is never treated as user-level attribution.
- Vercel branch previews are enabled. The latest verified preview deployment at the time of the previous check was READY; protected preview URL verification and article-level deployment verification remain outstanding.
- The adapter's new approval and rollback tests are included in CI, but end-to-end staging publication has not yet been executed.
- No live production article is created, updated, deleted or deployed by these workflows.
