# Archived legacy migrations

These SQL files are retained for historical reference and must not be applied through the active Supabase migration directory.

- The Paddle subscription reconciliation migration is obsolete; the production billing integration uses Polar and has its own applied migrations.
- The earlier partner payout integrity migration is superseded by the later Stage A6 payout atomicity/currency safeguards and the Stage A7 failed-payout commission-release migration.

Do not move these files back into `supabase/migrations` without reviewing them against the current production schema and migration ledger.
