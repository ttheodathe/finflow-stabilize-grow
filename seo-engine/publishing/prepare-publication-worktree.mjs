import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { preparePublishedArticle } from "./prepare-published-article.mjs";

const claimFile = "seo-output/publisher-claim.json";
if (!existsSync(claimFile)) throw new Error("Publisher claim file is missing.");
const envelope = JSON.parse(await readFile(claimFile, "utf8"));
if (envelope.claimed !== true || !envelope.claim) throw new Error("Publisher claim is invalid.");

const claim = envelope.claim;
const targetPath = path.normalize(claim.targetPath || "");
if (!targetPath.startsWith("content/blog/") || targetPath.includes("..")) {
  throw new Error("Publisher target path is outside content/blog.");
}
const existingArticleMarkdown = existsSync(targetPath)
  ? await readFile(targetPath, "utf8")
  : null;

const result = preparePublishedArticle({
  markdown: claim.markdown,
  approvedContentHash: claim.contentHash,
  approvedAuthor: claim.approvedAuthor,
  allowedAuthors: envelope.allowedAuthors,
  operationType: claim.operationType,
  expectedSlug: claim.slug,
  publishDate: new Date().toISOString().slice(0, 10),
  existingArticleMarkdown,
  expectedExistingContentHash: claim.targetBaseContentHash,
  minWordCount: 1200,
});

if (result.targetPath !== targetPath) {
  throw new Error("Prepared article path does not match the database-approved target path.");
}

await mkdir(path.dirname(targetPath), { recursive: true });
await writeFile(targetPath, result.markdown, "utf8");
await mkdir("seo-output", { recursive: true });
const publishedUrl = `https://www.finflowtrack.com/blog/${result.slug}`;
const report = {
  claimId: claim.claimId,
  operationId: claim.operationId,
  revisionId: claim.revisionId,
  operationType: claim.operationType,
  slug: result.slug,
  targetPath: result.targetPath,
  sourceDraftHash: result.sourceDraftHash,
  publishedContentHash: result.publishedContentHash,
  approvedAuthor: result.approvedAuthor,
  publishedAt: result.publishedAt,
  updatedAt: result.updatedAt,
  wordCount: result.wordCount,
  publishedUrl,
};
await writeFile("seo-output/publication-result.json", JSON.stringify(report, null, 2), "utf8");
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, [
    `published_url=${publishedUrl}`,
    `published_content_hash=${result.publishedContentHash}`,
    `target_path=${result.targetPath}`,
    `slug=${result.slug}`,
  ].join("\n") + "\n");
}
console.log(`Prepared approved article ${result.slug} for production build preflight (${result.wordCount} words).`);
