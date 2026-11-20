# Remaining Tasks and Acceptance Matrix

Updated: 2026-11-20 04:35 CAT. Branch: fix/seo-engine-controlled-recovery. Baseline: 6f08a56d17e8189ff03b9b8d692c67f891e1369e. Latest remotely verified code baseline before this checkpoint: 91638005b00aea59229ecc77c8426397da5636db.

Status definitions: NOT STARTED, INVESTIGATING, IMPLEMENTING, IMPLEMENTED, TESTED, VERIFIED, BLOCKED, NOT APPLICABLE. VERIFIED requires reproducible evidence.

| Stage / requirement | Status | Evidence / dependency |
|---|---|---|
| A — branch, baseline, ancestry, initial working tree | VERIFIED | Recovery branch at 91638005; baseline and repair are ancestors; entry tree clean |
| A — PR #119 provenance and main divergence | INVESTIGATING | PR closed and main merge commit 915eee2 exists despite draft/no-merge wording; historical authorization actor unknown. Run 44560803819's acceptance job was green but blocked by empty Supabase secrets and a dateRange bug; no DB write attempted |
| A — architecture/workflows/schema/module map | IMPLEMENTED | Core repo and workflow inventory inspected; full audit remains |
| A — complete threat model/unused code/ownership | NOT STARTED | Exhaustive review pending |
| B — acceptance migration ledger | VERIFIED | Seven SEO ledger entries read from acceptance project bufbyfwstdqvwnkhyrea |
| B — disputed 145113 migration provenance | VERIFIED | Stored SQL MD5 equals 170000 migration file; README documents combined 160000+170000 effects |
| B — visitor_key_hash | VERIFIED | Source migration 20261119122622 and live acceptance column both TEXT NOT NULL + UNIQUE; zero rows |
| B — UUID/FK integrity | VERIFIED | UUID PKs; opportunities→scheduler_runs; research→opportunities; revisions→content_operations |
| B — migration timestamp collisions | INVESTIGATING | Active tree duplicates 18130000 and 18140000; file histories traced to commits 703d412/aba4508 and ff9e78e/c9f91ad/5bcea750/4bfd383; historical branches also 17161000/17170000/17180000; production ledger not inspected |
| B — historical genuine opportunities/overwritten rows | BLOCKED | Current acceptance has only fixture rows; overwritten values cannot be recovered from current state |
| B — UUID-preserving re-key plan | INVESTIGATING | UUID relationships support key-only mapping in principle; complete key mapping and separate write authorization required |
| C — official GSC collector/auth/dimensions | IMPLEMENTED | Read-only Search Analytics API; domain property; six dimension reports |
| C — pagination/retry/null metric handling | TESTED | 25k page size, 250k cap, 429/5xx retry; tests pass |
| C — historical GSC artifact and score distinction | TESTED | Run 44448533423/artifact 14494691265; regression preserves 78 vs 31 |
| C — current live GSC API permissions/fresh collection | BLOCKED | PR #119 attempted fresh read-only collection but failed before API access because collect() received no dateRange; default-range fix and regression test added, but no fresh API result yet |
| C — incremental backfill/reconciliation | IMPLEMENTED | Existing collector paths; operational live validation pending |
| D — GA4 organic sessions/engagement | IMPLEMENTED | Analytics Data API property 546829553; organic channel report |
| D — registration/onboarding events | IMPLEMENTED | auth_completed(mode=signup/login), onboarding_completed |
| D — invoice/expense/first-value events | IMPLEMENTED | Client instrumentation after successful writes; first-value uses company counts |
| D — event-level signups/activations and retention | NOT STARTED | Collector does not report eventName/eventCount/totalUsers; retention not verified |
| D — reliable first-touch/landing-page attribution | INVESTIGATING | Session landing/channel data exists; cross-session user attribution not established |
| E — opportunity scoring/business intent | IMPLEMENTED | Existing scoring and intent modules/tests |
| E — collision-resistant URL identity | TESTED | SHA-256 + canonicalization; 51 URL regression; query not used as page key |
| E — fresh genuine ranking validation | BLOCKED | Requires fresh GSC evidence |
| F — source retrieval/claim verification | IMPLEMENTED | Source metadata, redirect/content-type checks, numeric claim/source tests |
| F — broad current authoritative source coverage | INVESTIGATING | Article-level coverage audit pending |
| G — AI drafting and editorial validation | IMPLEMENTED | Research pipeline, source confidence and draft validation tests |
| G — live provider quota/timeout and content quality | INVESTIGATING | Runtime provider execution not verified |
| G — human approval safeguards | IMPLEMENTED | GitHub approval checks exact PR/head/path/content hash/permission; live approval not tested |
| G — publish/update disabled | VERIFIED | Workflow flags fail closed; no publish action run |
| H — persistence adapter/UUID validation | TESTED | Mocked RPC and UUID regression tests |
| H — independent readback RPCs | IMPLEMENTED | Migration 154716 and acceptance catalog/ledger inspected |
| H — genuine acceptance write + independent readback | BLOCKED | No acceptance write/replay authorization; DB rows are fixtures |
| I — daily schedulers | IMPLEMENTED | GitHub Actions cron 00:15, 01:45, 03:15 UTC |
| I — locks/stale-run/heartbeat/alerts/full recovery | INVESTIGATING | Tests exist; full distributed runtime proof pending |
| I — 24/7 availability | BLOCKED | Daily cron is not continuous worker uptime; free-tier constraints unresolved |
| J — RLS/RPC/content approval safeguards | TESTED | CI/isolated database tests and server-only RPCs |
| J — secrets, SSRF, SQL injection, privacy, dependency review | INVESTIGATING | Existing security check passes; exhaustive audit pending |
| K — acceptance migration/re-key/replay | BLOCKED | Separate explicit write authorization required; runner now requires SEO_ACCEPTANCE_WRITE_AUTHORIZED=true and CI label acceptance-write-authorized |
| K — executable acceptance test plan | IMPLEMENTED | acceptance-run.mjs and isolated CI DB fixtures exist; blocked path now fails non-zero and preserves evidence artifact; CI job gated by explicit PR label |
| K — production deploy/publish | BLOCKED | Explicitly out of scope |
| L — product-relevant SEO topics/conversion paths | IMPLEMENTED | Accounting, invoices, expenses, multi-currency and bookkeeping topics |
| L — real organic registrations/activated customers | BLOCKED | No verified live attribution dataset |
| M — GSC/GA4 performance snapshots | IMPLEMENTED | Scheduler 3 independent source handling |
| M — activation/retention learning loop | IMPLEMENTING | Requires event-level GA4 reports and validated activation definition |
| N — $0 cost and operational readiness | INVESTIGATING | Three daily Actions schedules; Vercel quota failures demonstrate free-tier constraints |
| N — production readiness declaration | BLOCKED | Genuine ingestion, conversion proof, acceptance validation and uptime/security evidence required |

