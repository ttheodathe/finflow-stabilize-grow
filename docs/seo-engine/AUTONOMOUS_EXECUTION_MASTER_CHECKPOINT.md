# FinFlow Track SEO Engine — Autonomous Master Checkpoint

Updated: 2026-11-20 04:35 CAT (UTC+02:00)
Repository: ttheodathe/finflow-stabilize-grow
Recovery branch: fix/seo-engine-controlled-recovery
Last remotely verified code HEAD before this checkpoint: 91638005b00aea59229ecc77c8426397da5636db
Required historical baseline: 6f08a56d17e8189ff03b9b8d692c67f891e1369e

## Mission
Complete the existing acquisition engine in place. Optimize for qualified organic registrations and meaningful product activation, not traffic or article count. Preserve human editorial approval, dry-run defaults, $0 budget, and strict acceptance/production isolation.

## Repository and PR reconstruction
- Recovery branch and origin branch were both at 91638005... at mission entry; baseline 6f08a56... and repair 91638005... are ancestors. Entry tree was clean.
- origin/main is 915eee2fe57b890bc51779d2a3fcab038d94d998. Recovery branch diverges from main; do not merge/rebase into main.
- PR #119 is closed. Main contains merge commit 915eee2... despite PR body saying draft, no merge authorization requested, and "do not merge". Historical actor/authorization is not established. No PR reviews/inline review threads were found. Comments record two Vercel free-tier deployment-quota failures and a later Ready preview. This is not evidence of production deployment.
- A local build regenerated src/routeTree.gen.ts and a rerun of typecheck passed. That generated file is currently a local change and has not been pushed to the recovery branch.

## PR #119 acceptance job forensic review

- GitHub Actions run 44560803819 completed with overall CI success. Its Genuine GSC to persisted editorial draft acceptance job (135690305719) ran on merge ref 3c90f52915abc400c1c409e38348c8dfe467452b.
- The job downloaded the original historical GSC artifact and verified SHA-256 38e932ab4052dfb2d001e0e7935e40ee87227b0f2e212db40321981a1f5022cd.
- The acceptance runner reported BLOCKED_MISSING_ACCEPTANCE_SUPABASE_CREDENTIALS. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY were empty. It explicitly states no acceptance write and no Scheduler 2 execution were attempted.
- The fresh read-only collection failed before any Google API request because the caller omitted dateRange; error: Cannot read properties of undefined (reading 'startDate').
- The blocked branch used process.exit(0), so GitHub marked the acceptance job successful even though persistence was blocked. This was a false-green status, not a successful acceptance test.
- The recovery branch fix defaults collect() and collectPartial() to resolveDateRange(), adds regression tests, requires SEO_ACCEPTANCE_WRITE_AUTHORIZED=true before acceptance writes, requires the acceptance-write-authorized PR label, makes blocked acceptance exit non-zero, and uploads the blocked evidence artifact with if: always().
- The acceptance job is hard-coded to PR #119, now closed. No new acceptance run was triggered. The historical run did not write to acceptance.

## Main-branch scheduler safety note

The three workflows present on main have daily schedules and reference SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, target bufbyfwstdqvwnkhyrea, and set SEO_PERSISTENCE_REQUIRED=true. The PR #119 run showed those secret values empty in that run, but actual scheduled run history and current secret availability were not independently verified. No schedule was triggered or disabled. main remains out of scope; any pause/disable action requires separate authorization.

## Tests on the inspected workspace
- SEO/scheduler/content/persistence/research suite: 100/100 passed.
- Application unit tests: 16/16 passed.
- Security/ReDoS check: passed.
- Lint: exit 0, 44 warnings, 0 errors.
- Production build: exit 0.
- Typecheck: initially failed on eight stale generated-route type errors; after build regenerated src/routeTree.gen.ts, typecheck passed.
- git diff --check passed before checkpoint docs.
- These are local tests; they do not prove live API ingestion, live acceptance persistence, or 24/7 availability.

## Acceptance database — read-only, project bufbyfwstdqvwnkhyrea only
Production project zjaamxvqjiymgfujrtjm was not contacted. No database writes, DDL, DML, migrations, re-key, or replay occurred.

