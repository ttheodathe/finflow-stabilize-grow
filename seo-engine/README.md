# FinFlow Track SEO data pipeline

This directory contains a read-only data collector for Google Search Console and Google Analytics 4. It does not access Supabase, alter application data, publish content, submit IndexNow URLs, or change Vercel.

## Runtime

- Node.js 22 (already used by the repository CI workflow).
- No additional npm dependencies.
- Google service-account credentials are supplied at runtime through the `GOOGLE_SERVICE_ACCOUNT_JSON` environment variable.

## Required Google permissions

1. Enable the Google Search Console API and Google Analytics Data API in the Google Cloud project that owns the service account.
2. Add the service-account email as a user of the Search Console property `sc-domain:finflowtrack.com`, with read-only/full permission sufficient for Search Analytics queries.
3. Grant the service-account email Viewer access to GA4 property `546829553`.
4. Store the complete service-account JSON as a GitHub Actions secret named `GOOGLE_SERVICE_ACCOUNT_JSON`. Never commit it, paste it into an issue, or place it in a repository file.
5. The workflow also accepts optional repository variables `GSC_SITE_URL` and `GA4_PROPERTY_ID`; defaults target the audited FinFlow Track properties.

The collector requests only the `webmasters.readonly` and `analytics.readonly` OAuth scopes. GSC page totals, query totals, and page-query combinations are collected separately because query reports can omit anonymized searches; page totals must not be inferred by summing query rows.

## Local tests

```sh
node --test seo-engine/normalize.test.mjs
```

## Manual collection

```sh
node seo-engine/collect.mjs --start-date 2026-10-20 --end-date 2026-11-16
```

The collector defaults to a conservative completed reporting window ending three days before the current UTC date. Explicit date ranges are recommended for repeatable comparisons. URL normalization removes query strings and fragments but deliberately preserves scheme and host variants (including www/non-www) until redirect and canonical behavior is verified.

Output is written to `seo-output/` and must be retained as a private workflow artifact, not committed to the public repository.

## Workflow

The initial GitHub Actions workflow is manual-dispatch only. It must not be scheduled until credentials have been added securely and a successful read-only run has been reviewed. It uploads the generated aggregate snapshot as a workflow artifact with 30-day retention.

## Limitations

- Search Console may omit anonymized queries and may return incomplete data for some dimension combinations.
- GA4 data is aggregate reporting data, not a user-level event export.
- The collector does not infer search volume, ranking guarantees, conversions, or revenue.
- No production application credentials or database connections are used.
