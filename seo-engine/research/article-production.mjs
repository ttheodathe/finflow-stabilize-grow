import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { validateDraft } from "../content-ops/validate-draft.mjs";
import { verifyArticleOriginality } from "./originality.mjs";

const DEFAULT_MIN_WORDS = 1200;
const HASH_RE = /^[a-f0-9]{64}$/;

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function wordCount(markdown) {
  return (markdown.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || []).length;
}
function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

export function createEditorialBrief(research) {
  if (!research || typeof research !== "object") throw new Error("A completed research result is required.");
  const candidate = research.candidate || {};
  const draft = research.draft || {};
  const title = requireText(draft.title || research.title, "Article title");
  const targetQuery = requireText(candidate.targetQuery || research.targetQuery, "Target query");
  const sourceRecords = Array.isArray(research.sourceRecords) ? research.sourceRecords : [];
  const verifiedSources = sourceRecords.filter(source =>
    source.status === "RETRIEVED_RELEVANT" &&
    source.verificationStatus === "KEYWORD_RELEVANCE_PASS_HUMAN_REVIEW_REQUIRED"
  );
  const internalLinks = Array.isArray(research.internalLinks) ? research.internalLinks : [];
  const relatedQueries = Array.isArray(candidate.relatedQueries) ? candidate.relatedQueries : [];
  const intent = requireText(research.intent, "Search intent");
  const audience = requireText(research.audience || research.sourcePackContext?.audience || "Small-business owners, freelancers and finance operators", "Target audience");
  return {
    schemaVersion: 1,
    briefType: "EDITORIAL_ARTICLE_BRIEF",
    title,
    targetQuery,
    relatedQueries,
    searchIntent: intent,
    audience,
    articleAngle: research.articleAngle || research.sourcePackContext?.angle || `Answer the searcher's ${intent.toLowerCase()} need with practical steps, clear scope and source-backed explanations.`,
    readerQuestions: Array.isArray(research.readerQuestions) && research.readerQuestions.length
      ? research.readerQuestions
      : [`What does ${targetQuery} mean in practice?`, "What steps should a reader take?", "What common mistakes or limitations should they understand?"],
    outline: Array.isArray(research.outline) && research.outline.length
      ? research.outline
      : (Array.isArray(draft.content?.match(/^## .+$/gm)) ? draft.content.match(/^## .+$/gm).map(line => line.replace(/^## /, "")) : []),
    internalLinks: internalLinks.map(link => ({ slug: link.slug, title: link.title })),
    existingArticleUpdatePlan: research.existingArticleUpdatePlan || null,
    evidence: verifiedSources.map(source => ({
      url: source.url,
      finalUrl: source.finalUrl || source.url,
      title: source.sourceTitle || source.publisher || source.url,
      publisher: source.publisher || null,
      publishedAt: source.publishedAt || null,
      retrievedAt: source.retrievedAt || null,
      jurisdiction: source.jurisdiction || null,
      supportedClaims: source.supportedClaims || [],
      limitations: source.limitations || [],
    })),
    evidenceGaps: sourceRecords.filter(source => source.status !== "RETRIEVED_RELEVANT").map(source => ({
      url: source.url, status: source.status, error: source.error || null,
    })),
    productRelevance: research.productEvidence ? "FIRST_PARTY_CAPABILITY_EVIDENCE_AVAILABLE" : "NO_PRODUCT_MENTION_REQUIRED",
    conversionObjective: research.conversionObjective || "Help the reader complete the task; mention FinFlow Track only where a verified capability genuinely fits.",
    jurisdictionScope: research.jurisdiction || research.sourcePackContext?.jurisdiction || "Do not generalize jurisdiction-specific guidance.",
    publicationPolicy: "Draft only. Human review and hash-bound approval are mandatory. No production writes or publishing.",
  };
}

export function createHumanApproval({ content, reviewerId, approvedAt, decision = "APPROVED" }) {
  requireText(content, "Exact article content");
  requireText(reviewerId, "Human reviewer identifier");
  requireText(approvedAt, "Approval timestamp");
  if (Number.isNaN(Date.parse(approvedAt))) throw new Error("Approval timestamp must be a valid date.");
  if (decision !== "APPROVED") throw new Error("Only an explicit APPROVED decision can create an approval record.");
  return Object.freeze({
    schemaVersion: 1,
    decision,
    reviewerId: reviewerId.trim(),
    approvedAt,
    contentHash: sha256(content),
    scope: "EXACT_CONTENT_REVISION_ONLY",
  });
}

export function verifyHumanApproval({ content, approval }) {
  if (!approval || approval.schemaVersion !== 1 || approval.decision !== "APPROVED") return false;
  if (!HASH_RE.test(approval.contentHash || "")) return false;
  return approval.scope === "EXACT_CONTENT_REVISION_ONLY" &&
    typeof approval.reviewerId === "string" && Boolean(approval.reviewerId.trim()) &&
    !Number.isNaN(Date.parse(approval.approvedAt)) &&
    sha256(content) === approval.contentHash;
}

/**
 * Runs the Stage C editorial workflow against an already researched opportunity.
 * The generator is injected deliberately: no paid model, network call, or implicit
 * fallback is enabled. Generated files are stored outside content/blog.
 */
export async function runArticleProduction({
  research,
  generateArticle,
  outputDir = "content/operations/article-production",
  now = new Date(),
  minWordCount = DEFAULT_MIN_WORDS,
} = {}) {
  const brief = createEditorialBrief(research);
  if (typeof generateArticle !== "function") {
    return {
      status: "BLOCKED_GENERATOR_NOT_CONFIGURED",
      brief,
      explanation: "No article-generation provider is configured. No article was fabricated or published.",
    };
  }
  if (!Number.isInteger(minWordCount) || minWordCount < 1) throw new Error("minWordCount must be a positive integer.");
  if (brief.evidence.length === 0 || brief.evidenceGaps.length > 0) {
    return { status: "BLOCKED_EVIDENCE_INCOMPLETE", brief, explanation: "Every required research source must be retrieved and relevant before drafting." };
  }
  const generated = await generateArticle({ brief, research, generatedAt: now.toISOString() });
  if (!generated || typeof generated.markdown !== "string" || !generated.markdown.trim()) {
    throw new Error("Article generator must return non-empty Markdown in a markdown property.");
  }
  const parsed = matter(generated.markdown);
  const content = generated.markdown.trim() + "\n";
  const metadata = parsed.data || {};
  const expected = research.draft || {};
  const draft = {
    title: metadata.title,
    description: metadata.description,
    slug: metadata.slug,
    status: metadata.status,
    publicationStatus: metadata.publicationStatus,
    canonicalUrl: expected.canonicalUrl,
    author: null,
    authorStatus: "NOT_ASSIGNED",
    editorialReviewed: false,
    internalLinks: brief.internalLinks,
    evidence: brief.evidence.map(item => ({
      sourceUrl: item.url,
      sourceType: "official_or_verified_source",
      verifiedAt: (item.retrievedAt || now.toISOString()).slice(0, 10),
      supports: item.supportedClaims.join("; ") || item.title,
    })),
    claims: Array.isArray(expected.claims) ? expected.claims : [],
  };
  const validation = validateDraft(draft, {
    existingSlugs: research.existingSlugs || [],
    operationType: expected.operationType || "NEW_ARTICLE",
    targetSlug: expected.slug || null,
  });
  const words = wordCount(parsed.content || "");
  const originality = verifyArticleOriginality({
    markdown: content,
    inventory: Array.isArray(research.existingInventory) ? research.existingInventory : [],
    targetSlug: expected.slug || null,
  });
  const headings = (parsed.content || "").match(/^#{2,3}\s+.+$/gm) || [];
  const linkTargets = [...(parsed.content || "").matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(match => match[1]);
  const internalLinkFailures = brief.internalLinks.filter(link =>
    !linkTargets.some(target => target.includes(link.slug))
  );
  const targetSlugMatches = metadata.slug === expected.slug;
  const draftStatusValid = metadata.status === "draft" && metadata.publicationStatus === "draft";
  const quality = {
    targetSlugMatches,
    draftStatusValid,
    wordCount: words,
    minimumWordCount: minWordCount,
    wordCountPass: words >= minWordCount,
    headingCount: headings.length,
    internalLinkFailures,
    metadataValid: validation.errors.every(error => !error.startsWith("MISSING_METADATA") && error !== "INVALID_SLUG"),
    deterministicValidation: validation,
    semanticAccuracy: "HUMAN_REVIEW_REQUIRED",
    originality,
  };
  const blockers = [
    ...validation.errors,
    ...(!targetSlugMatches ? ["ARTICLE_TARGET_SLUG_MISMATCH"] : []),
    ...(!draftStatusValid ? ["ARTICLE_NOT_MARKED_AS_DRAFT"] : []),
    ...(words < minWordCount ? ["ARTICLE_BELOW_MINIMUM_WORD_COUNT"] : []),
    ...(headings.length < 3 ? ["INSUFFICIENT_ARTICLE_STRUCTURE"] : []),
    ...(internalLinkFailures.length ? ["REQUIRED_INTERNAL_LINKS_MISSING"] : []),
    ...(originality.status !== "SCREEN_PASSED_HUMAN_ORIGINALITY_REVIEW_REQUIRED" ? ["ARTICLE_ORIGINALITY_SCREEN_BLOCKED"] : []),
  ];
  const contentHash = sha256(content);
  const safeSlug = typeof metadata.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.slug)
    ? metadata.slug : "invalid-draft";
  const packageDir = path.join(outputDir, safeSlug, contentHash.slice(0, 12));
  await mkdir(packageDir, { recursive: true });
  await writeFile(path.join(packageDir, "article.md"), content, { flag: "wx" }).catch(async error => {
    if (error.code !== "EEXIST") throw error;
  });
  const packageRecord = {
    schemaVersion: 1,
    status: blockers.length ? "BLOCKED_QUALITY_REVIEW" : "READY_FOR_HUMAN_REVIEW",
    generatedAt: now.toISOString(),
    contentHash,
    brief,
    quality,
    blockers: [...new Set(blockers)],
    approval: null,
    publication: { status: "DISABLED", productionWriteAllowed: false, publishEnabled: false },
    articlePath: path.join(packageDir, "article.md"),
    articleMarkdown: content,
  };
  await writeFile(path.join(packageDir, "publication-package.json"), JSON.stringify(packageRecord, null, 2) + "\n", { flag: "wx" }).catch(async error => {
    if (error.code !== "EEXIST") throw error;
  });
  return packageRecord;
}

export { DEFAULT_MIN_WORDS };