Migration ledger has seven entries: 20261119122622, 20261119123210, 20261119123551, 20261119124259, 20261119124347, 20261119145113, 20261119154716.
- Ledger entry 20261119145113 stores SQL with MD5 36f04ee5fd4001f99c9f584173411870, exactly matching repository migration 20261119170000_seo_ops_research_revision_persistence.sql. The repository migration README explains that acceptance contains combined effects of repository migrations 20261119160000 and 20261119170000 under this single 20261119145113 entry. Do not rewrite ledger or blindly run db push.
- 20261119160000 and 20261119170000 each occur once on the active recovery branch; they are not duplicate prefixes. 20261119145113 filename is absent from the current tree; SQL hash and README explain the version consolidation. The 160000 reader migration is also included in the 170000 combined SQL.
- Active migration tree has duplicate prefixes 20261118130000 and 20261118140000 (two files per prefix). The 130000 files originate in commits 703d4127aaf71b52f4170c6623739c2ad0e9a82b (invoice journal trigger) and aba4508c370fe08a5418c494f49659daaa3182cb (partner pending-email uniqueness). The 140000 files originate in ff9e78e88f5c5b89001b38c750e70dcb12ec4315 / c9f91ad523144dfb2d1d7894e34b3e9ef7cb76f6 (finance/inventory RPC roles) and 5bcea750e2e0c8f519123e99a50c7d789fb9c63f / 4bfd383581153210f6ca07c8c9bfa3fc279a18b4 (revoke anonymous table access). Other fetched branches show collisions at 20261117161000, 20261117170000, 20261117180000. Production migration ledger was not inspected; full branch/environment reconciliation remains open. Do not bulk-push migrations.
- seo_ops.opportunities has UUID PK, opportunity_key TEXT NOT NULL UNIQUE, scheduler_run_id FK to scheduler_runs. research_records has UUID PK, opportunity_id FK to opportunities, unique (opportunity_id, source_url). content_revisions has FK to content_operations and unique operation/hash and operation/revision constraints.
- attribution_touchpoints.visitor_key_hash is TEXT NOT NULL + UNIQUE. Source migration 20261119122622_seo_operations_persistence.sql declares `visitor_key_hash text not null` and `unique (visitor_key_hash)`; the live acceptance schema matches. It has zero rows, so no populated duplicate/null samples exist.
- Current acceptance counts: opportunities 1; research_records 1; scheduler_runs 2; content_operations 1; content_revisions 1; activation_snapshots 1; attribution_touchpoints 0; editorial_approvals 0; deployment_verifications 0; rollback_events 0.
- The only opportunity and research row are explicit example.test fixture data. Both scheduler runs have output.fixture=true. The activation snapshot is activation-fixture-v1, explicitly synthetic (6 registered, 5 onboarding, 2 activated, 1 returning). None of these are real product metrics or genuine GSC evidence.
- No historical genuine GSC opportunity set is present in acceptance. This does not prove no earlier colliding upsert overwrote a row; overwritten values cannot be inferred from current state.

## System reconstruction
- GSC: official Search Analytics API; default property sc-domain:finflowtrack.com; page/query/page-query/country/device/search-appearance dimensions; 25,000 row pages; 250,000 safety cap; retries for 429/5xx. The missing default date range exposed by PR #119 is fixed with regression tests.
- GA4: Analytics Data API property 546829553; Organic Search sessions, active users, engaged sessions, keyEvents; 100,000 row pages; 500,000 safety cap. Scheduler 1 treats GA4 as supplementary; Scheduler 3 preserves independent source status.
- Previously verified historical GSC artifact: Actions run 44448533423, artifact 14494691265, property sc-domain:finflowtrack.com, 2026-10-19..2026-11-15, extracted JSON SHA-256 b44222f584e963e3de17f450fee8dba68c6b1586cbbbf8f025973c2c0c6eff83. This does not prove current API permissions/freshness.
- App events exist for auth_started, auth_completed (mode distinguishes signup/login), onboarding_completed, invoice_created, expense_created and first_value_action_completed. First-value is inferred client-side after a successful invoice/expense write by querying company record counts. Event-level GA4 reporting and reliable cross-session attribution are not yet verified.
- Three GitHub Actions schedulers run daily at 00:15, 01:45 and 03:15 UTC. Daily cron is not continuous worker availability or guaranteed 24/7 execution. Publishing/update flags remain disabled.
- Research, source verification, draft generation, editorial approval checks, persistence adapters and readback RPCs exist. Genuine acceptance persistence and live human approval are not validated.

