import test from "node:test";
import assert from "node:assert/strict";
import { contentApprovalHash, createGitHubContentAdapter } from "./execution-adapter.mjs";
import { assertProductionWritesBlocked, readExecutionPolicy } from "./safety.mjs";

const safeEnv = {
  DRY_RUN: "true", PUBLISH_ENABLED: "false",
  CONTENT_UPDATE_ENABLED: "false", PRODUCTION_CONTENT_WRITE_ALLOWED: "false",
};

function makeMockGitHub(initial = {}) {
  const files = new Map(Object.entries(initial).map(([path, content], i) => [path, { content, sha: `sha-${i + 1}` }]));
  let writes = 0;
  const fetchImpl = async (input, options = {}) => {
    const url = String(input);
    if (url.startsWith("https://api.github.com/")) {
      const path = decodeURIComponent(url.split("/contents/")[1].split("?")[0]);
      if ((options.method || "GET") === "GET") {
        const item = files.get(path);
        if (!item) return new Response("", { status: 404 });
        return Response.json({ type: "file", sha: item.sha, content: Buffer.from(item.content).toString("base64") });
      }
      const body = JSON.parse(options.body);
      if (options.method === "DELETE") {
        if (!files.has(path) || files.get(path).sha !== body.sha) return new Response("sha mismatch", { status: 409 });
        files.delete(path);
        return Response.json({ commit: { sha: `delete-${++writes}` } });
      }
      const existing = files.get(path);
      if (body.sha && (!existing || existing.sha !== body.sha)) return new Response("sha mismatch", { status: 409 });
      if (!body.sha && existing) return new Response("already exists", { status: 422 });
      const item = { content: Buffer.from(body.content, "base64").toString("utf8"), sha: `write-${++writes}` };
      files.set(path, item);
      return Response.json({ content: { sha: item.sha }, commit: { sha: `commit-${writes}` } });
    }
    const slug = new URL(url).pathname.split("/").pop();
    const article = files.get(`content/blog/${slug}.md`);
    if (!article) return new Response("", { status: 404 });
    const body = article.content;
    const title = body.match(/^title:\s*["']?([^\n"']+)/m)?.[1] || "Test Article";
    const visible = body.replace(/---[\s\S]*?---/, "").trim();
    const canonical = `https://www.finflowtrack.com/blog/${slug}`;
    return new Response(`<html><head><title>${title}</title><link rel="canonical" href="${canonical}"></head><body>${title} ${visible}</body></html>`, { status: 200 });
  };
  return { files, fetchImpl };
}

function stagingEnv(type = "NEW_ARTICLE") {
  return {
    DRY_RUN: "false",
    PUBLISH_ENABLED: type === "NEW_ARTICLE" ? "true" : "false",
    CONTENT_UPDATE_ENABLED: type === "EXISTING_ARTICLE_UPDATE" ? "true" : "false",
    PRODUCTION_CONTENT_WRITE_ALLOWED: "false",
    CONTENT_TARGET_ENV: "staging",
    CONTENT_TARGET_BRANCH: "seo-staging",
  };
}

function approvedOperation(type, markdown, targetPath, extra = {}) {
  const metadata = { title: "Test Article" };
  return {
    id: extra.id || "operation-001", type, slug: "test-article",
    targetPath, markdown, metadata, ...extra,
    approval: {
      pullRequestNumber: 12, reviewId: 321, reviewerLogin: "trusted-editor",
      reviewedCommitSha: "head-1", targetPath, operationType: type,
      contentHash: contentApprovalHash({ operationType: type, targetPath, content: markdown, metadata }),
    },
  };
}

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
    token: "test-token", owner: "test", repo: "repo", env: safeEnv,
    fetchImpl: async () => { requests += 1; throw new Error("must not be called"); },
  });
  await assert.rejects(adapter.execute({
    id: "operation-001", type: "NEW_ARTICLE", slug: "test-article",
    markdown: "# Test", metadata: { title: "Test" },
    approval: { status: "APPROVED", approvedBy: "editor", approvedAt: "2026-11-19", targetPath: "content/blog/test-article.md", contentHash: "x" },
  }), /DRY_RUN is enabled/);
  assert.equal(requests, 0);
});

test("staging publish writes a real repository file and is idempotent", async () => {
  const mock = makeMockGitHub();
  const adapter = createGitHubContentAdapter({
    token: "test-token", owner: "test", repo: "repo", env: stagingEnv(),
    fetchImpl: mock.fetchImpl, approvalVerifier: async () => ({ verified: true }), publicBaseUrl: "https://preview.finflowtrack.test",
  });
  const markdown = '---\ntitle: "Test Article"\n---\n\nA useful article body for safe staging verification.';
  const operation = approvedOperation("NEW_ARTICLE", markdown, "content/blog/test-article.md", { verificationText: "A useful article body for safe staging verification." });
  const first = await adapter.execute(operation);
  assert.equal(first.status, "URL_VERIFIED");
  assert.equal(mock.files.get("content/blog/test-article.md").content, markdown);
  const second = await adapter.execute(operation);
  assert.equal(second.idempotentReplay, true);
  assert.equal(second.status, "URL_VERIFIED");
  assert.equal(mock.files.size, 2);
});