## Acceptance gates
1. No acceptance/production writes, DDL/DML, migrations, re-key, or replay without separate explicit authorization.
2. No production deployment, publishing, live content updates, secret/env changes, or merge to main.
3. Clearly label fixtures as synthetic; never present them as genuine GSC, GA4, registration, activation, or customer evidence.
4. Mocked RPC, isolated CI database tests, and daily cron schedules are not live persistence or 24/7 availability proof.
5. Update the master checkpoint after each major milestone.

## C.0.3 verification update — 2026-11-20

Recovery branch code HEAD at verification: 57c4f7f4b1d7a02977e6499ff9d6c8d92e570dbd.

| New verification | Status | Evidence |
|---|---|---|
| Collector default date range when omitted | TESTED | 2 fixture tests cover collect() and collectPartial() defaulting to resolveDateRange() |
| Acceptance write authorization gate | TESTED | 2 static contract tests verify explicit env flag, PR label, non-zero blocked result and unconditional evidence upload |
| Full SEO suite | TESTED | 104/104 passed |
| Application unit suite | TESTED | 16/16 passed |
| Security/ReDoS | TESTED | passed |
| Lint | TESTED | exit 0; 44 warnings, 0 errors |
| Build + typecheck | TESTED | build exit 0; typecheck exit 0 after generated routes are refreshed |
| Fresh live GSC collection | BLOCKED | No authenticated read-only dispatch was available; the historical PR attempt failed before API access, now fixed and covered by fixtures only |

