import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import matter from "gray-matter";
import test from "node:test";
import { preparePublishedArticle } from "./prepare-published-article.mjs";

const AUTHOR = "FinFlowTrack Editorial Team";
const SLUG = "small-business-cash-flow-planning";
const ALLOWED_AUTHORS = [AUTHOR];
const publishDate = "2026-11-21";
const body = [
  "## Understand the cash position",
  Array.from({ length: 55 }, () => "A business should compare expected receipts, planned payments, timing assumptions and supporting records before making operational decisions.").join(" "),
  "## Prepare a useful forecast",
  Array.from({ length: 55 }, () => "Record each assumption clearly, compare expected and actual movements, and explain material differences with reliable source documents.").join(" "),
  "## Review and improve the process",
  Array.from({ length: 55 }, () => "Review the process regularly, update outdated assumptions, preserve records and ask a qualified professional about jurisdiction-specific obligations.").join(" "),
  "## Related reading",
  "[Small Business Accounting Guide](/blog/small-business-accounting-guide)",
  "[Official source](https://www.sba.gov/business-guide/manage-your-business/manage-your-finances)",
].join("\n\n");

function draftMarkdown({ author, publishedAt, canonicalUrl = `https://www.finflowtrack.com/blog/${SLUG}`, category = "small-business-finance" } = {}) {
  const metadata = {
    title: "Small Business Cash Flow Planning",
    description: "A practical guide to planning and reviewing small-business cash flow.",
    slug: SLUG,
    category,
    tags: ["small business", "cash flow"],
    draft: true,
    status: "draft",
    publicationStatus: "draft",
    ...(author ? { author } : {}),
    ...(publishedAt ? { publishedAt } : {}),
    ...(canonicalUrl ? { canonicalUrl } : {}),
  };
  return matter.stringify(body, metadata).trim() + "\n";
}
function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

test("new approved draft becomes a valid public-blog article with explicit author and date", () => {
  const markdown = draftMarkdown();
  const result = preparePublishedArticle({
    markdown,
    approvedContentHash: hash(markdown),
    approvedAuthor: AUTHOR,
    allowedAuthors: ALLOWED_AUTHORS,
    operationType: "NEW_ARTICLE",
    expectedSlug: SLUG,
    publishDate,
    minWordCount: 1200,
  });
  const published = matter(result.markdown);
  assert.equal(result.targetPath, `content/blog/${SLUG}.md`);
  assert.equal(result.sourceDraftHash, hash(markdown));
  assert.equal(result.publishedContentHash, hash(result.markdown));
  assert.equal(published.data.author, AUTHOR);
  assert.equal(published.data.publishedAt, publishDate);
  assert.equal(published.data.updatedAt, publishDate);
  assert.equal(published.data.draft, false);
  assert.equal(published.data.status, undefined);
  assert.equal(published.data.publicationStatus, undefined);
  assert.equal(published.data.category, "small-business-finance");
  assert.deepEqual(published.data.tags, ["small business", "cash flow"]);
});

test("publication preparation rejects a content hash that differs from the approved revision", () => {
  const markdown = draftMarkdown();
  assert.throws(() => preparePublishedArticle({
    markdown,
    approvedContentHash: "a".repeat(64),
    approvedAuthor: AUTHOR,
    allowedAuthors: ALLOWED_AUTHORS,
    operationType: "NEW_ARTICLE",
    expectedSlug: SLUG,
    publishDate,
    minWordCount: 1200,
  }), /hash does not match/);
});

test("publication preparation rejects an author outside the active allowlist", () => {
  const markdown = draftMarkdown();
  assert.throws(() => preparePublishedArticle({
    markdown,
    approvedContentHash: hash(markdown),
    approvedAuthor: "Unapproved Author",
    allowedAuthors: ALLOWED_AUTHORS,
    operationType: "NEW_ARTICLE",
    expectedSlug: SLUG,
    publishDate,
    minWordCount: 1200,
  }), /active author allowlist/);
});

test("new article preparation refuses to overwrite a live slug", () => {
  const markdown = draftMarkdown();
  assert.throws(() => preparePublishedArticle({
    markdown,
    approvedContentHash: hash(markdown),
    approvedAuthor: AUTHOR,
    allowedAuthors: ALLOWED_AUTHORS,
    operationType: "NEW_ARTICLE",
    expectedSlug: SLUG,
    publishDate,
    existingArticleMarkdown: "# Existing public article",
    minWordCount: 1200,
  }), /cannot overwrite an existing public article slug/);
});

