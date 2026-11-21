import { randomUUID } from "node:crypto";
import { mkdir, writeFile, appendFile } from "node:fs/promises";

const endpoint = process.env.SEO_PUBLISHER_URL;
const allowedPublisherEndpoints = new Set([
  "https://bufbyfwstdqvwnkhyrea.supabase.co/functions/v1/seo-article-publisher-acceptance",
  "https://zjaamxvqjiymgfujrtjm.supabase.co/functions/v1/seo-article-publisher",
]);
const audience = process.env.SEO_PUBLISHER_AUDIENCE || "finflowtrack-seo-publisher";
const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    return appendFile(process.env.GITHUB_OUTPUT, `${name}=${String(value)}\n`);
  }
}
async function getOidcToken() {
  if (!requestUrl || !requestToken) throw new Error("GitHub Actions OIDC token request is unavailable.");
  const url = new URL(requestUrl);
  url.searchParams.set("audience", audience);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${requestToken}` } });
  if (!response.ok) throw new Error(`GitHub OIDC token request failed (${response.status}).`);
  const payload = await response.json();
  if (!payload.value) throw new Error("GitHub OIDC token response was empty.");
  return payload.value;
}
async function callPublisher(body) {
  if (!endpoint) throw new Error("SEO_PUBLISHER_URL repository variable is not configured.");
  if (!allowedPublisherEndpoints.has(endpoint)) {
    throw new Error("SEO_PUBLISHER_URL must exactly match an approved FinFlow Track publisher endpoint.");
  }
  const url = new URL(endpoint);
  const token = await getOidcToken();
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Publisher endpoint rejected the request (${response.status}): ${result.error || "unknown error"}`);
  return result;
}

const action = process.argv[2];
if (action === "ping") {
  const result = await callPublisher({ action: "ping" });
  if (result.ok !== true || result.publisherIdentityVerified !== true) {
    throw new Error("Publisher OIDC preflight did not confirm identity.");
  }
  console.log("Publisher OIDC identity verified; no database or content changes made.");
} else if (action === "claim") {
  const claimId = randomUUID();
  const result = await callPublisher({ action: "claim", claimId });
  if (!result.claimed) {
    await output("claimed", "false");
    console.log("No editorially approved article is ready for publication.");
  } else {
    await mkdir("seo-output", { recursive: true });
    await writeFile("seo-output/publisher-claim.json", JSON.stringify(result, null, 2), "utf8");
    await output("claimed", "true");
    await output("claim_id", result.claim.claimId);
    await output("slug", result.claim.slug);
    await output("operation_type", result.claim.operationType);
    await output("target_path", result.claim.targetPath);
    console.log("Claimed one approved article revision for publication preflight.");
  }
} else if (action === "update") {
  const claimId = process.env.PUBLISH_CLAIM_ID;
  const status = process.env.PUBLISH_STATUS;
  if (!claimId || !status) throw new Error("PUBLISH_CLAIM_ID and PUBLISH_STATUS are required.");
  const result = await callPublisher({
    action: "update",
    claimId,
    status,
    githubBranch: process.env.PUBLISH_GITHUB_BRANCH || null,
    githubPrNumber: process.env.PUBLISH_GITHUB_PR_NUMBER ? Number(process.env.PUBLISH_GITHUB_PR_NUMBER) : null,
    commitSha: process.env.PUBLISH_COMMIT_SHA || null,
    publishedContentHash: process.env.PUBLISH_CONTENT_HASH || null,
    publishedUrl: process.env.PUBLISH_PUBLISHED_URL || null,
    errorMessage: process.env.PUBLISH_ERROR_MESSAGE || null,
  });
  if (result.updated !== true) throw new Error("Publisher state update was not confirmed.");
  console.log(`Publication state recorded: ${status}.`);
} else {
  throw new Error("Usage: publisher-api.mjs ping|claim|update");
}