Acceptance and production database writes remain prohibited. No new live API or persistence operation was triggered.

## Stage B read-only schema audit — verified findings

| Requirement | Status | Evidence / limitation |
|---|---|---|
| RLS on seo_ops tables | VERIFIED | All 11 tables have RLS enabled; service_role-only policies; anon/authenticated policies absent |
| RPC privilege/security posture | VERIFIED | 11 public.seo_ops_* RPCs are SECURITY INVOKER, fixed search_path pg_catalog/seo_ops, EXECUTE granted only to service_role |
| Trigger inventory | VERIFIED | No user-defined triggers on seo_ops tables |
| Unique indexes and foreign keys | VERIFIED | Full pg_indexes/pg_constraint inventory read from acceptance |
| Non-unique performance indexes | INVESTIGATING | None found on seo_ops tables; consider indexes on FK/run lookup columns after migration history is resolved |
| Opportunity upsert collision behavior | VERIFIED | seo_ops_record_opportunity overwrites URL/query/type/score/evidence on opportunity_key conflict; historic overwritten values are not recoverable from current fixture-only state |
| Opportunity score upper bound | INVESTIGATING | DB CHECK is score >= 0 only; application tests enforce <=100; DDL not authorized |
| Production migration ledger | BLOCKED | Production is out of scope; no production connection or query attempted |

These findings are read-only acceptance evidence. Do not treat them as production schema verification.


## Live reconstruction update — 2026-11-20

| Requirement | Status | Evidence / limitation |
|---|---|---|
| Remote recovery branch and HEAD | VERIFIED | Remote ref resolved to `83373b83518fb172f93c6c4c87c98d3968ec39b6`; workspace fast-forwarded from stale local HEAD `8238674` after preserving its uncommitted work in a stash |
| PR #119 merge provenance | VERIFIED | Main merge commit `915eee2fe57b890bc51779d2a3fcab038d94d998` identifies PR #119 |
| Historical acceptance write outcome | VERIFIED | Run `44560803819` logs show empty acceptance Supabase credentials and script result `BLOCKED_MISSING_ACCEPTANCE_SUPABASE_CREDENTIALS`; no write attempted despite green wrapper job |
| Fresh live GSC collection | BLOCKED | Historical run failed before API collection because dateRange was undefined; date-default fix and fixture tests pass, but no fresh authenticated API result |
| Main daily scheduler safety | INVESTIGATING | Three main workflows run at 00:15, 01:45 and 03:15 UTC and pass acceptance project/service-role configuration; do not trigger or modify |
| Migration version-alignment branches | INVESTIGATING | Several branch comparisons show rename-only migration changes with zero SQL changes; cross-branch duplicate-prefix provenance and exact merge/apply history remain unresolved |
| Current recovery duplicate migration prefixes | INVESTIGATING | 18130000 and 18140000 files exist on recovery; cross-branch collision mapping not yet fully reconstructed |
| GA4 event-level conversion collection | NOT STARTED | Existing app events exist, but GA4 collector only collects session/landing-page metrics and keyEvents; no eventName report |
| Email sign_up / login standard events | NOT STARTED | Current auth route records custom auth_completed; standard GA4 recommended events not yet present |
| First-value analytics proxy | IMPLEMENTED | Invoice/expense routes call trackAccountingAction; helper uses company-level counts and is not authoritative user activation |
| Database-verified activation | BLOCKED | Read-only SQL exists; no authorized production aggregate connection and no live verification |
| Local test/build baseline | TESTED | 16/16 app unit, 104/104 SEO/scheduler, security check, lint exit 0, build exit 0, typecheck exit 0 |
| Local uncommitted route tree | INVESTIGATING | Generated routeTree.gen.ts remained staged in persistent sandbox snapshot; no commit/push; pre-resume stash preserved |
| Acceptance/production writes | BLOCKED | Explicitly prohibited by current mission; no write, migration, re-key, replay or deployment performed |