test("existing article update preserves original publication date and canonical URL", () => {
  const existing = matter.stringify("# Existing article body", {
    title: "Small Business Cash Flow Planning",
    description: "Existing description.",
    slug: SLUG,
    author: AUTHOR,
    publishedAt: "2026-08-19",
    category: "small-business-finance",
    tags: ["small business"],
    draft: false,
    canonicalUrl: `https://www.finflowtrack.com/blog/${SLUG}`,
  });
  const markdown = draftMarkdown({ author: AUTHOR, publishedAt: "2026-08-19" });
  const result = preparePublishedArticle({
    markdown,
    approvedContentHash: hash(markdown),
    approvedAuthor: AUTHOR,
    allowedAuthors: ALLOWED_AUTHORS,
    operationType: "EXISTING_ARTICLE_UPDATE",
    expectedSlug: SLUG,
    publishDate,
    existingArticleMarkdown: existing,
    expectedExistingContentHash: hash(existing),
    minWordCount: 1200,
  });
  const published = matter(result.markdown);
  assert.equal(published.data.publishedAt, "2026-08-19");
  assert.equal(published.data.updatedAt, publishDate);
  assert.equal(published.data.canonicalUrl, `https://www.finflowtrack.com/blog/${SLUG}`);
  assert.equal(published.data.draft, false);
});

test("existing article update is blocked if the public base article changed after drafting", () => {
  const existing = matter.stringify("# Existing article body", {
    title: "Small Business Cash Flow Planning",
    description: "Existing description.",
    slug: SLUG,
    author: AUTHOR,
    publishedAt: "2026-08-19",
    category: "small-business-finance",
    tags: ["small business"],
    draft: false,
  });
  const markdown = draftMarkdown({ author: AUTHOR, publishedAt: "2026-08-19" });
  assert.throws(() => preparePublishedArticle({
    markdown,
    approvedContentHash: hash(markdown),
    approvedAuthor: AUTHOR,
    allowedAuthors: ALLOWED_AUTHORS,
    operationType: "EXISTING_ARTICLE_UPDATE",
    expectedSlug: SLUG,
    publishDate,
    existingArticleMarkdown: existing + "\nA later edit was made.",
    expectedExistingContentHash: hash(existing),
    minWordCount: 1200,
  }), /changed after the update draft was prepared/);
});

test("publication preparation rejects an invalid blog category", () => {
  const markdown = draftMarkdown({ category: "not-a-real-category" });
  assert.throws(() => preparePublishedArticle({
    markdown,
    approvedContentHash: hash(markdown),
    approvedAuthor: AUTHOR,
    allowedAuthors: ALLOWED_AUTHORS,
    operationType: "NEW_ARTICLE",
    expectedSlug: SLUG,
    publishDate,
    minWordCount: 1200,
  }), /category is not in the public blog category catalog/);
});

test("publication preparation rejects short articles and malformed publication dates", () => {
  const shortMarkdown = matter.stringify("## One\n\nShort.\n\n## Two\n\nShort.\n\n## Three\n\nShort.", {
    title: "Small Business Cash Flow Planning",
    description: "A practical guide.",
    slug: SLUG,
    category: "small-business-finance",
    tags: ["small business"],
    draft: true,
    status: "draft",
    publicationStatus: "draft",
  });
  assert.throws(() => preparePublishedArticle({
    markdown: shortMarkdown,
    approvedContentHash: hash(shortMarkdown),
    approvedAuthor: AUTHOR,
    allowedAuthors: ALLOWED_AUTHORS,
    operationType: "NEW_ARTICLE",
    expectedSlug: SLUG,
    publishDate,
    minWordCount: 1200,
  }), /below the publication word-count threshold/);

  const valid = draftMarkdown();
  assert.throws(() => preparePublishedArticle({
    markdown: valid,
    approvedContentHash: hash(valid),
    approvedAuthor: AUTHOR,
    allowedAuthors: ALLOWED_AUTHORS,
    operationType: "NEW_ARTICLE",
    expectedSlug: SLUG,
    publishDate: "2026-02-31",
    minWordCount: 1200,
  }), /valid calendar date/);
});
