import test from "node:test";
import assert from "node:assert/strict";
import { verifyGitHubApproval } from "./github-approval.mjs";
import { createHash } from "node:crypto";

const markdown = '---\ntitle: "Approval fixture"\n---\n\nVerified article text for approval testing.';
const operation = {
  id: "operation-approval-001",
  type: "NEW_ARTICLE",
  markdown,
  metadata: { title: "Approval fixture" },
};
const targetPath = "content/blog/approval-fixture.md";
const contentHash = createHash("sha256").update(JSON.stringify({
  operationType: operation.type, targetPath, content: markdown, metadata: operation.metadata,
})).digest("hex");
const marker = `<!-- finflow-seo-approval operationId="${operation.id}" operationType="${operation.type}" targetPath="${targetPath}" contentHash="${contentHash}" -->`;

function fixture({ permission = "write", reviewState = "APPROVED", headSha = "head-1", reviewedSha = headSha, body = marker, fileContent = markdown, latestState = reviewState } = {}) {
  const review = { id: 321, user: { login: "trusted-editor" }, state: reviewState, commit_id: reviewedSha, submitted_at: new Date().toISOString() };
  const latest = { ...review, state: latestState };
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/pulls/12")) return Response.json({
      number: 12, state: "open", draft: false, updated_at: new Date().toISOString(),
      base: { ref: "seo-staging" }, head: { ref: "editor-proposal", sha: headSha }, body,
    });
    if (parsed.pathname.endsWith("/pulls/12/reviews")) return Response.json([review, latest].filter((item, index) => index === 0 || latestState !== reviewState));
    if (parsed.pathname.endsWith("/collaborators/trusted-editor/permission")) return Response.json({ permission });
    if (parsed.pathname.endsWith("/contents/content/blog/approval-fixture.md")) return Response.json({
      type: "file", content: Buffer.from(fileContent).toString("base64"),
    });
    return new Response("not found", { status: 404 });
  };
  return fetchImpl;
}

function input(fetchImpl, overrides = {}) {
  return {
    token: "fixture-token", owner: "owner", repo: "repo",
    approval: {
      pullRequestNumber: 12, reviewId: 321, reviewerLogin: "trusted-editor",
      reviewedCommitSha: "head-1", contentHash, targetPath, operationType: "NEW_ARTICLE",
    },
    operation, targetPath, targetBranch: "seo-staging",
    expectedContentHash: contentHash, fetchImpl, ...overrides,
  };
}

test("accepts a current GitHub approval from a reviewer with write permission", async () => {
  const result = await verifyGitHubApproval(input(fixture()));
  assert.equal(result.verified, true);
  assert.equal(result.reviewerLogin, "trusted-editor");
  assert.equal(result.reviewerPermission, "write");
});

test("rejects a reviewer without write-level repository permission", async () => {
  await assert.rejects(verifyGitHubApproval(input(fixture({ permission: "read" }))), /required repository permission/);
});

test("rejects stale approval after PR head changes", async () => {
  await assert.rejects(verifyGitHubApproval(input(fixture({ headSha: "head-2" }))), /head commit changed/);
});

test("rejects content that differs from the reviewed PR file", async () => {
  await assert.rejects(verifyGitHubApproval(input(fixture({ fileContent: markdown + "\nTampered" }))), /exact proposed Markdown/);
});

test("rejects revoked or superseded review decisions", async () => {
  await assert.rejects(verifyGitHubApproval(input(fixture({ latestState: "CHANGES_REQUESTED" }))), /revoked or superseded/);
});

test("rejects missing operation marker", async () => {
  await assert.rejects(verifyGitHubApproval(input(fixture({ body: "ordinary PR description" }))), /marker does not bind/);
});