### Operational caution
The main-branch daily schedulers contain acceptance-project service-role configuration. Their dry-run flags are not sufficient evidence that persistence is disabled. Do not dispatch, modify or disable these workflows under this mission. Their current run history and secret availability require separate owner-controlled review.


## Stage E execution checkpoint — 2026-11-20

**Repository ref:** `fix/seo-engine-controlled-recovery`  
**Verified branch HEAD:** `018bc9f708c33a9d3a2536806e891ea50e622a44`  
**Code baseline:** `83373b83518fb172f93c6c4c87c98d3968ec39b6`  
**Comparison:** recovery branch is exactly two commits ahead of the code baseline; both commits are documentation-only. No application or SEO-engine source changes are present in those two commits.

| Stage E investigation | Status | Evidence / limitation |
|---|---|---|
| GA4 collector source | VERIFIED | `seo-engine/collect.mjs` requests date, landingPagePlusQueryString, sessionDefaultChannelGroup with sessions, activeUsers, engagedSessions, keyEvents. No eventName/eventCount/totalUsers report exists in this collector. |
| Existing GA4 reliability behavior | VERIFIED | Shared request helper retries HTTP 429 and 5xx with exponential delay; report pagination uses 100,000 rows and a 500,000-row guard. These safeguards do not supply event-level reporting or per-report compatibility checks. |
| Email registration and login | VERIFIED | `src/routes/auth.tsx` calls Supabase signUp/signInWithPassword; emits custom auth_completed after a returned user or successful login. It does not emit standard sign_up/login events. Signup may return a user before email confirmation/session creation. |
| OAuth registration/login distinction | BLOCKED | `src/routes/__root.tsx` handles OAuth SIGNED_IN and infers mode from the callback URL query (default login). A URL mode is not authoritative proof of a new user; no safe deduplicated new-user signal has been established. |
| Onboarding completion | VERIFIED | `src/routes/onboarding.tsx` emits onboarding_completed only when the onboarding_progress completion upsert reports no error. `src/lib/auth-flow.ts` uses company_members membership as the authoritative onboarding gate. This is stronger application evidence than the event, but was not live queried in this execution. |
| First-value instrumentation | VERIFIED | `src/lib/analytics.ts` emits invoice_created/expense_created and first_value_action_completed based on combined company-level invoice + expense counts equalling one. The helper has no user identifier and cannot establish user-level activation. |
| First-touch attribution | INVESTIGATING | `src/lib/referral.ts` creates a browser-local ffVisitorId and stores only the most recent pendingReferralCode (last-touch); click capture sends landing path, referrer and UTM fields to the partner click endpoint. A first-touch acquisition chain and verified anonymous-to-authenticated link are not established by this helper. |
| Event-level GA4 implementation | BLOCKED | No source edits were made because the executable workspace could not be recovered or created. |
| Registration-to-activation test coverage | BLOCKED | No new tests were run or added in this execution. The previous code baseline test results remain historical evidence only and do not validate a new Stage E implementation. |
| Authenticated GA4 API verification | BLOCKED | No authenticated GA4 Data API request was made. No live event counts or event-level permissions are claimed. |
| Database-verified registration/activation | BLOCKED | No production or acceptance database query/write was performed in this execution. No registration or activation cohort was independently verified. |

### Execution environment and preservation

- Read-only Vercel project lookup resolved project `prj_SqYEsp2gNmKwu0FHAkM5XPdw8xru` and team `team_Drv3ZaHKhpxixqmHpDqWn1St`.
- The prior `fc02repair` sessions were stopped by timeout. The latest session snapshot was listed as available, but a fresh sandbox restore attempt returned HTTP 400. An earlier snapshot restore returned HTTP 410 (expired/deleted). Fresh v3/v4 sandbox creation from a Git source also returned HTTP 400.
- The mapped Vercel CLI fallback is unavailable in the current container; `git ls-remote` also failed because the container cannot resolve github.com. No alternate executable workspace was available.
- The earlier generated `src/routeTree.gen.ts` change and stash were not edited or discarded by this execution. The original sandbox could not be resumed; their recoverability must be confirmed before any workspace cleanup.
- No application source, test, migration, workflow, secret, or production artifact was modified.

