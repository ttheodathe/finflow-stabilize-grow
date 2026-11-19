# Three-scheduler SEO operations

All schedule expressions are UTC. Kigali uses UTC+2.

| Scheduler | UTC | Kigali | Responsibility |
|---|---:|---:|---|
| 1 — Search intelligence | 00:15 | 02:15 | GSC/GA4 collection, evidence-based page opportunities, selected technical checks |
| 2 — Content operations | 01:45 | 03:45 | Requires today's successful Scheduler 1 run; creates a dry-run editorial queue |
| 3 — Performance and learning | 03:15 | 05:15 | Independently collects and reports available organic data |

The three daily workflows are the only daily SEO schedulers. The existing seo-data-collection.yml remains manual-dispatch only. The general CI workflow is not a scheduler.

## Safety contract

The production contract is fail-closed:

- DRY_RUN=true
- PUBLISH_ENABLED=false
- CONTENT_UPDATE_ENABLED=false
- PRODUCTION_CONTENT_WRITE_ALLOWED=false

Missing flags resolve to the safe values. Invalid values and contradictory combinations throw errors. Scheduler 2 asserts this contract before processing its queue.

The GitHub content adapter supports create, update, immutable pre-update snapshots, idempotent retries, public URL verification, and rollback. It requires explicit human approval data and the appropriate execution flags. Staging execution requires an explicit non-main branch and must be tested against a staging/preview URL. Production execution requires all four flags to be explicitly authorized in a separate release.

## Current boundaries

- Scheduler 1 stores aggregate source snapshots and a ranked advisory queue as private workflow artifacts.
- Scheduler 2 currently creates review candidates; it deliberately does not invent a draft when source research is missing.
- Scheduler 3 reports unavailable sources as null, not as zero. Product-database activation and content attribution are not yet connected.
- Workflow artifacts expire after 30 days. Durable operation history and Supabase persistence remain follow-up implementation work.
- No live production article is created, updated, deleted, or deployed by these workflows.