## Stage status
A INVESTIGATING — architecture mapped; full repository/security audit remains.
B INVESTIGATING — ledger, keys and fixture rows inspected; duplicate migration prefixes and full provenance remain.
C IMPLEMENTED — collector and historical artifact tests exist; fresh live GSC collection not verified.
D IMPLEMENTING — app events exist; event-level registration/activation reports and attribution incomplete.
E IMPLEMENTED — scoring and SHA-256 identity; fresh genuine GSC validation pending.
F IMPLEMENTED — source retrieval and claim checks; broader source coverage audit pending.
G IMPLEMENTED — research/drafting/quality gates exist; live provider/content quality validation pending.
H INVESTIGATING — mocked persistence and readback tests; acceptance contains fixtures only.
I IMPLEMENTED — three daily schedulers; continuous availability/heartbeat/alert proof pending.
J INVESTIGATING — safeguards and security tests pass; full threat/privacy/dependency review pending.
K BLOCKED — acceptance writes/replay/re-key require separate explicit authorization.
L IMPLEMENTED — product-relevant content topics exist; real organic customer conversion evidence absent.
M INVESTIGATING — snapshots exist; real registration-to-activation/retention feedback loop unverified.
N BLOCKED — cannot declare operational readiness before genuine data, conversion proof and authorized acceptance validation.

## Files inspected
Repository tree, package.json, .env.example names only, SEO README, scheduler README, collector/auth/normalization, three schedulers, persistence adapter, research/acceptance runner, CI and scheduler workflows, SEO migrations and migration README, app analytics helper, auth/onboarding/invoice/expense routes, generated route tree, PR #119 metadata/comments/reviews.

## Current workspace changes
- src/routeTree.gen.ts: generated by npm run build; adds route entries for existing route files and resolves typecheck errors locally.
- docs/seo-engine/AUTONOMOUS_EXECUTION_MASTER_CHECKPOINT.md
- docs/seo-engine/REMAINING_TASKS_AND_ACCEPTANCE_MATRIX.md

## Restrictions and security
Keep DRY_RUN=true, PUBLISH_ENABLED=false, CONTENT_UPDATE_ENABLED=false, PRODUCTION_CONTENT_WRITE_ALLOWED=false. Acceptance writes additionally require SEO_ACCEPTANCE_WRITE_AUTHORIZED=true and the acceptance-write-authorized PR label. Do not run acceptance-run.mjs with credentials, apply migrations, re-key, replay, publish, deploy production, change secrets/env, or merge main. Never expose credential values. Only acceptance SELECT/catalog reads were performed.

## Next actions
1. Finish read-only migration collision and provenance analysis; no ledger changes.
2. Validate visitor_key_hash source migration against the live NOT NULL + UNIQUE schema (live table empty).
3. Run the existing manual read-only GSC collection only if an authenticated dispatch path is available; do not trigger persistence schedulers.
4. Add tested event-level GA4 reporting for existing signup and first-value events, without changing GA4 settings or overstating user/landing attribution.
5. Continue scheduler recovery, security, content quality, and $0 operational-limit audits.
6. Obtain separate explicit authorization before any acceptance write/replay/re-key.

## Resume commands
```bash
git fetch origin fix/seo-engine-controlled-recovery
git checkout fix/seo-engine-controlled-recovery
git status --short --branch
git log --oneline --decorate -20
node --test seo-engine/*.test.mjs seo-engine/content-ops/*.test.mjs seo-engine/persistence/*.test.mjs seo-engine/research/*.test.mjs seo-engine/schedulers/*.test.mjs
npm run test:unit && npm run test:security && npm run lint && npm run typecheck && npm run build
```
Do not run acceptance replay or production commands on resume.

## Evidence
- Recovery branch: https://github.com/ttheodathe/finflow-stabilize-grow/tree/fix/seo-engine-controlled-recovery
- Identity repair: https://github.com/ttheodathe/finflow-stabilize-grow/commit/91638005b00aea59229ecc77c8426397da5636db
- PR #119: https://github.com/ttheodathe/finflow-stabilize-grow/pull/119
- Main merge commit: https://github.com/ttheodathe/finflow-stabilize-grow/commit/915eee2fe57b890bc51779d2a3fcab038d94d998
- Migration provenance: https://github.com/ttheodathe/finflow-stabilize-grow/blob/main/supabase/migrations/README.md
