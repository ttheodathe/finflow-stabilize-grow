# Stage C — Article Production Engine

## Scope

Stage C adds an editorial production boundary after the existing evidence-backed research
pipeline. It turns a researched opportunity into a structured editorial brief, accepts a
pluggable article generator, validates the resulting Markdown, and saves a revision-hashed
draft plus publication package.

## Workflow

1. Accept a research result with a target query, intent, audience, evidence records, and
   internal-link inventory.
2. Build an editorial brief containing reader questions, article angle, outline, jurisdiction
   scope, source evidence, and conversion objective.
3. Require an explicitly injected `generateArticle` provider. No provider is configured by
   default; the engine does not silently fabricate a long-form article or make paid API calls.
4. Block drafting if any required source is unavailable or irrelevant.
5. Validate draft metadata, source register, claim mappings, internal links, heading structure,
   and minimum word count.
6. Save the Markdown and publication package under
   `content/operations/article-production/<slug>/<hash-prefix>/`, never under `content/blog`.
7. Record the SHA-256 content hash. Human approval records are bound to that exact hash; any
   content edit invalidates the approval.

## Security and publication controls

- No direct writes to `content/blog`.
- No production content writes or publishing.
- Publication package always records `publishEnabled: false` and
  `productionWriteAllowed: false`.
- Semantic fact-checking, originality review, jurisdiction review, and final editorial sign-off
  remain human responsibilities.
- The approval helper verifies a supplied human approval record against exact content bytes;
  it is not an identity provider or a substitute for authenticated reviewer permissions.
- A generation provider is injected by the caller. This stage does not add API keys, paid model
  dependencies, or automatic external requests.

## Current limits

- The deterministic checks cannot prove that a generated article is original, useful,
  comprehensive, or factually correct.
- Evidence retrieval and GSC topic selection remain owned by the existing research pipeline.
- A later stage must connect authenticated approval events and performance attribution to
  persisted content operations before production publication can be considered.
