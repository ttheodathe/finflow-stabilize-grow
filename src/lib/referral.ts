/**
 * Referral capture, client side only.
 *
 * Mirrors the `pendingPlan` pattern already used in auth.tsx (persist to
 * localStorage on the marketing page, read it back at signup/company
 * creation) rather than introducing a new mechanism. Two things are
 * persisted:
 *  - `ffVisitorId`: a long-lived anonymous id, generated once, reused for
 *    every click/signup from this browser so clicks survive refreshes.
 *  - `pendingReferralCode`: the most recent ?ref= code seen (last-touch).
 */

const VISITOR_ID_KEY = "ffVisitorId";
const PENDING_REFERRAL_KEY = "pendingReferralCode";

export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

export function getPendingReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PENDING_REFERRAL_KEY);
}

export function clearPendingReferralCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_REFERRAL_KEY);
}

/**
 * Call once per page load. If a `?ref=` param is present, records the
 * click server-side (fire-and-forget) and stores it as the pending
 * (last-touch) referral for signup/company-creation to pick up later.
 */
export function captureReferralFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("ref");
  if (!code) return;

  localStorage.setItem(PENDING_REFERRAL_KEY, code);
  const visitorId = getOrCreateVisitorId();

  fetch("/api/public/partners/track-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      visitorId,
      landingPath: window.location.pathname,
      referrer: document.referrer || null,
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
    }),
    keepalive: true,
  }).catch(() => {
    // Best-effort — a failed click record should never block the visitor.
  });
}
