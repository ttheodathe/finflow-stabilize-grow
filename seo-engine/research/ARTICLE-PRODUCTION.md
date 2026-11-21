# Stage C — Article Production Engine

## Draft pipeline

Stage C builds a research-backed editorial brief, invokes an explicitly configured article
generator, validates its Markdown and stores each draft outside the public blog. The normal
pipeline is opt-in: no provider is called unless ARTICLE_GENERATOR_ENABLED=true and a
compatible endpoint and model are configured.

The provider adapter uses an OpenAI-compatible chat-completions contract and is wired into
Scheduler 2. It does not select a paid provider, create credentials, or enable generation by
default. Scheduler 2 reads the repository variable ARTICLE_GENERATOR_ENABLED (default false),
ARTICLE_GENERATOR_ENDPOINT and ARTICLE_GENERATOR_MODEL, plus the server-only secret
ARTICLE_GENERATOR_API_KEY. A local endpoint is only reachable when the runner can reach that
host; a GitHub-hosted runner cannot reach a developer's personal localhost.

## Originality screening

Generated drafts are compared with the repository's existing article inventory using normalized
five-word shingles, Jaccard overlap and containment. A high-overlap result blocks the draft.
This is an internal-inventory text screen, not an external plagiarism database or a semantic
originality guarantee. Every passing draft still requires human originality, attribution and
quotation review.

Generated drafts must preserve the brief's exact title, description and slug, cite every supplied
verified evidence source with its supplied URL, and avoid unverified external source links. Missing
citations or metadata drift blocks the package before it can enter the reviewer queue. These checks
are deterministic link/metadata checks; they do not prove that each cited source semantically
supports every sentence. Human fact-checking remains mandatory.

## Public-article duplicate guard

The topic/cannibalization check uses the same publication boundary as the public blog:
articles with frontmatter `draft: true` are excluded; committed Markdown articles without that
flag are treated as publicly live. Unpublished drafts therefore cannot be mistaken for an
existing public landing page.

When a query matches an existing public article, the pipeline proposes an
`UPDATE_EXISTING_PUBLIC_ARTICLE` action, retains the existing slug/canonical URL, and records
constructive update guidance: refresh intent-aligned metadata, add genuinely missing reader
answers, replace stale claims with current primary-source evidence, preserve accurate sections
and useful links, and only update the published date after substantive work. Exact GSC landing
page matches take precedence; inferred topical overlaps remain human-review decisions.

This is a repository inventory check, not a crawl of every URL on the live domain. Because the
public blog is built from `content/blog/*.md`, the committed source inventory is the primary
index. Human review remains required before any update can be approved or published.

## Authenticated editorial approval

The seo-editorial-approval Supabase Edge Function verifies the caller's bearer token with
Supabase Auth, then submits the verified Auth user ID to a service-role-only transactional RPC.
The RPC checks the reviewer allowlist, operation, exact revision ID and SHA-256 content hash,
then appends a durable decision. The reviewer allowlist is intentionally empty until an
administrator explicitly adds approved reviewer Auth user IDs to
seo_ops.editorial_reviewers in the isolated acceptance project.

The in-memory hash helper is not an authentication mechanism. The authenticated Edge
Function and database RPC are the only intended approval path. Approval means editorial
approval of a draft only; it does not enable deployment or publication.

## Durable revision handling

A stable operation key is used for the same opportunity and reporting period. The revision
advancement RPC serializes updates, enforces sequential revision numbers, supersedes the prior
PROPOSED revision, stores the exact Markdown and hash, and updates the operation's current hash
atomically. Approved operations cannot be silently rewritten. Independent readback still checks
the operation, source records and complete revision before the draft is marked ready for review.

## Article performance attribution

Scheduler 3 now groups actual GSC page rows and GA4 organic landing-page rows by /blog/<slug>.
It persists per-article, per-source, date-range snapshots. The report distinguishes
PAGE_LEVEL_DIRECT URL measurements from aggregate scheduler totals.

Revision attribution remains UNKNOWN unless a verified deployment-to-revision mapping exists.
Page-level clicks, sessions or key events are not proof that a particular content revision
caused a change, and they do not establish that an article caused a user registration or
activation. No user-level tracking or personal visitor data is added by this stage.

## Security and rollout

- Draft files and publication packages are written under content/operations/article-production/, never content/blog/.
- Publication package always records publishEnabled=false and productionWriteAllowed=false.
- No production content writes, publishing or deployment are enabled.
- The approval migration and Edge Function are repository artifacts only until separately reviewed and installed in the isolated acceptance project.
- No production database migration, reviewer allowlist entry, Edge Function deployment, or generator secret has been configured by this change.
- Keep SEO_PERSISTENCE_REQUIRED=true, SEO_OPS_ALLOWED_PROJECT_REF=bufbyfwstdqvwnkhyrea, DRY_RUN=true, PUBLISH_ENABLED=false, CONTENT_UPDATE_ENABLED=false, and PRODUCTION_CONTENT_WRITE_ALLOWED=false.

## Remaining gates before operational activation

1. Apply and validate the new migration in the isolated acceptance project only.
2. Add one explicitly designated reviewer Auth UUID to the acceptance allowlist.
3. Deploy and test the approval Edge Function in acceptance; verify unauthorized users, stale hashes, duplicate decisions and exact-revision binding are rejected.
4. Select and test a provider endpoint/model. Do not set a paid API key or enable generation without explicit budget approval.
5. Run Scheduler 3 against genuine page-level GSC and GA4 data and independently read back article snapshots.
6. Keep the feature in draft-only mode until the acceptance checks pass.
