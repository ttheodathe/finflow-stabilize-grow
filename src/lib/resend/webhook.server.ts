/**
 * Resend webhook signature verification.
 * Server-only. Mirrors src/lib/polar/webhook.server.ts and
 * src/lib/paddle/webhook.server.ts in shape (same VerifyResult type).
 *
 * Resend signs webhooks using Svix under the hood (documented at
 * https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests).
 * The `svix` npm package isn't a dependency here, so this implements
 * the same HMAC-SHA256 scheme directly with Node's built-in crypto —
 * no new dependency needed.
 */
import { createHmac, timingSafeEqual } from "crypto";

export type VerifyResult =
  | { ok: true; event: { type: string; data: Record<string, unknown> } }
  | { ok: false; error: string; status: number };

// Svix tolerates replayed/delayed deliveries within this window; reject
// anything older to guard against replay attacks with a leaked payload.
const TOLERANCE_SECONDS = 5 * 60;

export function verifyResendSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
): VerifyResult {
  if (!secret) {
    return { ok: false, error: "Webhook secret not configured", status: 500 };
  }

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, error: "Missing svix signature headers", status: 400 };
  }

  const timestamp = Number(svixTimestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) {
    return { ok: false, error: "Webhook timestamp outside tolerance", status: 400 };
  }

  // secret arrives as "whsec_<base64>" — strip the prefix before decoding.
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest();

  // svix-signature is a space-separated list of "v1,<base64sig>" pairs —
  // accept if any one matches (supports secret rotation).
  const candidates = svixSignature.split(" ");
  const matched = candidates.some((candidate) => {
    const [version, sig] = candidate.split(",");
    if (version !== "v1" || !sig) return false;
    let provided: Buffer;
    try {
      provided = Buffer.from(sig, "base64");
    } catch {
      return false;
    }
    if (provided.length !== expected.length) return false;
    return timingSafeEqual(provided, expected);
  });

  if (!matched) {
    return { ok: false, error: "Invalid signature", status: 403 };
  }

  let parsed: { type?: string; data?: Record<string, unknown> };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: "Malformed JSON payload", status: 400 };
  }
  if (!parsed.type || !parsed.data) {
    return { ok: false, error: "Payload missing type/data", status: 400 };
  }

  return { ok: true, event: { type: parsed.type, data: parsed.data } };
}

// Pulls the routing token out of an inbound recipient address like
// "Bills <bills+9f2a1c@inbound.finflowtrack.com>" -> "9f2a1c", matching
// companies.inbound_email_token. Returns undefined for addresses with
// no "+token" local-part segment (e.g. a plain reply-to address).
export function extractRoutingToken(address: string): string | undefined {
  const emailMatch = address.match(/<?([^\s<>]+@[^\s<>]+)>?/);
  const email = emailMatch ? emailMatch[1] : address;
  const tokenMatch = email.match(/\+([a-z0-9]+)@/i);
  return tokenMatch ? tokenMatch[1].toLowerCase() : undefined;
}
