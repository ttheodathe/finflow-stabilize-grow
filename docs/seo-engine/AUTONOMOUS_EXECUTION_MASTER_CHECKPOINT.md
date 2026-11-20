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

## C.0.3 verification update — 2026-11-20

Latest recovery code commit before this documentation update: 57c4f7f4b1d7a02977e6499ff9d6c8d92e570dbd. Code changes are in 4cd29843ed72c975a4f828a6fc8f0a70ef4175ca and follow-up 57c4f7f4b1d7a02977e6499ff9d6c8d92e570dbd.

- New collector default-range tests: 2 passed. New acceptance-safety tests: 2 passed.
- Full SEO/scheduler/content/persistence/research suite: 104/104 passed.
- Application unit tests: 16/16 passed.
- Security/ReDoS check: passed.
- Lint: exit 0, 44 warnings and 0 errors.
- Production build: exit 0. Typecheck after build: exit 0.
- Build emits existing chunk-size and module-directive warnings; these are not build failures.
- No live GSC API request, acceptance write, replay, migration, or production action was performed. The default-range fix is fixture-tested; current live GSC permissions/freshness remain unverified.
- The acceptance job now requires the explicit PR label and environment authorization flag, preserves blocked evidence even when the run fails, and stops before persistence when credentials are absent.

Next engineering focus: complete the read-only migration collision provenance review, then add event-level GA4 registration/activation reporting using the existing app events. Do not infer registrations or activation from aggregate keyEvents alone.

## Stage B read-only schema, index, RPC and overwrite audit

Inspected acceptance project bufbyfwstdqvwnkhyrea only.

- All 11 seo_ops tables have RLS enabled (not FORCE RLS). Each has a service_role_full_access policy; no anon/authenticated policy was found.
- No user-defined triggers exist on seo_ops tables.
- Eleven public.seo_ops_* RPCs exist. All are SECURITY INVOKER (not SECURITY DEFINER), owned by postgres, use a fixed search_path of pg_catalog + seo_ops, and are executable by service_role only; anon and authenticated have no EXECUTE privilege.
- Read RPCs cover opportunities, research records, content operations and revisions. Write RPCs cover run, opportunity, research, activation snapshot, performance snapshot, content operation and content revision records.
- Unique indexes/constraints cover primary keys, opportunity_key, scheduler run key/date/attempt, research opportunity/source URL, content operation key, revision operation/hash and operation/revision number, performance snapshot key, activation snapshot date, attribution visitor hash, and GitHub review ID. No non-unique secondary indexes were found on seo_ops tables. Foreign-key lookup indexes are therefore a future scale/performance consideration; no DDL was applied.
- The opportunity score CHECK enforces score >= 0 but not score <= 100; application scoring tests enforce the 0–100 scale. A database upper-bound constraint is a possible future migration after migration provenance is reconciled.
- Critical overwrite behavior: public.seo_ops_record_opportunity uses ON CONFLICT(opportunity_key) DO UPDATE and replaces scheduler_run_id, target_url, query_text, opportunity_type, score and evidence. Thus a legacy key collision can overwrite a previously distinct page record. Current acceptance contains only one synthetic opportunity, so no prior genuine record can be recovered or mapped from this database snapshot.
- The visitor_key_hash source migration and live acceptance column both declare TEXT NOT NULL + UNIQUE. The table is empty, so uniqueness is schema-verified but not data-stress-tested.
- The 20261119160000 and 20261119170000 prefixes are each unique in the active recovery tree; the ledger's 20261119145113 combined statement matches the 170000 SQL hash. The actual active-tree duplicate prefixes are 20261118130000 and 20261118140000. Production migration history remains uninspected/out of scope.

Stage B remains INVESTIGATING because the duplicate migration prefixes and historical merge/apply provenance cannot be reconciled against production under the current scope. No database writes or schema changes were made.


## Live recovery reconstruction and validation — 2026-11-20

### Verified remote state
- Repository: `ttheodathe/finflow-stabilize-grow`.
- Recovery branch: `fix/seo-engine-controlled-recovery`.
- Remote branch HEAD at start of this verification: `83373b83518fb172f93c6c4c87c98d3968ec39b6`.
- The branch contains the previously reported identity, acceptance safety, C.0.3 and acceptance schema audit commits. The remote branch had not advanced beyond the reported HEAD at the time of `git ls-remote`.
- Main is separate at merge commit `915eee2fe57b890bc51779d2a3fcab038d94d998`, whose message confirms PR #119 was merged. Recovery and main have diverged; do not merge or reset either branch.
- The saved Vercel workspace was at `8238674009fbee6b3860c3724a820dbdbb3b6555`, three commits behind remote. It was fast-forwarded to the verified remote HEAD. The pre-existing modified checkpoint documents and generated `src/routeTree.gen.ts` were preserved in a Git stash before fast-forward. Applying the stash produced documentation conflicts because remote checkpoint sections were newer; remote checkpoint content was retained and the stash was kept. The generated route tree remained staged in the persistent sandbox snapshot and was not committed. The sandbox later stopped; no changes from that local working tree were pushed.
- GitHub CLI was not authenticated in the sandbox. GitHub connector read-only APIs were used for PR/commit/workflow inspection.

