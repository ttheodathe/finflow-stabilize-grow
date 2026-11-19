const REQUIRED_DRAFT_METADATA = ["title", "description", "slug", "publicationStatus"];
const CAPABILITIES = new Set([
  "Basic accounting", "Invoice creation and PDF export", "Invoice delivery by email or secure link",
  "Expense tracking", "Customer management", "Profit and loss reports", "Balance sheet reports",
  "Cash flow reports", "Aging receivables and payables reports", "CSV report export",
  "Multi-currency transaction recording with the exchange rate locked when recorded",
  "Multiple companies and team roles subject to plan limits", "AI Bookkeeper on paid plans",
  "Recurring invoices on paid plans",
  "Invoice creation, expense tracking, customer management and basic reports (Free plan)",
]);
function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
}
export function validateDraft(draft, options = {}) {
  const errors = [], warnings = [];
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) throw new Error("Draft must be an object.");
  for (const field of REQUIRED_DRAFT_METADATA) {
    if (typeof draft[field] !== "string" || !draft[field].trim()) errors.push(`MISSING_METADATA:${field}`);
  }
  if (draft.publicationStatus !== "draft" || draft.status !== "draft") errors.push("PUBLICATION_STATUS_NOT_DRAFT");
  if (typeof draft.slug === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) errors.push("INVALID_SLUG");
  if (draft.publishedAt && !validDate(draft.publishedAt)) errors.push("INVALID_PUBLISHED_DATE");
  if (draft.author && draft.authorStatus !== "APPROVED") errors.push("UNAPPROVED_AUTHOR_ATTRIBUTION");
  if (!draft.author) warnings.push("AUTHOR_NOT_ASSIGNED_PENDING_APPROVAL");
  const existingSlugs = options.existingSlugs || draft.existingSlugs || [];
  const operationType = options.operationType || draft.operationType || "NEW_ARTICLE";
  const targetSlug = options.targetSlug || draft.targetSlug || null;
  if (existingSlugs.includes(draft.slug) && !(operationType === "EXISTING_ARTICLE_UPDATE" && targetSlug === draft.slug)) {
    errors.push("DUPLICATE_SLUG");
  }
  const evidence = Array.isArray(draft.evidence) ? draft.evidence : [];
  const evidenceUrls = new Set();
  for (const item of evidence) {
    try {
      const url = new URL(item.sourceUrl);
      if (!["https:","http:"].includes(url.protocol) || !item.sourceType || !validDate(item.verifiedAt) || !item.supports) {
        errors.push("INCOMPLETE_SOURCE_EVIDENCE");
      } else evidenceUrls.add(url.toString());
    } catch { errors.push("INVALID_SOURCE_URL"); }
  }
  if (!evidence.length) errors.push("NO_SOURCE_EVIDENCE");
  for (const claim of Array.isArray(draft.claims) ? draft.claims : []) {
    if (!claim || typeof claim.text !== "string" || !claim.text.trim()) { errors.push("INVALID_CLAIM_RECORD"); continue; }
    if (!Array.isArray(claim.sourceUrls) || !claim.sourceUrls.length) errors.push("UNSOURCED_CLAIM");
    else if (claim.sourceUrls.some(url => !evidenceUrls.has(url))) errors.push("CLAIM_SOURCE_NOT_IN_REGISTER");
    if (claim.verificationStatus === "UNVERIFIED") errors.push("UNVERIFIED_CLAIM");
    if (claim.type === "product" && !CAPABILITIES.has(claim.capability)) errors.push("UNVERIFIED_PRODUCT_CAPABILITY");
  }
  if (!Array.isArray(draft.claims) || !draft.claims.length) warnings.push("NO_CLAIMS_REGISTERED_FOR_EDITORIAL_REVIEW");
  if (typeof draft.canonicalUrl !== "string" || !draft.canonicalUrl.trim()) warnings.push("CANONICAL_REQUIRES_REVIEW");
  if (!draft.editorialReviewed) warnings.push("EDITORIAL_REVIEW_NOT_COMPLETED");
  if (!Array.isArray(draft.internalLinks) || draft.internalLinks.some(link => !link.slug || !link.title)) errors.push("INVALID_INTERNAL_LINK_RECORD");
  return {
    mode:"dry-run", decision:errors.length?"BLOCKED":"REVIEW_REQUIRED",
    errors:[...new Set(errors)], warnings:[...new Set(warnings)],
    note:"Deterministic validation does not prove semantic accuracy or originality. Human editorial review remains mandatory.",
  };
}
