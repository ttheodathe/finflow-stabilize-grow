import { createHash } from "node:crypto";

const API = "https://api.github.com";
const MAX_APPROVAL_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const hash = (value) => createHash("sha256").update(value).digest("hex");
const decode = (value) => Buffer.from(String(value || "").replace(/\n/g, ""), "base64").toString("utf8");

async function githubGet(url, token, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub approval verification failed (HTTP ${response.status}).`);
  }
  return response.json();
}

/**
 * Verify an editorial approval against GitHub's current PR, review, reviewer
 * permission and the exact file contents at the reviewed head commit.
 *
 * A caller-provided approval object is only a locator; it is never trusted as
 * proof of identity or authorization.
 */
export async function verifyGitHubApproval({
  token, owner, repo, approval, operation, targetPath, targetBranch,
  expectedContentHash, fetchImpl = fetch, now = Date.now(),
}) {
  if (!token || !owner || !repo) throw new Error("GitHub approval verification requires credentials and repository context.");
  if (!approval?.pullRequestNumber || !approval?.reviewId || !approval?.reviewerLogin) {
    throw new Error("Approval must reference a GitHub pull request, review ID and reviewer login.");
  }

  const base = `${API}/repos/${owner}/${repo}`;
  const pr = await githubGet(`${base}/pulls/${approval.pullRequestNumber}`, token, fetchImpl);
  if (!pr || pr.state !== "open" || pr.draft) throw new Error("Approval PR must be open and ready for review.");
  if (pr.base?.ref !== targetBranch || !pr.head?.ref || pr.head.ref === targetBranch) {
    throw new Error("Approval PR base/head branches do not match the authorized target.");
  }
  if (approval.reviewedCommitSha !== pr.head.sha) {
    throw new Error("Approval is stale because the PR head commit changed.");
  }

  const marker = [
    "<!-- finflow-seo-approval",
    `operationId="${operation.id}"`,
    `operationType="${operation.type}"`,
    `targetPath="${targetPath}"`,
    `contentHash="${expectedContentHash}"`,
    "-->"
  ].join(" ");
  if (!String(pr.body || "").includes(marker)) {
    throw new Error("PR approval marker does not bind this exact operation, target and content hash.");
  }

  const reviews = await githubGet(
    `${base}/pulls/${approval.pullRequestNumber}/reviews?per_page=100`, token, fetchImpl,
  );
  if (!Array.isArray(reviews)) throw new Error("GitHub did not return a review list.");
  const reviewer = String(approval.reviewerLogin).toLowerCase();
  const selected = reviews.find((item) => String(item.id) === String(approval.reviewId));
  if (!selected || String(selected.user?.login || "").toLowerCase() !== reviewer) {
    throw new Error("The referenced approval review does not belong to the claimed reviewer.");
  }
  const latestReviewerReview = reviews
    .filter((item) => String(item.user?.login || "").toLowerCase() === reviewer)
    .sort((a, b) => Date.parse(b.submitted_at || 0) - Date.parse(a.submitted_at || 0))[0];
  if (latestReviewerReview?.id !== selected.id || selected.state !== "APPROVED") {
    throw new Error("Approval is revoked or superseded by a later reviewer decision.");
  }
  if (selected.commit_id !== pr.head.sha || !selected.submitted_at) {
    throw new Error("Approval review does not cover the current PR head commit.");
  }
  const submittedAt = Date.parse(selected.submitted_at);
  if (!Number.isFinite(submittedAt) || submittedAt > now || now - submittedAt > MAX_APPROVAL_AGE_MS) {
    throw new Error("Approval has expired or has an invalid timestamp.");
  }

  const permission = await githubGet(
    `${base}/collaborators/${encodeURIComponent(approval.reviewerLogin)}/permission`, token, fetchImpl,
  );
  const level = permission?.permission;
  if (!["write", "maintain", "admin"].includes(level)) {
    throw new Error("Reviewer does not have the required repository permission.");
  }

  const file = await githubGet(
    `${base}/contents/${targetPath}?ref=${encodeURIComponent(pr.head.ref)}`, token, fetchImpl,
  );
  if (!file || file.type !== "file" || decode(file.content) !== operation.markdown) {
    throw new Error("The reviewed PR does not contain the exact proposed Markdown content.");
  }
  const actualHash = hash(JSON.stringify({
    operationType: operation.type,
    targetPath,
    content: operation.markdown,
    metadata: operation.metadata || {},
  }));
  if (actualHash !== expectedContentHash || approval.contentHash !== expectedContentHash) {
    throw new Error("Approval content hash does not match the exact proposed version.");
  }
  if (approval.targetPath !== targetPath || approval.operationType !== operation.type) {
    throw new Error("Approval target path or operation type does not match.");
  }

  return Object.freeze({
    verified: true,
    reviewerLogin: selected.user.login,
    reviewerPermission: level,
    pullRequestNumber: pr.number,
    reviewId: selected.id,
    reviewedCommitSha: pr.head.sha,
    contentHash: actualHash,
    targetPath,
    operationType: operation.type,
    approvedAt: selected.submitted_at,
    expiresAt: new Date(submittedAt + MAX_APPROVAL_AGE_MS).toISOString(),
  });
}
