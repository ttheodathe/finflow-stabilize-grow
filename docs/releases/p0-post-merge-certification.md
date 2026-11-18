# FinFlow Track P0 Post-Merge Certification

## Baseline

- Main at inspection: `bd3f2ffdf47dd29af070b7c42671c7c6f9cf91df`
- PR #110: merged into `main` on 2026-11-18.
- Original PR #110 scope: eight public-facing TSX files.
- Remediation branch: `fix/p0-post-merge-certification`
- Remediation PR: #111 (draft; not merged).

## Remediation

- `SiteHeader.tsx`: desktop and mobile navigation now share the three valid routes (Features, Pricing, Guides); obsolete `hash` reads and the non-existent Careers check were removed. Mobile menu control now exposes `aria-expanded`, `aria-controls`, and state-specific labels.
- The eight P0 files were formatted with the repository's Prettier configuration (print width 100, semicolons, double quotes, trailing commas).
- `guides.tsx`: Open Graph title and description now describe the actual getting-started guide.
- The hidden Guides sections remain hidden: their current entries contain placeholder `href="#"` links and non-functional download affordances. Exposing them would present dead links as usable content.
- Pricing continues to read Free, Professional, and Business monthly prices from `src/lib/paddle/config.ts` (USD $0, $19, and $49); Enterprise remains custom. The dollar symbol is consistent with the shared `formatPlanPrice` helper. No billing logic or plan entitlements were changed.
- Header, footer, authentication, and onboarding continue to use the official `/logo.png` asset.

## Dependency audit

The 2026-11-18 CI audit reports 21 high, zero critical, zero moderate, and zero low findings. These are 21 affected package entries from one underlying advisory: `picomatch` 4.0.7, GHSA-fc5q-39xc-vjpf / CVE-2026-112366 (ReDoS). The advisory identifies versions through 4.0.7 as affected and does not list an official fixed release.

The 21 affected lockfile entries are:

| Class | Packages (installed versions) |
| --- | --- |
| Direct production | `@tanstack/react-start` 1.169.3; `@tanstack/router-plugin` 1.168.47 |
| Transitive production graph | `@tanstack/react-start-rsc` 0.1.64; `@tanstack/router-generator` 1.167.45; `@tanstack/router-utils` 1.162.4; `@tanstack/start-plugin-core` 1.171.54; `fdir` 6.5.0; `picomatch` 4.0.7; `tinyglobby` 0.2.17; `unplugin` 3.3.0 |
| Development-only | `@lovable.dev/vite-tanstack-config` 2.12.0; `@tanstack/devtools-bundler-core` 0.1.1; `@tanstack/devtools-vite` 0.8.3; `@typescript-eslint/eslint-plugin` 8.73.0; `@typescript-eslint/parser` 8.73.0; `@typescript-eslint/type-utils` 8.73.0; `@typescript-eslint/typescript-estree` 8.73.0; `@typescript-eslint/utils` 8.73.0; `nitro` 3.0.260603-beta; `typescript-eslint` 8.73.0; `vite` 8.3.8 |
| Unused / optional | None identified from the lockfile audit paths. |

The affected dependency paths converge on `picomatch`; the package audit's `via` chains are metavulnerability propagation, not separate advisories for each package. The repository already applies a narrow `picomatch` 4.0.7 mitigation in `postinstall` and tests it with `npm run test:security`. CI has passed both installation and this regression check. The audit count remains visible and is not represented as cleared.

No dependency upgrades or overrides are proposed at this stage. npm's suggested package changes include downgrades of framework/build packages and do not establish a compatible upstream fixed `picomatch` version. Keep the existing targeted mitigation, monitor the upstream advisory, and update only after a published fix and compatibility verification.

## Release evidence and remaining blockers

- Production deployment observed as READY on the exact merged `main` SHA above; this is not evidence that the remediation branch has been deployed.
- CI checks for the final remediation commit: pending.
- Authenticated registration, verification, Google sign-in, login/logout, business setup, invoice/payment/expense, receivables, entitlements, and dashboard regression: not run. No isolated Supabase Auth/browser environment and synthetic test credentials were available; production was not accessed.
- Desktop/mobile visual verification and screenshots: not run. Source inspection is not a substitute for viewport-based browser testing.
- Local working-tree cleanliness: not verifiable through the remote GitHub connector.
- No production deployment, database migration, schema/RLS/auth/billing/accounting logic change, or merge was performed.

**Release decision: NOT CERTIFIED.** Keep PR #111 in draft until the final CI checks pass and the isolated authenticated and responsive browser tests have been completed with synthetic data.
