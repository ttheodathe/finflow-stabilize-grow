# FinFlow Track vs QuickBooks — Comparison Page

Files to drop into `ttheodathe/finflow-stabilize-grow`, preserving the folder structure below.

## Files in this package

```
src/routes/compare.finflow-track-vs-quickbooks.tsx   ← NEW file — the page itself
src/routes/sitemap[.]xml.ts                           ← MODIFIED — adds the new URL to /sitemap.xml
src/routeTree.gen.ts                                  ← REGENERATED — router's auto-generated route tree
sitemap.diff                                           ← the exact 1-line diff for sitemap[.]xml.ts, for review
```

## How to apply

1. Copy `src/routes/compare.finflow-track-vs-quickbooks.tsx` into your repo at the same path.
2. Replace your repo's `src/routes/sitemap[.]xml.ts` with the one here (or apply `sitemap.diff` — it's a single added line).
3. **`src/routeTree.gen.ts` is auto-generated** by the TanStack Router Vite plugin. You do *not* need to manually copy the one in this package — just run `npm run dev` or `npm run build` in your repo after adding the route file, and it will regenerate correctly. The copy included here is provided only as a reference/fallback in case your local codegen environment behaves differently.
4. Run `npm run build` (or `bun run build`) to confirm everything compiles.
5. Deploy as usual — the page will be live at `/compare/finflow-track-vs-quickbooks` and automatically included in `/sitemap.xml`.

## What was verified before packaging

- `npx tsc --noEmit` — 0 errors
- `npx eslint` on both changed files — 0 errors
- `npm run build` — passes, generates dedicated client/server chunks for the new route
- All internal links (`/`, `/pricing`, `/security`, `/privacy`, `/help`, `/integrations`, `/signup`, and 5 `/blog/$slug` links) point to routes/content that actually exist in the repo
- No new lint issues introduced repo-wide (confirmed against unmodified `main` via `git stash`)

## Still worth a human look before publishing

- QuickBooks pricing is deliberately **not** quoted in dollar amounts on the page — third-party sources disagreed significantly on 2026 QuickBooks pricing. The page links to Intuit's official pricing page instead. Confirm current tier names/prices at publish time if you want to add specific figures.
- FinFlow Track's own marketing copy elsewhere (`index.tsx`, `features.tsx`) mentions "Cash Flow reports" and "Tax reports" as report types, but the actual Reports page in the codebase currently only ships Profit & Loss and Balance Sheet tabs. This new comparison page describes reporting at the more conservative, implementation-verified level — worth reconciling site-wide at some point, but out of scope for this page.
