import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { assertProductionWritesBlocked } from "../content-ops/safety.mjs";
import { createSupabaseSeoStoreFromEnv } from "../persistence/supabase-store.mjs";

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
  const unmatchedTargets = [];
  const queueByTarget = new Map();
  for (const item of input.opportunities.filter((candidate) => candidate.decision === "REVIEW_REQUIRED")) {
    let slug;
    try {
      const pathname = new URL(item.targetUrl).pathname;
      slug = pathname.split("/").filter(Boolean).pop();
    } catch {
      unmatchedTargets.push({ targetUrl: item.targetUrl || null, reason: "INVALID_TARGET_URL" });
      continue;
    }
    if (!slug || !inventory.includes(slug)) {
      unmatchedTargets.push({ targetUrl: item.targetUrl, reason: "TARGET_NOT_FOUND_IN_BLOG_MARKDOWN_INVENTORY" });
      continue;
    }
    if (queueByTarget.has(item.targetUrl)) continue;
    const operationId = `review-${createHash("sha256").update(item.targetUrl).digest("hex").slice(0, 24)}`;
    queueByTarget.set(item.targetUrl, {
      id: operationId,
      type: "EXISTING_ARTICLE_UPDATE",
      slug,
      targetPath: `content/blog/${slug}.md`,
      targetUrl: item.targetUrl,
      status: "DISCOVERED",
      sourceEvidence: item.evidence,
      proposedAction: "RESEARCH_AND_PREPARE_TARGETED_REVISION",
      validation: { passed: false, status: "RESEARCH_REQUIRED" },
      approval: { status: "NOT_REQUESTED" },
      execution: { status: "BLOCKED_BY_DRY_RUN" },
      note: "No revision was generated: human-verifiable research and exact article-content review are required before drafting.",
    });
  }
  const queue = [...queueByTarget.values()];
  const store = createSupabaseSeoStoreFromEnv(process.env);
  let persistence = { status: "NOT_CONFIGURED", schedulerRunId: null };
  let persistenceError = null;
  if (!store && process.env.SEO_PERSISTENCE_REQUIRED === "true") {
    persistenceError = new Error("Supabase SEO persistence is required but its server-side credentials are not configured.");
    persistence = { status: "FAILED", schedulerRunId: null, error: persistenceError.message };
  } else if (store) {
    const scheduledFor = new Date().toISOString().slice(0, 10);
    const attempt = Math.max(1, Number.parseInt(process.env.GITHUB_RUN_ATTEMPT || "1", 10) || 1);
    let schedulerRunId = null;
    try {
      schedulerRunId = await store.recordRun({
        schedulerKey: "CONTENT_OPERATIONS", scheduledFor, attempt,
        status: "RUNNING", upstreamRunId: input.persistence?.schedulerRunId || null,
        output: { inputOpportunityCount: input.opportunities.length },
      });
      for (const item of queue) {
        await store.recordContentOperation({
          operationKey: item.id,
          operationType: item.type,
          targetPath: item.targetPath,
          slug: item.slug,
          status: "PROPOSED",
          payload: item,
        });
      }
      await store.recordRun({
        schedulerKey: "CONTENT_OPERATIONS", scheduledFor, attempt,
        status: "SUCCEEDED", upstreamRunId: input.persistence?.schedulerRunId || null,
        output: { queueCount: queue.length, unmatchedTargetCount: unmatchedTargets.length, mode: "DRY_RUN" },
      });
      persistence = { status: "PERSISTED", schedulerRunId };
    } catch (error) {
      persistenceError = error;
      persistence = { status: "FAILED", schedulerRunId, error: String(error.message || error) };
      if (schedulerRunId) {
        try {
          await store.recordRun({
            schedulerKey: "CONTENT_OPERATIONS", scheduledFor, attempt,
            status: "FAILED", upstreamRunId: input.persistence?.schedulerRunId || null,
            output: { queueCount: queue.length }, errorSummary: String(error.message || error),
          });
        } catch { /* Preserve the original persistence error. */ }
      }
    }
  }

  const report = {
    schemaVersion: 1, scheduler: "CONTENT_OPERATIONS",
    generatedAt: new Date().toISOString(), mode: "DRY_RUN",
    contentInventory: { markdownArticleCount: inventory.length, slugs: inventory },
    queue, queueCount: queue.length,
    unmatchedTargets, unmatchedTargetCount: unmatchedTargets.length,
    productionMutation: "BLOCKED",
    persistence,
  };
  await mkdir(OUTPUT, { recursive: true });
  const path = `${OUTPUT}/scheduler-2-content-queue.json`;
  await writeFile(path, JSON.stringify(report, null, 2) + "\n", { flag: "w" });
  if (persistenceError) throw persistenceError;
  return { path, queueCount: queue.length, mode: report.mode, persistenceStatus: persistence.status };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try { process.stdout.write(JSON.stringify(await runContentOperations({ inputPath: process.argv[2] }), null, 2) + "\n"); }
  catch (error) { console.error(`Scheduler 2 failed: ${error.message}`); process.exitCode = 1; }
}
