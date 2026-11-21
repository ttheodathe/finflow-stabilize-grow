import { createHash } from "node:crypto";
import matter from "gray-matter";

const BLOG_CATEGORIES = new Set([
  "accounting-basics",
  "small-business-finance",
  "invoicing-payments",
  "expense-management",
  "inventory-management",
  "accounting-software",
  "entrepreneurship",
]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function wordCount(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function requireDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Publication date must use YYYY-MM-DD.");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Publication date is not a valid calendar date.");
  }
  return value;
}

/**
 * Convert one exact, approved operations revision into public-blog frontmatter.
 * This function does not write files, call GitHub, or publish anything.
 */
export function preparePublishedArticle({
  markdown,
  approvedContentHash,
  approvedAuthor,
  allowedAuthors,
  operationType,
  expectedSlug,
  publishDate,
  existingArticleMarkdown = null,
  expectedExistingContentHash = null,
  minWordCount = 1200,
} = {}) {
  if (typeof markdown !== "string" || !markdown.trim()) throw new Error("Approved Markdown is required.");
  const exactMarkdown = markdown;
  if (!HASH_PATTERN.test(approvedContentHash || "") || sha256(exactMarkdown) !== approvedContentHash) {
    throw new Error("Approved content hash does not match the exact stored Markdown.");
  }

  const author = requireText(approvedAuthor, "Approved author");
  if (!Array.isArray(allowedAuthors) || !allowedAuthors.includes(author)) {
    throw new Error("Approved author is not in the active author allowlist.");
  }

  const slug = requireText(expectedSlug, "Expected slug");
  if (!SLUG_PATTERN.test(slug)) throw new Error("Expected slug is invalid.");
  const date = requireDate(publishDate);
  if (!["NEW_ARTICLE", "EXISTING_ARTICLE_UPDATE"].includes(operationType)) {
    throw new Error("Unsupported publication operation type.");
  }

  const parsed = matter(exactMarkdown);
  const metadata = { ...parsed.data };
  const body = (parsed.content || "").trim();
  if (metadata.slug !== slug) throw new Error("Draft slug does not match the approved target slug.");
  if (metadata.status !== "draft" || metadata.publicationStatus !== "draft" || metadata.draft !== true) {
    throw new Error("Only an explicitly draft-marked article can enter publication preparation.");
  }
  if (typeof metadata.title !== "string" || !metadata.title.trim()) throw new Error("Article title is missing.");
  if (typeof metadata.description !== "string" || !metadata.description.trim()) throw new Error("Article description is missing.");
  if (!BLOG_CATEGORIES.has(metadata.category)) throw new Error("Article category is not in the public blog category catalog.");
  if (!Array.isArray(metadata.tags) || metadata.tags.some(tag => typeof tag !== "string" || !tag.trim())) {
    throw new Error("Article tags must be an array of non-empty strings.");
  }
  if (metadata.author && metadata.author !== author) {
    throw new Error("Draft author conflicts with the explicitly approved byline.");
  }

  const words = wordCount(body);
  if (words < minWordCount) throw new Error(`Article is below the publication word-count threshold (${words}/${minWordCount}).`);
  const headings = body.match(/^##\s+.+$/gm) || [];
  if (headings.length < 3) throw new Error("Article requires at least three H2 sections before publication.");

  let publishedAt;
  let updatedAt = date;
  let canonicalUrl = metadata.canonicalUrl || `https://www.finflowtrack.com/blog/${slug}`;

  if (operationType === "NEW_ARTICLE") {
    if (existingArticleMarkdown !== null) {
      throw new Error("A new article cannot overwrite an existing public article slug.");
    }
    if (metadata.author || metadata.publishedAt) {
      throw new Error("New article author and publication date must be assigned only at the approved publish step.");
    }
    publishedAt = date;
  } else {
    if (typeof existingArticleMarkdown !== "string" || !existingArticleMarkdown.trim()) {
      throw new Error("Existing-article updates require the current public article Markdown.");
    }
    if (!HASH_PATTERN.test(expectedExistingContentHash || "") ||
        sha256(existingArticleMarkdown) !== expectedExistingContentHash) {
      throw new Error("The live article changed after the update draft was prepared; regenerate and re-review it.");
    }
    const existing = matter(existingArticleMarkdown);
    if (existing.data.slug !== slug) throw new Error("Existing public article slug does not match the update target.");
    if (existing.data.author !== author) throw new Error("Updates must retain the existing article's approved author.");
    if (!existing.data.publishedAt) throw new Error("Existing public article has no publication date to preserve.");
    publishedAt = requireDate(existing.data.publishedAt);
    if (metadata.publishedAt !== publishedAt) {
      throw new Error("Update draft must preserve the existing publication date.");
    }
    const existingCanonical = existing.data.canonicalUrl || `https://www.finflowtrack.com/blog/${slug}`;
    if (canonicalUrl !== existingCanonical) {
      throw new Error("Update draft must preserve the existing canonical URL.");
    }
    canonicalUrl = existingCanonical;
  }

  const publishedMetadata = {
    ...metadata,
    author,
    publishedAt,
    updatedAt,
    canonicalUrl,
    draft: false,
  };
  delete publishedMetadata.status;
  delete publishedMetadata.publicationStatus;

  const publishedMarkdown = matter.stringify(body, publishedMetadata).trim() + "\n";
  return {
    slug,
    targetPath: `content/blog/${slug}.md`,
    sourceDraftHash: approvedContentHash,
    publishedContentHash: sha256(publishedMarkdown),
    wordCount: words,
    publishedAt,
    updatedAt,
    approvedAuthor: author,
    markdown: publishedMarkdown,
  };
}
