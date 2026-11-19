import { createHash } from "node:crypto";
import { assertExecutionAllowed, readExecutionPolicy } from "./safety.mjs";
import { verifyGitHubApproval } from "./github-approval.mjs";

const API = "https://api.github.com";
const b64 = (value) => Buffer.from(value, "utf8").toString("base64");
const decode64 = (value) => Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8");

function operationPath(id) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,100}$/.test(id)) throw new Error("Invalid operation ID.");
  return `.seo-operations/operations/${id}.json`;
}
function snapshotPath(id) { return `.seo-operations/snapshots/${id}.json`; }
function safeSlug(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Invalid article slug.");
  return slug;
}
function digest(value) { return createHash("sha256").update(value).digest("hex"); }

export function contentApprovalHash({ operationType, targetPath, content, metadata = {} }) {
  return digest(JSON.stringify({ operationType, targetPath, content, metadata }));
}

function validateApproval(operation, targetPath, content) {
  const approval = operation.approval;
  const expected = contentApprovalHash({
    operationType: operation.type, targetPath, content, metadata: operation.metadata || {},
  });
  if (!approval || !approval.pullRequestNumber || !approval.reviewId || !approval.reviewerLogin || !approval.reviewedCommitSha) {
    throw new Error("An authenticated GitHub pull-request review reference is required.");
  }
  if (approval.contentHash !== expected || approval.targetPath !== targetPath || approval.operationType !== operation.type) {
    throw new Error("Approval is invalid because the content or target changed after approval.");
  }
  return expected;
}