### Required Stage E design before implementation

1. Add a distinct GA4 event report using compatible dimensions `date,eventName` and metrics `eventCount,totalUsers`; keep session/landing-page reports separate unless the GA4 Data API compatibility endpoint confirms a combined shape.
2. Preserve source status, errors, freshness, date range and timezone for each report independently; never translate failed/missing metrics to valid zeroes.
3. Emit standard `sign_up` only from a reliable successful-registration signal; emit `login` only for successful existing-user authentication. OAuth must not infer new registration from a user-controlled query parameter. Deduplicate callbacks without adding a new persistent identity system.
4. Keep GA4 observations separate from authoritative registration/onboarding/accounting records. The existing company-level first-value event must not be used as verified user activation.
5. Preserve first-touch attribution separately from referral last-touch; missing source remains unknown, not organic. Do not send personal or financial information to GA4.

Acceptance/production writes, migrations, re-key/replay, protected workflow changes, publishing, deployment, secret changes and merges to main remain prohibited and were not performed.


## Follow-on read-only audit — 2026-11-20

| Area | Finding | Status / next action |
|---|---|---|
| Opportunity page identity | `seo-engine/schedulers/search-intelligence.mjs` hashes a canonical absolute HTTP(S) URL with SHA-256. It rejects embedded credentials and strips fragments, but preserves query strings, scheme and host variants. GSC collection separately calls `normalizePageUrl`, which strips query/hash and trailing slash but deliberately preserves scheme and host variants until redirect/canonical behavior is verified. | VERIFIED implementation behavior. Keep scheme/host variants distinct until production canonical routing evidence supports safe consolidation. Test identity on direct inputs and normalized GSC inputs. |
| Opportunity idempotency | `buildOpportunityKey(runId, sourceId, date)` is tested as stable within the same run and distinct across runs. | TESTED in repository fixture tests; this is run-scoped idempotency, not cross-run deduplication. |
| Legacy opportunity collision | Acceptance schema has a unique `opportunity_key`; prior read-only audit found the upsert updates URL/query/type/score/evidence on key conflict. If two logically different opportunities produce the same legacy key, later evidence can overwrite earlier values. Current acceptance contains fixture rows only; overwritten historical values cannot be reconstructed from current state. | INVESTIGATING/BLOCKED. Preserve UUID foreign keys; do not re-key or replay. A complete legacy key-to-URL/query mapping and separately authorized write plan are prerequisites. |
| Activation definition | `seo-engine/activation/production-aggregate-readonly.sql` joins profiles, onboarding_progress and invoice/expense rows by user_id. It excludes void/cancelled/reversed/deleted invoice statuses and counts persisted expenses. This is user-level, unlike the client first-value helper's company-level count. | VERIFIED query shape. No live execution occurred. |
| Activation sequence semantics | The read-only SQL requires onboarding completion and qualifying accounting activity after registration, but does not require the accounting action timestamp to be at or after onboarding completion. Thus it does not strictly prove the ordered registration → onboarding → first-value sequence. | INVESTIGATING. Add a fixture regression and review the definition before changing the read-only query; no live query/write is authorized. |
| Scheduler workflow configuration | Main workflows schedule Scheduler 1 at 00:15 UTC, Scheduler 2 at 01:45 UTC, Scheduler 3 at 03:15 UTC. Schedulers 1 and 2 set SEO_PERSISTENCE_REQUIRED=true and pass acceptance project/service-role environment; Scheduler 3 passes Supabase credentials and the acceptance project ref but does not set SEO_PERSISTENCE_REQUIRED. | VERIFIED configuration only. No workflow was triggered or modified. Current scheduled-run history and current secret availability were not exposed by the available read-only connector path. |
| Live scheduler history | Available GitHub workflow-run lookup is limited to PR-triggered runs for a commit; no authorized list-of-scheduled-runs operation was available in this session. | BLOCKED by connector capability. Do not infer scheduler success or failure. |

No migration or database operation was performed. These follow-on findings do not change the Stage E implementation status: no event-level GA4 code or new tests were committed.