### Fresh local validation on remote HEAD
Command:
`npm run test:unit && npm run test:security && node --test $(find seo-engine -type f -name '*.test.mjs' | sort) && npm run lint && npm run build && npm run typecheck`

Results:
- Application unit tests: 16 passed, 0 failed.
- SEO engine and scheduler tests: 104 passed, 0 failed.
- Security/ReDoS check: exit 0.
- ESLint: exit 0; warnings remain (44 reported in the prior checkpoint).
- Production build: exit 0.
- TypeScript typecheck: exit 0.
- These results are local validation only; they do not establish live Google API collection, live Supabase persistence or production operation.

### PR #119 and historical acceptance-run evidence
- Main merge commit `915eee2fe57b890bc51779d2a3fcab038d94d998` confirms PR #119 merge.
- Historical workflow run `44560803819` had a green GitHub job wrapper, but the acceptance script's own JSON result was `BLOCKED_MISSING_ACCEPTANCE_SUPABASE_CREDENTIALS`. The job environment showed both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` empty. No acceptance database write or Scheduler 2 execution was attempted.
- The same run downloaded and checksum-verified historical GSC artifact `14494691265` (SHA-256 `38e932ab4052dfb2d001e0e7935e40ee87227b0f2e212db40321981a1f5022cd`).
- Fresh read-only GSC collection in that run failed before API collection with `Cannot read properties of undefined (reading 'startDate')`; the later recovery commits add date-range defaults and regression tests.
- The historical script exited successfully despite writing a blocked status artifact. The subsequent fail-closed commits address that misleading green-wrapper behavior. The historical run must not be described as a successful live acceptance test.

### Scheduled workflow risk on main
Read-only inspection of the three workflows on `main` found daily schedules at 00:15, 01:45 and 03:15 UTC:
- Scheduler 1: `.github/workflows/seo-scheduler-1-search-intelligence.yml`; sets `SEO_OPS_ALLOWED_PROJECT_REF=bufbyfwstdqvwnkhyrea`, `SEO_PERSISTENCE_REQUIRED=true`, and passes Supabase service-role credentials.
- Scheduler 2: `.github/workflows/seo-scheduler-2-content-operations.yml`; sets the same acceptance project ref and `SEO_PERSISTENCE_REQUIRED=true`, and passes Supabase service-role credentials.
- Scheduler 3: `.github/workflows/seo-scheduler-3-performance-learning.yml`; passes the same acceptance project ref and Supabase service-role credentials, but does not set `SEO_PERSISTENCE_REQUIRED` in the workflow.
- These workflows set dry-run/publishing safeguards, but those safeguards do not by themselves prove that SEO operations persistence is disabled. Their scheduled execution history and current secret availability were not independently listed by the available GitHub connector.
- Do not dispatch, enable, modify, disable or otherwise interfere with these main-branch workflows under this mission. They are an operational risk requiring a separate owner-controlled decision if acceptance writes must remain prohibited.

### Migration-branch comparison evidence
- GitHub compare APIs show migration-alignment branches diverged substantially from main and recovery.
- `chore/reconcile-all-applied-migration-versions` comparison reports five migration file renames with zero SQL additions/deletions/changes for each listed rename.
- `chore/align-latest-production-migration-versions` reports three migration renames with zero SQL changes.
- `chore/align-supabase-migration-versions` reports two migration renames with zero SQL changes.
- `fix/supabase-migration-version-alignment` reports two migration renames with zero SQL changes, plus CI/runbook edits. The compare metadata maps `20261118170000_partner_application_server_rate_limit.sql` to `20261118025042_partner_application_server_rate_limit.sql` and `20261118180000_invoice_share_link_lifecycle.sql` to `20261118025047_invoice_share_link_lifecycle.sql`; fetching the old paths from the current recovery branch returned 404, so the old-path mapping requires commit-level verification before treating it as a current-file inventory.
- The current recovery branch contains `20261118130000_partner_application_pending_email_uniqueness.sql` (Git blob `8e68176a0b1117746785e54bb81556154f7fa86b`) and `20261118140000_revoke_anonymous_public_table_access.sql` (Git blob `6ac639df40de0b299b0c0241357d7eb6a8c8b756`). This confirms those files exist; it does not by itself resolve the reported cross-branch duplicate-prefix provenance.
- No migration was edited or applied. Acceptance and production databases were not modified. Production migration history remains uninspected.