export function createGitHubContentAdapter({
  token, owner, repo, fetchImpl = fetch, env = process.env,
  publicBaseUrl, canonicalBaseUrl = "https://www.finflowtrack.com",
  approvalVerifier = verifyGitHubApproval,
}) {
  if (!token || !owner || !repo) throw new Error("GitHub content adapter requires token, owner, and repository.");
  const policy = readExecutionPolicy(env);
  const branch = policy.targetBranch;
  const canonicalOrigin = new URL(canonicalBaseUrl).origin;
  const publicOrigin = publicBaseUrl ? new URL(publicBaseUrl).origin : null;
  if (policy.targetEnvironment === "staging") {
    if (!publicOrigin || publicOrigin === canonicalOrigin) {
      throw new Error("Staging execution requires an explicit non-production preview URL.");
    }
  } else if (publicOrigin && publicOrigin !== canonicalOrigin) {
    throw new Error("Production verification must use the canonical production origin.");
  }
  const effectivePublicBaseUrl = publicOrigin || canonicalOrigin;

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
    return request(path, {
      method: "PUT",
      body: JSON.stringify({ message, content: b64(content), branch, ...(sha ? { sha } : {}) }),
    });
  }

  async function deleteFile(path, message, sha) {
    return request(path, {
      method: "DELETE",
      body: JSON.stringify({ message, sha, branch }),
    });
  }

  async function verifyPublic(url, expectedTitle, expectedText, expectedCanonicalUrl = url, { fetchPublic = fetchImpl, attempts = 5 } = {}) {
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
          verified: Boolean(titleMatches && contentMatches && canonical === expectedCanonicalUrl),
          status: response.status, canonical, titleMatches, contentMatches,
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
    const approvalEvidence = await approvalVerifier({
      token, owner, repo, approval: operation.approval, operation, targetPath,
      targetBranch: branch, expectedContentHash: approvalHash, fetchImpl,
    });
    if (!approvalEvidence?.verified) throw new Error("Authenticated GitHub approval could not be verified.");

    const ledgerPath = operationPath(operation.id);
    const prior = await readFile(ledgerPath);
    if (prior) {
      const record = JSON.parse(prior.content);
      if (record.approvalHash !== approvalHash || record.targetPath !== targetPath) {
        throw new Error("Idempotency conflict: operation ID was previously used for different content.");
      }
      if (record.status === "URL_VERIFIED") return { ...record, idempotentReplay: true };
    }

    const current = await readFile(targetPath);
    if (isNew && current) throw new Error("Duplicate slug: article already exists.");
    if (!isNew && !current) throw new Error("Update target does not exist.");
    if (!isNew && !operation.expectedBlobSha) throw new Error("Update requires the reviewed baseline blob SHA.");
    if (!isNew && current.sha !== operation.expectedBlobSha && current.content !== content) {
      throw new Error("Concurrent modification detected: current article SHA differs from the reviewed baseline.");
    }

    if (!isNew) {
      const snapshotFile = snapshotPath(operation.id);
      const existingSnapshot = await readFile(snapshotFile);
      if (!existingSnapshot && current.sha !== operation.expectedBlobSha) {
        throw new Error("Cannot safely recover an update whose baseline changed before its snapshot was recorded.");
      }
      if (!existingSnapshot) {
        const snapshot = {
          operationId: operation.id, targetPath, originalSha: current.sha,
          originalContent: current.content, originalMetadata: operation.originalMetadata || {},
          capturedAt: new Date().toISOString(),
        };
        const saved = await writeFile(snapshotFile, JSON.stringify(snapshot, null, 2), `SEO snapshot ${operation.id}`);
        if (!saved?.content?.sha) throw new Error("Pre-update snapshot could not be persisted.");
      } else {
        const snapshot = JSON.parse(existingSnapshot.content);
        if (snapshot.targetPath !== targetPath || snapshot.originalSha !== operation.expectedBlobSha) {
          throw new Error("Existing immutable snapshot does not match the approved update baseline.");
        }
      }
    }

    let written;
    if (current?.content === content) {
      written = { content: { sha: current.sha }, commit: null };
    } else {
      written = await writeFile(targetPath, content, `SEO ${isNew ? "publish" : "update"}: ${slug}`, current?.sha);
    }
    if (!written?.content?.sha) throw new Error("GitHub did not confirm the article content write.");

    const url = `${effectivePublicBaseUrl}/blog/${slug}`;
    const canonicalUrl = `${canonicalOrigin}/blog/${slug}`;
    const verification = await verifyPublic(url, operation.metadata?.title, operation.verificationText || "", canonicalUrl);
    const record = {
      operationId: operation.id, type: operation.type, targetPath, url, canonicalUrl, approvalHash,
      contentBlobSha: written.content.sha, commitSha: written.commit?.sha || null,
      approvalEvidence,
      status: verification.verified ? "URL_VERIFIED" : "WRITE_SUCCEEDED_VERIFICATION_PENDING",
      verification, executedAt: new Date().toISOString(),
    };
    const existingLedger = await readFile(ledgerPath);
    const ledger = await writeFile(ledgerPath, JSON.stringify(record, null, 2), `Record SEO operation ${operation.id}`, existingLedger?.sha);
    if (!ledger?.content?.sha) throw new Error("Operation audit record could not be persisted.");
    return record;
  }

  async function verifyAbsent(url, { fetchPublic = fetchImpl, attempts = 5 } = {}) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const response = await fetchPublic(url, { redirect: "follow" });
      if (response.status === 404 || response.status === 410) {
        return { verified: true, status: response.status, checkedAt: new Date().toISOString() };
      }
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
    return { verified: false, status: null, checkedAt: new Date().toISOString() };
  }

  async function rollback(operationId, { reason = "Editorial rollback" } = {}) {
    if (policy.DRY_RUN) throw new Error("DRY_RUN is enabled; rollback mutations are blocked.");
    if (policy.targetEnvironment !== "staging" || policy.targetBranch === "main") {
      throw new Error("Rollback is restricted to an explicitly configured non-production staging branch.");
    }
    if (!policy.PUBLISH_ENABLED && !policy.CONTENT_UPDATE_ENABLED) {
      throw new Error("Staging rollback is disabled because no content operation type is enabled.");
    }

    const rollbackPath = `.seo-operations/rollbacks/${operationId}.json`;
    const priorRollback = await readFile(rollbackPath);
    if (priorRollback) {
      const priorRecord = JSON.parse(priorRollback.content);
      if (priorRecord.status === "ROLLED_BACK") return { ...priorRecord, idempotentReplay: true };
    }

    const ledgerFile = await readFile(operationPath(operationId));
    if (!ledgerFile) throw new Error("Cannot rollback: operation ledger record is missing.");
    const ledger = JSON.parse(ledgerFile.content);
    const current = await readFile(ledger.targetPath);
    const slug = ledger.targetPath.split("/").pop().replace(/\\.md$/, "");
    const url = `${effectivePublicBaseUrl}/blog/${slug}`;
    const canonicalUrl = `${canonicalOrigin}/blog/${slug}`;
    let restoredBlobSha = null;
    let verification;

    if (ledger.type === "NEW_ARTICLE") {
      if (!policy.PUBLISH_ENABLED) throw new Error("New-article rollback requires staging publishing to be enabled.");
      if (!current) {
        verification = await verifyAbsent(url);
      } else {
        if (current.sha !== ledger.contentBlobSha) {
          throw new Error("Concurrent modification detected: new article changed after the recorded operation; refusing deletion.");
        }
        const removed = await deleteFile(ledger.targetPath, `Rollback new SEO article ${operationId}`, current.sha);
        if (!removed?.commit?.sha) throw new Error("GitHub did not acknowledge the new-article rollback deletion.");
        verification = await verifyAbsent(url);
      }
    } else if (ledger.type === "EXISTING_ARTICLE_UPDATE") {
      if (!policy.CONTENT_UPDATE_ENABLED) throw new Error("Article-update rollback requires staging updates to be enabled.");
      const raw = await readFile(snapshotPath(operationId));
      if (!raw) throw new Error("No immutable pre-update snapshot exists.");
      const snapshot = JSON.parse(raw.content);
      if (snapshot.targetPath !== ledger.targetPath) throw new Error("Snapshot target does not match the operation ledger.");
      if (!current) throw new Error("Cannot rollback: updated article no longer exists.");
      if (current.content !== snapshot.originalContent) {
        if (current.sha !== ledger.contentBlobSha) {
          throw new Error("Concurrent modification detected: target changed after the approved update; refusing overwrite.");
        }
        const result = await writeFile(
          snapshot.targetPath, snapshot.originalContent,
          `Rollback SEO operation ${operationId}`, current.sha,
        );
        if (!result?.content?.sha) throw new Error("Rollback write was not acknowledged.");
        restoredBlobSha = result.content.sha;
      } else {
        restoredBlobSha = current.sha;
      }
      const originalBody = snapshot.originalContent.replace(/^---[\\s\\S]*?---\\s*/, "").trim();
      verification = await verifyPublic(
        url, snapshot.originalMetadata?.title || null, originalBody, canonicalUrl,
      );
    } else {
      throw new Error("Unsupported operation type in rollback ledger.");
    }

    const rollbackRecord = {
      operationId,
      type: ledger.type,
      targetPath: ledger.targetPath,
      reason,
      expectedCurrentBlobSha: ledger.contentBlobSha,
      restoredBlobSha,
      originalBlobSha: ledger.type === "EXISTING_ARTICLE_UPDATE"
        ? JSON.parse((await readFile(snapshotPath(operationId))).content).originalSha
        : null,
      canonicalUrl,
      status: verification.verified ? "ROLLED_BACK" : "ROLLBACK_WRITE_SUCCEEDED_VERIFICATION_PENDING",
      verification,
      rolledBackAt: new Date().toISOString(),
    };
    const saved = await writeFile(
      rollbackPath, JSON.stringify(rollbackRecord, null, 2),
      `Record SEO rollback ${operationId}`, priorRollback?.sha,
    );
    if (!saved?.content?.sha) throw new Error("Rollback audit record could not be persisted.");
    return rollbackRecord;
  }

  return Object.freeze({ execute, rollback, readFile, verifyPublic });
}