test("new article with an existing different slug is rejected", async () => {
  const mock = makeMockGitHub({ "content/blog/test-article.md": "existing article" });
  const adapter = createGitHubContentAdapter({
    token: "test-token", owner: "test", repo: "repo", env: stagingEnv(),
    fetchImpl: mock.fetchImpl, approvalVerifier: async () => ({ verified: true }), publicBaseUrl: "https://preview.finflowtrack.test",
  });
  const markdown = '---\ntitle: "Test Article"\n---\n\nNew article body.';
  await assert.rejects(adapter.execute(approvedOperation("NEW_ARTICLE", markdown, "content/blog/test-article.md")), /Duplicate slug/);
});

test("approval is invalidated when the content changes", async () => {
  const mock = makeMockGitHub();
  const adapter = createGitHubContentAdapter({
    token: "test-token", owner: "test", repo: "repo", env: stagingEnv(),
    fetchImpl: mock.fetchImpl, approvalVerifier: async () => ({ verified: true }), publicBaseUrl: "https://preview.finflowtrack.test",
  });
  const markdown = '---\ntitle: "Test Article"\n---\n\nOriginal body.';
  const operation = approvedOperation("NEW_ARTICLE", markdown, "content/blog/test-article.md");
  operation.markdown = markdown + "\nChanged after approval.";
  await assert.rejects(adapter.execute(operation), /Approval is invalid/);
});

test("existing article update snapshots original content and rollback restores it", async () => {
  const original = '---\ntitle: "Test Article"\n---\n\nOriginal body for rollback verification.';
  const revised = '---\ntitle: "Test Article"\n---\n\nRevised body for staging verification.';
  const mock = makeMockGitHub({ "content/blog/test-article.md": original });
  const adapter = createGitHubContentAdapter({
    token: "test-token", owner: "test", repo: "repo", env: stagingEnv("EXISTING_ARTICLE_UPDATE"),
    fetchImpl: mock.fetchImpl, approvalVerifier: async () => ({ verified: true }), publicBaseUrl: "https://preview.finflowtrack.test",
  });
  const baseline = mock.files.get("content/blog/test-article.md").sha;
  const operation = approvedOperation("EXISTING_ARTICLE_UPDATE", revised, "content/blog/test-article.md", {
    expectedBlobSha: baseline, verificationText: "Revised body for staging verification.",
  });
  const updated = await adapter.execute(operation);
  assert.equal(updated.status, "URL_VERIFIED");
  assert.equal(mock.files.get("content/blog/test-article.md").content, revised);
  assert.ok(mock.files.has(".seo-operations/snapshots/operation-001.json"));
  const rollback = await adapter.rollback("operation-001");
  assert.equal(rollback.status, "ROLLED_BACK", JSON.stringify(rollback.verification));
  assert.equal(mock.files.get("content/blog/test-article.md").content, original);
  assert.ok(mock.files.has(".seo-operations/rollbacks/operation-001.json"));
});


test("new article rollback deletes only the unchanged operation file", async () => {
  const mock = makeMockGitHub();
  const adapter = createGitHubContentAdapter({
    token: "test-token", owner: "test", repo: "repo", env: stagingEnv(),
    fetchImpl: mock.fetchImpl, approvalVerifier: async () => ({ verified: true }),
    publicBaseUrl: "https://preview.finflowtrack.test",
  });
  const markdown = '---\ntitle: "Test Article"\n---\n\nA useful article body for safe staging verification.';
  const operation = approvedOperation("NEW_ARTICLE", markdown, "content/blog/test-article.md", {
    verificationText: "A useful article body for safe staging verification.",
  });
  await adapter.execute(operation);
  const rollback = await adapter.rollback("operation-001", { reason: "Test removal" });
  assert.equal(rollback.status, "ROLLED_BACK");
  assert.equal(mock.files.has("content/blog/test-article.md"), false);
  const replay = await adapter.rollback("operation-001");
  assert.equal(replay.idempotentReplay, true);
});

test("update rollback refuses to overwrite a later concurrent edit", async () => {
  const original = '---\ntitle: "Test Article"\n---\n\nOriginal body.';
  const revised = '---\ntitle: "Test Article"\n---\n\nRevised body.';
  const mock = makeMockGitHub({ "content/blog/test-article.md": original });
  const adapter = createGitHubContentAdapter({
    token: "test-token", owner: "test", repo: "repo", env: stagingEnv("EXISTING_ARTICLE_UPDATE"),
    fetchImpl: mock.fetchImpl, approvalVerifier: async () => ({ verified: true }),
    publicBaseUrl: "https://preview.finflowtrack.test",
  });
  const baseline = mock.files.get("content/blog/test-article.md").sha;
  const operation = approvedOperation("EXISTING_ARTICLE_UPDATE", revised, "content/blog/test-article.md", {
    expectedBlobSha: baseline, verificationText: "Revised body.",
  });
  await adapter.execute(operation);
  mock.files.set("content/blog/test-article.md", { content: "Subsequent unrelated edit.", sha: "external-change" });
  await assert.rejects(adapter.rollback("operation-001"), /Concurrent modification detected/);
  assert.equal(mock.files.get("content/blog/test-article.md").content, "Subsequent unrelated edit.");
});
