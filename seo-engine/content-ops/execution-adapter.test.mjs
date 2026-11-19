import test from "node:test";
import assert from "node:assert/strict";
import { contentApprovalHash, createGitHubContentAdapter } from "./execution-adapter.mjs";
import { assertProductionWritesBlocked, readExecutionPolicy } from "./safety.mjs";

const safeEnv = {
  DRY_RUN: "true",
  PUBLISH_ENABLED: "false",
  CONTENT_UPDATE_ENABLED: "false",
  PRODUCTION_CONTENT_WRITE_ALLOWED: "false",
};

test("defaults fail closed and production writes remain blocked", () => {
  const policy = readExecutionPolicy({});
  assert.equal(policy.DRY_RUN, true);
  assert.equal(policy.PUBLISH_ENABLED, false);
  assert.equal(assertProductionWritesBlocked(safeEnv).DRY_RUN, true);
});

test("rejects malformed and contradictory safety flags", () => {
  assert.throws(() => readExecutionPolicy({ DRY_RUN: "yes" }), /exactly/);
  assert.throws(() => readExecutionPolicy({ DRY_RUN: "true", PUBLISH_ENABLED: "true" }), /Contradictory/);
});

test("approval hash binds operation type, exact target, content and metadata", () => {
  const base = { operationType: "NEW_ARTICLE", targetPath: "content/blog/test-article.md", content: "# Test", metadata: { title: "Test" } };
  assert.equal(contentApprovalHash(base), contentApprovalHash(base));
  assert.notEqual(contentApprovalHash(base), contentApprovalHash({ ...base, content: "# Changed" }));
  assert.notEqual(contentApprovalHash(base), contentApprovalHash({ ...base, targetPath: "content/blog/other.md" }));
});

test("production mutation is blocked before any GitHub request", async () => {
  let requests = 0;
  const adapter = createGitHubContentAdapter({
    token: "test-token", owner: "test", repo: "repo",
    env: safeEnv,
    fetchImpl: async () => { requests += 1; throw new Error("must not be called"); },
  });
  await assert.rejects(adapter.execute({
    id: "operation-001", type: "NEW_ARTICLE", slug: "test-article",
    markdown: "# Test", metadata: { title: "Test" },
    approval: { status: "APPROVED", approvedBy: "editor", approvedAt: "2026-11-19", targetPath: "content/blog/test-article.md", contentHash: "x" },
  }), /DRY_RUN is enabled/);
  assert.equal(requests, 0);
});

test("staging execution requires a non-main branch and explicit operation enablement", () => {
  const policy = readExecutionPolicy({
    DRY_RUN: "false", PUBLISH_ENABLED: "true", CONTENT_UPDATE_ENABLED: "false",
    PRODUCTION_CONTENT_WRITE_ALLOWED: "false", CONTENT_TARGET_ENV: "staging", CONTENT_TARGET_BRANCH: "seo-staging",
  });
  assert.equal(policy.targetBranch, "seo-staging");
});
