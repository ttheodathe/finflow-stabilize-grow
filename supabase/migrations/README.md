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
