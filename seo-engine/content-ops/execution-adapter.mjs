import { createHash } from "node:crypto";
import { assertExecutionAllowed, readExecutionPolicy } from "./safety.mjs";

const API = "https://api.github.com";
const encoder = new TextEncoder();

function b64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}
function decode64(value) {
  return Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8");
}
function operationPath(id) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,100}$/.test(id)) throw new Error("Invalid operation ID.");
  return `.seo-operations/operations/${id}.json`;
}
function snapshotPath(id) {
  return `.seo-operations/snapshots/${id}.json`;
}
function safeSlug(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Invalid article slug.");
  return slug;
}
function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function contentApprovalHash({ operationType, targetPath, content, metadata = {} }) {
  return digest(JSON.stringify({ operationType, targetPath, content, metadata }));
}

function validateApproval(operation, targetPath, content) {
  const approval = operation.approval;
  const expected = contentApprovalHash({
    operationType: operation.type,
    targetPath,
    content,
    metadata: operation.metadata || {},
  });
  if (!approval || approval.status !== "APPROVED" || !approval.approvedBy || !approval.approvedAt) {
    throw new Error("An explicit human approval record is required.");
  }
  if (approval.contentHash !== expected || approval.targetPath !== targetPath) {
    throw new Error("Approval is invalid because the content or target changed after approval.");
  }
  return expected;
}

export function createGitHubContentAdapter({ token, owner, repo, fetchImpl = fetch, env = process.env, publicBaseUrl = "https://www.finflowtrack.com" }) {
  if (!token || !owner || !repo) throw new Error("GitHub content adapter requires token, owner, and repository.");
  const policy = readExecutionPolicy(env);
  const branch = policy.targetBranch;

  async function request(path, options = {}) {
    const response = await fetchImpl(`${API}/repos/${owner}/${repo}/contents/${path}`, {
      ...options,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...options.headers,
      },
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`GitHub content API failed (HTTP ${response.status}): ${detail.slice(0, 300)}`);
    }
    return response.json();
  }

  async function readFile(path) {
    const result = await request(`${path}?ref=${encodeURIComponent(branch)}`);
    if (!result) return null;
    if (result.type !== "file" || !result.content) throw new Error("Target path is not a readable file.");
    return { sha: result.sha, content: decode64(result.content) };
  }

  async function writeFile(path, content, message, sha) {
    const body = { message, content: b64(content), branch, ...(sha ? { sha } : {}) };
    return request(path, { method: "PUT", body: JSON.stringify(body) });
  }

  async function verifyPublic(url, expectedTitle, expectedText, { fetchPublic = fetchImpl, attempts = 5 } = {}) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const response = await fetchPublic(url, { redirect: "follow" });
      if (response.ok) {
        const html = await response.text();
        const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]
          || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1]
          || null;
        const titleMatches = expectedTitle ? html.includes(expectedTitle) : true;
        const contentMatches = expectedText ? html.includes(expectedText.slice(0, 80)) : true;
        return {
          verified: Boolean(titleMatches && contentMatches && canonical === url),
          status: response.status,
          canonical,
          titleMatches,
          contentMatches,
          checkedAt: new Date().toISOString(),
        };
      }
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
    return { verified: false, status: null, canonical: null, checkedAt: new Date().toISOString() };
  }

  async function execute(operation) {
    if (!operation || !["NEW_ARTICLE", "EXISTING_ARTICLE_UPDATE"].includes(operation.type)) {
      throw new Error("Unsupported content operation type.");
    }
    const isNew = operation.type === "NEW_ARTICLE";
    const slug = safeSlug(operation.slug);
    const targetPath = operation.targetPath || `content/blog/${slug}.md`;
    if (targetPath !== `content/blog/${slug}.md`) throw new Error("Article target path must match the validated slug.");
    const content = operation.markdown;
    if (typeof content !== "string" || !content.trim()) throw new Error("Approved Markdown content is required.");
    assertExecutionAllowed(operation.type, policy);
    const approvalHash = validateApproval(operation, targetPath, content);

    const ledgerPath = operationPath(operation.id);
    const prior = await readFile(ledgerPath);
    if (prior) {
      const record = JSON.parse(prior.content);
      if (record.approvalHash !== approvalHash || record.targetPath !== targetPath) {
        throw new Error("Idempotency conflict: operation ID was previously used for different content.");
      }
      if (record.status === "LIVE_VERIFIED") return { ...record, idempotentReplay: true };
    }

    const current = await readFile(targetPath);
    if (isNew && current) throw new Error("Duplicate slug: article already exists.");
    if (!isNew && !current) throw new Error("Update target does not exist.");
    if (!isNew && operation.expectedBlobSha && current.sha !== operation.expectedBlobSha) {
      throw new Error("Concurrent modification detected: current article SHA differs from the reviewed baseline.");
    }

    if (!isNew) {
      const snapshot = {
        operationId: operation.id,
        targetPath,
        originalSha: current.sha,
        originalContent: current.content,
        originalMetadata: operation.originalMetadata || {},
        capturedAt: new Date().toISOString(),
      };
      const saved = await writeFile(snapshotPath(operation.id), JSON.stringify(snapshot, null, 2), `SEO snapshot ${operation.id}`);
      if (!saved?.content?.sha) throw new Error("Pre-update snapshot could not be persisted.");
    }

    const written = await writeFile(targetPath, content, `SEO ${isNew ? "publish" : "update"}: ${slug}`, current?.sha);
    if (!written?.content?.sha) throw new Error("GitHub did not confirm the article content write.");
    const url = `${publicBaseUrl}/blog/${slug}`;
    const verification = await verifyPublic(url, operation.metadata?.title, operation.verificationText || "");
    const record = {
      operationId: operation.id,
      type: operation.type,
      targetPath,
      url,
      approvalHash,
      contentBlobSha: written.content.sha,
      commitSha: written.commit?.sha || null,
      status: verification.verified ? "LIVE_VERIFIED" : "WRITE_SUCCEEDED_VERIFICATION_PENDING",
      verification,
      executedAt: new Date().toISOString(),
    };
    const ledger = await writeFile(ledgerPath, JSON.stringify(record, null, 2), `Record SEO operation ${operation.id}`);
    if (!ledger?.content?.sha) throw new Error("Operation audit record could not be persisted.");
    return record;
  }

  async function rollback(operationId) {
    assertExecutionAllowed("EXISTING_ARTICLE_UPDATE", policy);
    const raw = await readFile(snapshotPath(operationId));
    if (!raw) throw new Error("No immutable pre-update snapshot exists.");
    const snapshot = JSON.parse(raw.content);
    const current = await readFile(snapshot.targetPath);
    if (!current) throw new Error("Cannot rollback: target article no longer exists.");
    const restored = await writeFile(snapshot.targetPath, snapshot.originalContent, `Rollback SEO operation ${operationId}`, current.sha);
    if (!restored?.content?.sha) throw new Error("Rollback write was not acknowledged.");
    return {
      operationId,
      targetPath: snapshot.targetPath,
      restoredBlobSha: restored.content.sha,
      originalBlobSha: snapshot.originalSha,
      status: "ROLLBACK_WRITE_SUCCEEDED_VERIFICATION_REQUIRED",
      rolledBackAt: new Date().toISOString(),
    };
  }

  return Object.freeze({ execute, rollback, readFile, verifyPublic });
}
