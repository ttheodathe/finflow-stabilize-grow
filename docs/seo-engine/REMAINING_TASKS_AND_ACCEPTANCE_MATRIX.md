# Remaining Tasks and Acceptance Matrix

Updated: 2026-11-20 04:35 CAT. Branch: fix/seo-engine-controlled-recovery. Baseline: 6f08a56d17e8189ff03b9b8d692c67f891e1369e. Latest remotely verified code baseline before this checkpoint: 91638005b00aea59229ecc77c8426397da5636db.

Status definitions: NOT STARTED, INVESTIGATING, IMPLEMENTING, IMPLEMENTED, TESTED, VERIFIED, BLOCKED, NOT APPLICABLE. VERIFIED requires reproducible evidence.

| Stage / requirement | Status | Evidence / dependency |
|---|---|---|
| A — branch, baseline, ancestry, initial working tree | VERIFIED | Recovery branch at 91638005; baseline and repair are ancestors; entry tree clean |
| A — PR #119 provenance and main divergence | INVESTIGATING | PR closed and main merge commit 915eee2 exists despite draft/no-merge wording; historical authorization actor unknown |
| A — architecture/workflows/schema/module map | IMPLEMENTED | Core repo and workflow inventory inspected; full audit remains |
| A — complete threat model/unused code/ownership | NOT STARTED | Exhaustive review pending |
| B — acceptance migration ledger | VERIFIED | Seven SEO ledger entries read from acceptance project bufbyfwstdqvwnkhyrea |
| B — disputed 145113 migration provenance | VERIFIED | Stored SQL MD5 equals 170000 migration file; README documents combined 160000+170000 effects |
| B — visitor_key_hash | VERIFIED | Live column TEXT NOT NULL + UNIQUE; zero rows |
| B — UUID/FK integrity | VERIFIED | UUID PKs; opportunities→scheduler_runs; research→opportunities; revisions→content_operations |
| B — migration timestamp collisions | INVESTIGATING | Active tree duplicates 18130000 and 18140000; historical branches also 17161000/17170000/17180000 |
| B — historical genuine opportunities/overwritten rows | BLOCKED | Current acceptance has only fixture rows; overwritten values cannot be recovered from current state |
| B — UUID-preserving re-key plan | INVESTIGATING | UUID relationships support key-only mapping in principle; complete key mapping and separate write authorization required |
| C — official GSC collector/auth/dimensions | IMPLEMENTED | Read-only Search Analytics API; domain property; six dimension reports |
| C — pagination/retry/null metric handling | TESTED | 25k page size, 250k cap, 429/5xx retry; tests pass |
| C — historical GSC artifact and score distinction | TESTED | Run 44448533423/artifact 14494691265; regression preserves 78 vs 31 |
| C — current live GSC API permissions/fresh collection | BLOCKED | No authenticated dispatch run performed in this checkpoint |
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
| K — acceptance migration/re-key/replay | BLOCKED | Separate explicit write authorization required |
| K — executable acceptance test plan | IMPLEMENTED | acceptance-run.mjs and isolated CI DB fixtures exist; final gated commands to review |
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
