# Supabase migration ledger reconciliation

## Acceptance project

Project reference: `bufbyfwstdqvwnkhyrea`

The acceptance migration ledger was inspected before applying new SQL. Its existing entries end with:

- `20261119145113 seo_ops_research_revision_persistence`

The repository contains separate later files named `20261119160000_seo_ops_read_persisted_opportunities.sql` and `20261119170000_seo_ops_research_revision_persistence.sql`. The acceptance database already contained the combined effects of those changes under the single `20261119145113` ledger entry. The actual schema and function definitions were inspected and matched those intended changes.

**Do not run `supabase db push` blindly or rewrite/repair the historical ledger to make these filenames appear separately applied.** Reconcile the historical migration files and ledger deliberately before any future bulk migration operation.

## Readback migration

The additive readback functions were applied only to the acceptance project on 19 November 2026. Supabase recorded the migration as:

- `20261119154716 seo_ops_research_readback`

The repository filename uses that exact recorded version. The migration adds service-role-only, security-invoker readback RPCs for content operations, research records and content revisions. It does not change production.

## Production boundary

No production migration, schema, policy, credential or environment change is authorized by this recovery. Production project reference: `zjaamxvqjiymgfujrtjm`.

## Content revision immutability migration

The additive content-revision immutability function was applied only to the acceptance project. Supabase recorded it as:

- `20261120115501 seo_ops_content_revision_immutability`

The repository migration file now uses the same version: `20261120115501_seo_ops_content_revision_immutability.sql`. This prevents a later `supabase db push` from treating the already-applied acceptance migration as a new version. The CI fixture applies the opportunity/readback/revision SQL in dependency order; the acceptance ledger combines the effects of the two intermediate repository files under `20261119145113`.

Production migration history was inspected read-only and contains no SEO operations migrations. No SEO migration was applied to production. Do not apply these acceptance-only migrations to production without a separate schema, permission, migration-history, and rollback review.