### Stage E code inspection
- The app already emits custom `auth_completed` events for email sign-up and email login, `onboarding_completed`, `invoice_created`, `expense_created`, and `first_value_action_completed`.
- Invoice and expense creation routes call `trackAccountingAction`. That helper currently checks invoice and expense counts by `company_id` and emits first-value when their combined count is one. This is an analytics proxy, not a verified user activation cohort.
- The production read-only activation SQL defines a separate user-level cohort using registered profiles, completed onboarding and a persisted invoice/expense action. It excludes void/cancelled/reversed/deleted invoice statuses. The client helper's company-level count is not equivalent to that definition.
- The GSC collector requests page/query/page-query/country/device/search-appearance dimensions. The GA4 collector currently requests date, landing page and session channel with sessions, active users, engaged sessions and key events. It does not collect `eventName` rows. Therefore event-level GA4 conversion reporting and organic event attribution remain incomplete.
- The current auth route emits custom `auth_completed`; standard GA4 `sign_up` and `login` events are not yet confirmed in the current recovery branch. Google OAuth new-user versus returning-login distinction is unresolved.
- No code changes were committed in this verification pass. The Vercel sandbox stopped during the subsequent implementation attempt; the mapped Vercel CLI fallback was unavailable in the execution container. Do not infer that an attempted but unexecuted edit was applied.

### Exact next safe engineering action
Resume a repository execution workspace from the persistent recovery snapshot or another authorized local workspace, inspect its preserved stash and staged generated route tree, then implement GA4 eventName collection and regression tests. Do not change the main scheduled workflows or execute acceptance persistence. Re-run the complete validation command above before committing any code.


## Stage E GA4 measurement execution — 2026-11-20

Current remote recovery branch HEAD at entry: `018bc9f708c33a9d3a2536806e891ea50e622a44`. The branch is two documentation-only commits ahead of code HEAD `83373b83518fb172f93c6c4c87c98d3968ec39b6`. The required branch exists and is not merged into main.

Read-only source inspection confirms:
- `seo-engine/collect.mjs` currently collects GA4 date + landingPagePlusQueryString + sessionDefaultChannelGroup with sessions, activeUsers, engagedSessions and keyEvents. It has no eventName/eventCount/totalUsers report.
- `src/routes/auth.tsx` emits custom auth_completed for email signup when Supabase returns a user (even if email confirmation means there is no session) and for successful email login. Standard sign_up/login are absent from the inspected auth route.
- `src/routes/__root.tsx` emits OAuth auth_completed after SIGNED_IN using the callback URL's mode query. That mode is not reliable proof that the user is new and the handler has no explicit deduplication mechanism.
- `src/routes/onboarding.tsx` emits onboarding_completed after the completion upsert returns no error. `src/lib/auth-flow.ts` uses company_members membership as its onboarding gate.
- `src/lib/analytics.ts` emits first_value_action_completed when combined invoice/expense counts for a company equal one. It does not establish that the authenticated user personally performed the action; it remains analytics-only.
- `src/lib/referral.ts` stores a browser-local ffVisitorId and the most recent pendingReferralCode. It sends landing path, referrer and UTM values to the partner click endpoint. The inspected helper is last-touch referral capture, not a verified first-touch organic attribution chain.

No Stage E code or tests were changed. No new tests were run. The earlier 16/16 app and 104/104 SEO suite results belong to the prior code baseline and are not represented as Stage E validation.

Execution was blocked by loss of the executable Vercel workspace: previous sessions timed out; an available snapshot restore returned HTTP 400, an older snapshot was expired (HTTP 410), and fresh Vercel v3/v4 sandbox creation returned HTTP 400. The mapped CLI fallback is unavailable and the current container cannot resolve github.com. The previous stash and uncommitted generated route-tree change were not modified or discarded; no claim is made that they were restored.

No authenticated GA4 call, live registration query, activation query, acceptance/production database operation, migration, protected workflow operation, deployment, publishing, secret change, or main merge was performed. The next step is to recover a working repository execution environment without touching the preserved stash, then implement and test event-level GA4 collection and the safe auth/attribution changes described in the acceptance matrix.


## Follow-on identity, activation and scheduler audit — 2026-11-20

- Opportunity identity implementation is in `seo-engine/schedulers/search-intelligence.mjs`: SHA-256 of a canonical absolute HTTP(S) URL; fragments removed; credentials rejected; query, scheme and host variants retained. GSC normalization in `seo-engine/normalize.mjs` removes query/hash and trailing slash but intentionally retains scheme and host variants until canonical routing is verified.
- Run-scoped opportunity key tests verify stability within one run and separation across runs. This does not deduplicate equivalent opportunities across different runs.
- The acceptance upsert's unique `opportunity_key` conflict path was previously verified to update URL/query/type/score/evidence. A legacy key collision can therefore overwrite evidence. Acceptance data is fixture-only; no re-key or replay is authorized.
- The read-only activation query at `seo-engine/activation/production-aggregate-readonly.sql` is user-level (joins on user_id) and filters non-qualifying invoice statuses. It counts persisted expenses. It does not currently enforce accounting action time >= onboarding completion time, so its ordered registration → onboarding → first-value interpretation needs review and regression fixtures before being relied upon.
- Main workflow files were read only. Schedulers 1 and 2 set SEO_PERSISTENCE_REQUIRED=true and point to acceptance project bufbyfwstdqvwnkhyrea; Scheduler 3 passes acceptance project credentials but omits SEO_PERSISTENCE_REQUIRED. The available connector path could not enumerate scheduled-run history or establish current secret availability. No workflow was triggered or changed.
- No database query/write, migration, re-key/replay, or protected workflow operation occurred.
