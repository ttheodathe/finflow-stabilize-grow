const REQUIRED_METADATA = ["title", "description", "slug", "author", "publishedAt"];
const CAPABILITIES = new Set([
  "Basic accounting",
  "Invoice creation and PDF export",
  "Invoice delivery by email or secure link",
  "Expense tracking",
  "Customer management",
  "Profit and loss reports",
  "Balance sheet reports",
  "Cash flow reports",
  "Aging receivables and payables reports",
  "CSV report export",
  "Multi-currency transaction recording with the exchange rate locked when recorded",
  "Multiple companies and team roles subject to plan limits",
  "AI Bookkeeper on paid plans",
  "Recurring invoices on paid plans",
]);

function validDate(value) {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) &&\n    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function validateDraft(draft) {
  const errors = [];
  const warnings = [];
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    throw new Error("Draft must be an object.");
  }

  for (const field of REQUIRED_METADATA) {
    if (typeof draft[field] !== "string" || draft[field].trim() === "") {
      errors.push(`MISSING_METADATA:${field}`);
    }
  }
  if (typeof draft.slug === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) {
    errors.push("INVALID_SLUG");
  }
  if (draft.publishedAt && !validDate(draft.publishedAt)) errors.push("INVALID_PUBLISHED_DATE");

  const evidence = Array.isArray(draft.evidence) ? draft.evidence : [];
  const evidenceUrls = new Set();
  for (const item of evidence) {
    try {
      const url = new URL(item.sourceUrl);
      if (!["https:", "http:"].includes(url.protocol) || !item.sourceType || !validDate(item.verifiedAt) || !item.supports) {
        errors.push("INCOMPLETE_SOURCE_EVIDENCE");
      } else {
        evidenceUrls.add(url.toString());
      }
    } catch {
      errors.push("INVALID_SOURCE_URL");
    }
  }
  if (evidence.length === 0) errors.push("NO_SOURCE_EVIDENCE");

  for (const claim of Array.isArray(draft.claims) ? draft.claims : []) {
    if (!claim || typeof claim.text !== "string" || claim.text.trim() === "") {
      errors.push("INVALID_CLAIM_RECORD");
      continue;
    }
    if (!Array.isArray(claim.sourceUrls) || claim.sourceUrls.length === 0) {
      errors.push("UNSOURCED_CLAIM");
    } else if (claim.sourceUrls.some((url) => !evidenceUrls.has(url))) {
      errors.push("CLAIM_SOURCE_NOT_IN_REGISTER");
    }
    if (claim.type === "product" && !CAPABILITIES.has(claim.capability)) {
      errors.push("UNVERIFIED_PRODUCT_CAPABILITY");
    }
  }

  if (!Array.isArray(draft.claims) || draft.claims.length === 0) {
    warnings.push("NO_CLAIMS_REGISTERED_FOR_EDITORIAL_REVIEW");
  }
  if (typeof draft.canonicalUrl !== "string" || draft.canonicalUrl.trim() === "") {
    warnings.push("CANONICAL_REQUIRES_REVIEW");
  }
  if (!draft.editorialReviewed) warnings.push("EDITORIAL_REVIEW_NOT_COMPLETED");

  return {
    mode: "dry-run",
    decision: errors.length ? "BLOCKED" : "REVIEW_REQUIRED",
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    note: "This validator is a deterministic checklist, not an automated fact-checker. Human editorial review remains mandatory.",
  };
}
