# SEO Content Operations (Stage 6)

This directory is the repository-native record for SEO research and editorial operations. Git is the source of truth; production articles remain in `content/blog/`.

## Safety defaults

- Stage 6 starts in **dry-run only**.
- No content in this directory is published by the application.
- No scheduled workflow, CMS, database, external AI provider, or publishing credential is introduced here.
- Opportunity reports and research records are advisory. They never authorize publication.
- Existing Markdown articles remain unchanged unless a separately approved editorial change is made.
- Do not include customer data, financial transactions, credentials, tokens, or private account data.

## Layout

- `policies/`: editorial policy, scoring and validation rules.
- `opportunities/`: reviewed opportunity snapshots.
- `research/`: source registers and evidence notes.
- `refresh/`: proposed refresh plans and diffs.
- `reports/`: dry-run outputs and performance summaries.

The initial Stage 6.1–6.2 implementation adds the policy contract and deterministic opportunity scoring/validation. It does not fetch Google data or publish content. Feed it a manually prepared, privacy-safe JSON export or an existing local SEO snapshot.

## Dry-run command

```sh
node seo-engine/content-ops/score-opportunities.mjs --dry-run --input path/to/opportunities.json
```

The command writes a JSON report to stdout. Add `--out path/to/report.json` to save a local report. It never writes to `content/blog/`, calls external services, or changes production state.

Input shape and scoring rules are documented in `policies/stage-6-policy.json`.
