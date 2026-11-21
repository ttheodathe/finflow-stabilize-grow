import matter from "gray-matter";

const DEFAULT_THRESHOLD = 0.32;
const MIN_COMPARABLE_WORDS = 30;

function normalizeBody(markdown) {
  const body = matter(markdown || "").content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\`*_>#~|]/g, " ")
    .toLowerCase();
  return body.normalize("NFKC").replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim();
}
function shingles(text, size = 5) {
  const words = text.split(" ").filter(Boolean);
  const output = new Set();
  for (let i = 0; i <= words.length - size; i += 1) output.add(words.slice(i, i + size).join(" "));
  return output;
}
function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}
function containment(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / Math.min(left.size, right.size);
}

/** Internal-inventory overlap screen; not an external plagiarism or semantic originality proof. */
export function verifyArticleOriginality({ markdown, inventory = [], targetSlug = null, threshold = DEFAULT_THRESHOLD } = {}) {
  if (typeof markdown !== "string" || !markdown.trim()) throw new Error("Article Markdown is required for originality screening.");
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) throw new Error("Originality threshold must be greater than 0 and at most 1.");
  const candidateText = normalizeBody(markdown);
  const candidateWords = candidateText.split(" ").filter(Boolean);
  if (candidateWords.length < MIN_COMPARABLE_WORDS) {
    return { status: "BLOCKED_INSUFFICIENT_TEXT", method: "WORD_5GRAM_JACCARD_AND_CONTAINMENT", threshold, comparableWordCount: candidateWords.length, comparisons: [], highestSimilarity: null, limitations: ["Textual screening cannot prove originality or detect paraphrased copying."] };
  }
  const candidateShingles = shingles(candidateText);
  const comparisons = inventory.filter(item => item && item.slug !== targetSlug && typeof item.content === "string").map(item => {
    const existingText = normalizeBody(item.content);
    const existingWords = existingText.split(" ").filter(Boolean);
    if (existingWords.length < MIN_COMPARABLE_WORDS) return null;
    const existingShingles = shingles(existingText);
    const jaccardScore = jaccard(candidateShingles, existingShingles);
    const containmentScore = containment(candidateShingles, existingShingles);
    return { slug: item.slug, title: item.title || item.slug, jaccard: Number(jaccardScore.toFixed(4)), containment: Number(containmentScore.toFixed(4)), score: Number(Math.max(jaccardScore, containmentScore * 0.75).toFixed(4)), comparableWordCount: existingWords.length };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  const highestSimilarity = comparisons[0] || null;
  return {
    status: highestSimilarity && highestSimilarity.score >= threshold ? "BLOCKED_HIGH_TEXTUAL_OVERLAP" : "SCREEN_PASSED_HUMAN_ORIGINALITY_REVIEW_REQUIRED",
    method: "WORD_5GRAM_JACCARD_AND_CONTAINMENT", threshold, comparableWordCount: candidateWords.length,
    comparedArticleCount: comparisons.length, highestSimilarity, comparisons: comparisons.slice(0, 10),
    limitations: ["Internal inventory only; no external plagiarism database.", "Low overlap does not prove originality; paraphrasing and unindexed sources may not be detected.", "Human review of attribution, quotations, originality and usefulness remains mandatory."],
  };
}
export { DEFAULT_THRESHOLD as DEFAULT_ORIGINALITY_THRESHOLD };
