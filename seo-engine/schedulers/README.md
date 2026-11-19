# Three-scheduler SEO operations

All schedules use UTC. Africa/Kigali is UTC+2.

- **Scheduler 1 — Search intelligence:** 00:15 UTC / 02:15 Kigali. Collects GSC evidence, scores page opportunities, runs selected technical checks, and persists run and opportunity records.
- **Scheduler 2 — Content operations:** 01:45 UTC / 03:45 Kigali. Requires a successful Scheduler 1 run for the same UTC day. It validates targets against the Markdown inventory, creates a dry-run editorial queue, and persists proposal records.
- **Scheduler 3 — Performance and learning:** 03:15 UTC / 05:15 Kigali. Runs independently, collects GSC and GA4 aggregates independently, preserves either source when the other fails, reports explicit per-source availability, and persists available performance snapshots.

These are the only three daily SEO scheduler workflows. The existing `seo-data-collection.yml` remains manual-dispatch only. The general CI workflow is not a scheduler.

## Safety contract

The production contract is fail-closed:

- `DRY_RUN=true`
- `PUBLISH_ENABLED=false`
- `CONTENT_UPDATE_ENABLED=false`
- `PRODUCTION_CONTENT_WRITE_ALLOWED=false`

Missing flags resolve to safe values. Invalid values and contradictory combinations throw errors. Scheduler 2 asserts this contract before processing its queue. The production values are explicitly set in every scheduler workflow.

## Approval and content operations

The GitHub content adapter delegates approval verification to `github-approval.mjs`. It checks the current open PR, exact base branch, referenced GitHub review, latest reviewer decision, reviewer repository permission, current PR head SHA, exact proposed file contents, operation marker, content hash, and a seven-day approval age. A caller-supplied approval object is a locator, not proof of identity.

The adapter supports repository Markdown create/update operations on an explicitly configured non-production staging branch. It binds approval to the exact path and content hash, stores immutable pre-update snapshots, rejects duplicate slugs and stale baselines, and writes operation records. Rollback supports new articles and updates; it checks the recorded blob SHA and refuses to overwrite a later concurrent change. Rollback is staging-only.

The adapter's public URL verifier currently checks HTTP success, expected title/text, and canonical URL. It does not yet verify Vercel deployment state/commit identity, noindex, sitemap, or RSS membership. A GitHub commit is not reported as publication success unless the configured URL check passes.

Scheduler 2 only queues GSC targets whose slugs match existing files in `content/blog/`. Unmatched targets are reported rather than misclassified as article updates. The queue is research-required and does not generate an article without verifiable sources.

## Durable persistence

Scheduler 3 uses `collectPartial` so a GSC outage does not discard GA4 data and a GA4 outage does not discard GSC data. Unavailable provider metrics remain `null`; successful empty results remain numeric zero. `seo-engine/performance-learning.test.mjs` covers both one-source failure directions and report-level partial status.\n\nThe acceptance project contains the private `seo_ops` schema with 11 RLS-enabled tables. Browser roles have no schema usage or table privileges; only `service_role` is granted access. Public-schema RPC entry points are executable only by `service_role` and write to the private schema.

The acceptance migrations provide RPCs for scheduler runs, opportunities, performance snapshots, activation snapshots, and target-bound content-operation proposals. The store client is server-only and uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Scheduler 1 and Scheduler 2 fail closed if persistence credentials are absent. Scheduler 3 still emits its independent report when persistence is unavailable.

## Activation and attribution

The synthetic acceptance fixture verifies user-level counting across multiple companies and multiple users in one company. Activation requires a registered profile, completed onboarding, and at least one persisted non-void invoice or persisted expense. A returning activated user has qualifying actions on at least two distinct UTC dates. Duplicate actions on the same day do not inflate returning counts. The fixture also covers incomplete onboarding, void invoices, and deleted users.

A read-only production aggregate query is available at `seo-engine/activation/production-aggregate-readonly.sql`. It emits aggregate counts only and does not select user IDs, names, emails, invoice IDs, or financial values. Scheduler 3 does not execute it automatically because a least-privilege production read-only database connection is not configured.

The live schema contains `profiles.created_at`, `onboarding_progress.completed_at`, `invoices.user_id/created_at/status`, and `expenses.user_id/created_at`. The expense table has no status or reversal column. Persisted expense rows are therefore treated as qualifying, while hard-deleted rows are absent; a separately recorded offsetting expense cannot be identified as a reversal from these columns alone.

Attribution remains `UNKNOWN` unless consented first-party evidence is available. GSC query data is never treated as user-level attribution.

## Current boundaries

- Source-backed research, claim-to-source validation, keyword-cannibalization analysis, and a complete article-drafting pipeline remain incomplete.
- Content-operation proposals are persisted, but research records, draft revisions, authenticated approvals, deployment verifications, and rollback events are not yet fully integrated with the scheduler database.
- The acceptance approval verifier and adapter tests do not replace a real end-to-end staging publication/update test.
- The adapter does not yet verify Vercel deployment READY state, exact deployment commit, noindex, sitemap, or RSS behavior.
- Production activation aggregation is not automated; the SQL query must be run through a properly authorized read-only connection.
- No live production article is created, updated, deleted, or deployed by these workflows.
