import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TOKEN_SCOPE = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
].join(" ");

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

export function parseServiceAccount(raw) {
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured.");
  let account;
  try {
    account = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON must contain valid JSON.");
  }
  if (
    account.type !== "service_account" ||
    typeof account.client_email !== "string" ||
    typeof account.private_key !== "string" ||
    typeof account.token_uri !== "string"
  ) {
    throw new Error("Google credential must be a service-account JSON document.");
  }
  return account;
}

export async function createAccessToken({
  credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  fetchImpl = fetch,
  nowSeconds = Math.floor(Date.now() / 1000),
}) {
  const account = parseServiceAccount(credentials);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: account.client_email,
    scope: TOKEN_SCOPE,
    aud: account.token_uri || TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString("base64url")}`;

  const response = await fetchImpl(account.token_uri || TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token exchange failed (HTTP ${response.status}). Check service-account configuration and API permissions.`);
  }
  const payload = await response.json();
  if (typeof payload.access_token !== "string" || !payload.access_token) {
    throw new Error("Google token response did not contain an access token.");
  }
  return payload.access_token;
}
