import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { assertProductionWritesBlocked } from "../content-ops/safety.mjs";

const OUTPUT = process.env.SEO_OUTPUT_DIR || "seo-output";
const CONTENT_DIR = "content/blog";

export async function runContentOperations({ inputPath = `${OUTPUT}/scheduler-1-opportunities.json` } = {}) {
  assertProductionWritesBlocked();
  const input = JSON.parse(await readFile(inputPath, "utf8"));
  if (input.scheduler !== "SEARCH_INTELLIGENCE" || !Array.isArray(input.opportunities)) {
    throw new Error("Scheduler 2 requires a valid Scheduler 1 opportunity report.");
  }
  const files = await readdir(CONTENT_DIR);
  const inventory = files.filter((file) => file.endsWith(".md")).map((file) => file.replace(/\.md$/, ""));
  const queue = input.opportunities.filter((item) => item.decision === "REVIEW_REQUIRED").slice(0, 10).map((item) => ({
    id: `review-${Buffer.from(item.targetUrl).toString("base64url").slice(0, 24)}`,
    type: "EXISTING_ARTICLE_UPDATE",
    targetUrl: item.targetUrl,
    status: "DISCOVERED",
    sourceEvidence: item.evidence,
    proposedAction: "RESEARCH_AND_PREPARE_TARGETED_REVISION",
    validation: { passed: false, status: "RESEARCH_REQUIRED" },
    approval: { status: "NOT_REQUESTED" },
    execution: { status: "BLOCKED_BY_DRY_RUN" },
    note: "No revision was generated: human-verifiable research and exact article-content review are required before drafting.",
  }));
  const report = {
    schemaVersion: 1, scheduler: "CONTENT_OPERATIONS",
    generatedAt: new Date().toISOString(), mode: "DRY_RUN",
    contentInventory: { markdownArticleCount: inventory.length, slugs: inventory },
    queue, queueCount: queue.length,
    productionMutation: "BLOCKED",
  };
  await mkdir(OUTPUT, { recursive: true });
  const path = `${OUTPUT}/scheduler-2-content-queue.json`;
  await writeFile(path, JSON.stringify(report, null, 2) + "\n", { flag: "w" });
  return { path, queueCount: queue.length, mode: report.mode };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try { process.stdout.write(JSON.stringify(await runContentOperations({ inputPath: process.argv[2] }), null, 2) + "\n"); }
  catch (error) { console.error(`Scheduler 2 failed: ${error.message}`); process.exitCode = 1; }
}
