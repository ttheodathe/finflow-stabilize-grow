# Stage 6 deterministic quality gates

These checks run before a draft can be considered for human editorial review. A passing result is **not** permission to publish.

## Hard-blocking checks

- Required metadata exists; slug is lowercase kebab-case; date is valid.
- Every source register entry has an HTTP(S) URL, source type, verification date, and a concise statement of what it supports.
- Every registered claim references a source URL in the same evidence register.
- Product claims use the explicit capability allowlist in `stage-6-policy.json`; unverified features are blocked.
- Confirmed cannibalization is blocked by opportunity scoring until the existing URL and intent conflict are resolved.

## Human review still required

- Source authority, currentness, and whether it actually supports the wording.
- Search intent, originality, usefulness, and whether the article adds material value.
- Quotes, statistics, legal/tax/financial wording, and jurisdiction-specific claims.
- Author identity and credentials, image rights and alt text, internal links, canonical URL, structured data, rendering, and accessibility.
- Final editorial sign-off.

The validator cannot reliably detect fabricated facts or verify the semantic truth of prose. It deliberately labels a passing draft `REVIEW_REQUIRED`, never `APPROVED_BY_POLICY`.

## State machine boundary

The initial implementation may score `DISCOVERED` opportunities and validate draft records in dry-run mode. It does not transition an item to `APPROVED_BY_POLICY`, `PUBLISHED`, or `VERIFIED`. No publish command or scheduled workflow is enabled.
