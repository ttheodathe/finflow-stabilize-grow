import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import matter from "gray-matter";
import { validateDraft } from "../content-ops/validate-draft.mjs";
import { createSupabaseSeoStoreFromEnv } from "../persistence/supabase-store.mjs";

const CONTENT_DIR = "content/blog";
const RESEARCH_DIR = "content/operations/research";
const MAX_EXCERPT_WORDS = 25;
const STALE_AFTER_DAYS = 30;
const SOURCE_PACKS = [
  {
    id: "recordkeeping",
    match: /record|bookkeep|accounting|expense|receipt|financial records/i,
    intent: "Informational",
    sources: [
      { url: "https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping", expectedPublisher: "Internal Revenue Service", supports: ["A recordkeeping system should clearly show income and expenses", "Good records support financial statements and business decisions"], terms: ["recordkeeping", "income", "expenses", "financial statements"] },
      { url: "https://www.irs.gov/businesses/small-businesses-self-employed/what-kind-of-records-should-i-keep", expectedPublisher: "Internal Revenue Service", supports: ["Supporting documents include invoices, receipts, bills and bank records"], terms: ["supporting documents", "invoices", "receipts", "bank"] },
    ],
    title: "A Practical Small-Business Recordkeeping Checklist",
    description: "Build a repeatable small-business recordkeeping routine for income, expenses, invoices, receipts, reconciliations and financial reviews.",
    sections: [
      ["Why records matter", "Good records help an owner understand business activity, prepare financial statements and support the entries recorded in the books. The IRS says a business may choose a recordkeeping system suited to its activity, provided it clearly shows income and expenses. That is US federal guidance; businesses elsewhere should check their own local requirements."],
      ["What to capture", "For each transaction, keep enough information to identify what happened, when it happened, who was involved, the amount and the business purpose. Supporting documents can include invoices, receipts, paid bills, deposit records and bank statements. A document should be organized so that it can be connected to the relevant entry."],
      ["A repeatable weekly routine", "1. Record sales and other income close to the transaction date.\n2. Record business purchases and expenses with clear descriptions.\n3. Attach or file supporting documents.\n4. Review unpaid customer invoices and supplier bills.\n5. Compare recorded transactions with bank and payment statements.\n6. Investigate missing, duplicated or unclear entries.\n7. Review summary reports and follow up on questions."],
      ["Keep records usable", "Choose a system that fits the size and complexity of the business. Use consistent categories, avoid mixing unrelated personal and business activity in the same record, and make a backup of important digital records. The key is a routine that is maintained, not a complicated process that is abandoned."],
      ["When software can help", "A spreadsheet can be enough for a very small operation with few transactions, provided it is kept consistently. As invoice volume, expenses or reporting needs grow, accounting software may make it easier to keep transaction records and review financial reports. Compare the specific features, export options, access controls and limits before choosing a tool."],
    ],
    claimSpecs: [
      { id: "records-purpose", text: "A suitable recordkeeping system should clearly show business income and expenses and support financial review.", terms: ["recordkeeping", "income", "expenses"], sourceIndexes: [0] },
      { id: "supporting-documents", text: "Invoices, receipts, paid bills and bank records can support entries in business books.", terms: ["invoices", "receipts", "bank"], sourceIndexes: [1] },
    ],
    productMention: "recordkeeping",
    related: ["complete-guide-to-small-business-accounting", "how-to-keep-track-of-business-expenses", "small-business-bookkeeping-checklist"],
  },
  {
    id: "cashflow",
    match: /cash.?flow|cash flow forecast|cash flow projection|working capital/i,
    intent: "Informational",
    sources: [
      { url: "https://www.sba.gov/counseling/manage-your-business/", expectedPublisher: "U.S. Small Business Administration", supports: ["A balance sheet helps track capital and supports cash-flow projections"], terms: ["balance sheet", "cash flow", "projection", "capital"] },
      { url: "https://business.gov.au/guide/guide-to-managing-cash-flow", expectedPublisher: "Australian Government business.gov.au", supports: ["Record sales and costs, invoice promptly, follow up unpaid invoices and choose payment terms"], terms: ["cash flow", "sales", "costs", "invoice", "payment terms"] },
    ],
    title: "How to Build a Practical Small-Business Cash Flow Forecast",
    description: "Learn how to forecast cash coming in and going out, review timing gaps and update a small-business cash flow plan.",
    sections: [
      ["Start with timing, not just profit", "Cash flow is about when money enters and leaves the business. A sale recorded today may not be collected until later, while rent, suppliers and other bills may be due sooner. A useful forecast therefore tracks expected dates as well as amounts."],
      ["Set up the forecast", "Choose a regular planning period that suits the business. List the opening cash balance, expected customer receipts, other expected inflows, operating payments, supplier bills, payroll and other known outflows. Use the due dates and the best available evidence for each estimate. Mark uncertain receipts separately instead of treating them as guaranteed."],
      ["Update it every week", "1. Replace estimates with actual receipts and payments.\n2. Move delayed customer payments to a realistic expected date.\n3. Add new bills and planned purchases.\n4. Compare the forecast balance with the payments due.\n5. Investigate any week where expected outflows exceed available cash.\n6. Record the decision and update the forecast."],
      ["Use financial records to improve the forecast", "A balance sheet provides a snapshot of assets, liabilities and equity. The U.S. Small Business Administration explains that it can help a business track capital and support cash-flow projections. Keep the forecast connected to current records, but do not confuse a forecast with a guarantee: estimates change when customers pay late, costs change or plans move."],
      ["Make the forecast useful", "Separate confirmed payments from uncertain ones, explain large assumptions, and compare actual results with the prior forecast. A forecast is most useful when it is updated as new information arrives and when the owner acts on timing problems early."],
    ],
    claimSpecs: [
      { id: "balance-sheet-forecast", text: "A balance sheet can help a business track capital and support cash-flow projections.", terms: ["balance sheet", "capital", "cash flow", "projection"], sourceIndexes: [0] },
      { id: "cashflow-practices", text: "Keeping records of sales and costs, invoicing promptly and following up unpaid invoices are practical cash-flow management steps.", terms: ["sales", "costs", "invoice", "unpaid", "cash flow"], sourceIndexes: [1] },
    ],
    productMention: "cashflow",
    related: ["13-week-cash-flow-forecast-template", "cash-flow-forecasting-small-business", "small-business-cash-flow-management"],
  },
  {
    id: "receivables",
    match: /late payment|unpaid invoice|invoice payment|accounts receivable|collect invoice/i,
    intent: "Informational",
    sources: [
      { url: "https://www.smallbusinesscommissioner.gov.uk/help-and-guidance/all-advice/building-good-payment-practice-in-your-new-business/", expectedPublisher: "Office of the Small Business Commissioner (UK)", supports: ["Agree payment terms in writing, invoice promptly and monitor invoice status"], terms: ["payment terms", "invoice", "monitoring payments", "cash flow"] },
      { url: "https://www.gov.uk/invoicing-and-taking-payment-from-customers/payment-obligations", expectedPublisher: "GOV.UK", supports: ["UK payment obligations depend on agreed payment dates and specific legal conditions"], terms: ["payment date", "30 days", "late payment", "interest"] },
    ],
    title: "A Practical System for Following Up Unpaid Business Invoices",
    description: "Create a consistent invoice follow-up process: confirm payment terms, send complete invoices, monitor due dates and resolve delays professionally.",
    sections: [
      ["Make payment expectations clear", "Agree payment terms before work begins and put them in the contract or written agreement. Confirm who receives the invoice, which details are required and how it should be submitted. Payment terms and legal rights vary by jurisdiction, so do not copy another country's rules without checking local guidance."],
      ["Send an invoice that can be processed", "Invoice promptly after the agreed delivery point. Include the invoice number, date, clear description of the work, amount, agreed due date and payment instructions. Ask whether a purchase-order number or a particular portal is required. Keep a copy and note when the customer acknowledges receipt."],
      ["Use a simple follow-up schedule", "1. Record the invoice and its due date when it is sent.\n2. Check that the correct person or finance team received it.\n3. Send a courteous reminder before the due date when appropriate.\n4. If it becomes overdue, confirm that there is no dispute or missing information.\n5. Contact the customer professionally and agree the next update date.\n6. Record the response and any revised payment commitment."],
      ["Review the receivables list", "Keep a list of unpaid invoices with the customer, invoice date, due date, amount, current status and next follow-up action. Review it regularly. This makes it easier to distinguish a simple processing delay from a disputed invoice or a customer who needs a different conversation."],
      ["Understand local payment rules", "The UK government publishes payment-obligation guidance for UK business transactions. It describes how agreed payment dates and statutory rules interact. That guidance is specific to the UK and should not be treated as legal advice or applied automatically in another country. Check the rules that apply to the business and contract."],
    ],
    claimSpecs: [
      { id: "invoice-process", text: "Agree payment terms in writing, send invoices promptly and monitor invoice status to support payment processes.", terms: ["payment terms", "invoice", "monitoring payments"], sourceIndexes: [0] },
      { id: "uk-payment-rules", text: "UK payment obligations depend on agreed payment dates and the applicable statutory rules.", terms: ["payment date", "late payment", "30 days"], sourceIndexes: [1], jurisdiction: "United Kingdom" },
    ],
    productMention: "receivables",
    related: ["accounts-receivable-management", "reducing-late-invoice-payments", "how-to-create-an-invoice"],
  },
];

const VERIFIED_PRODUCT = Object.freeze({
  checkedAtCommit: "49635dc300ec7a086efdfbd26e320d55ba5b2a33",
  sourceFiles: ["src/routes/pricing.tsx", "src/lib/features/catalog.ts", "src/lib/paddle/config.ts"],
  verifiedCapabilities: [
    { name: "Invoice creation", plan: "Free", source: "src/routes/pricing.tsx", evidence: "Free plan feature list" },
    { name: "Expense tracking", plan: "Free", source: "src/routes/pricing.tsx", evidence: "Free plan feature list" },
    { name: "Customer management", plan: "Free", source: "src/routes/pricing.tsx", evidence: "Free plan feature list" },
    { name: "Basic reports", plan: "Free", source: "src/routes/pricing.tsx", evidence: "Free plan feature list" },
    { name: "Recurring invoices", plan: "Professional or higher", source: "src/lib/features/catalog.ts", evidence: "Feature catalog minimum plan pro" },
    { name: "AI Bookkeeper", plan: "Professional or higher", source: "src/lib/features/catalog.ts", evidence: "Feature catalog minimum plan pro" },
  ],
  explicitlyNotVerifiedOrExcluded: ["Bank integrations", "Payroll on Free or Professional", "Tax filing or tax compliance", "Security certifications", "Automated bank feeds", "Customer testimonials", "Customer counts", "Guaranteed savings"],
});

function cleanText(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ").trim();
}
function htmlMeta(html, pattern) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (pattern.test(tag)) return tag.match(/content=["']([^"']+)["']/i)?.[1] || null;
  }
  return null;
}
function sourcePublisher(url) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  return ({ "irs.gov": "Internal Revenue Service", "sba.gov": "U.S. Small Business Administration", "business.gov.au": "Australian Government business.gov.au", "gov.uk": "GOV.UK", "smallbusinesscommissioner.gov.uk": "Office of the Small Business Commissioner (UK)" })[host] || host;
}
function sourceReliability(url) {
  const host = new URL(url).hostname;
  return /(^|\.)((irs|sba)\.gov|business\.gov\.au|gov\.uk|smallbusinesscommissioner\.gov\.uk)$/.test(host) ? "OFFICIAL_GOVERNMENT" : "UNVERIFIED_PUBLISHER";
}
function dateFromHtml(html) {
  const raw = htmlMeta(html, /property=["']article:published_time["']/i)
    || htmlMeta(html, /name=["']datePublished["']/i)
    || html.match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1]
    || null;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
function excerptFor(text, terms) {
  const lower = text.toLowerCase();
  let index = -1;
  for (const term of terms) { const found = lower.indexOf(term.toLowerCase()); if (found >= 0 && (index < 0 || found < index)) index = found; }
  if (index < 0) return null;
  const start = Math.max(0, index - 90);
  const snippet = text.slice(start, Math.min(text.length, start + 360)).trim();
  return snippet.split(/\s+/).slice(0, MAX_EXCERPT_WORDS).join(" ");
}
export function classifySearchIntent(query) {
  if (/buy|pricing|best software|software comparison|tool/i.test(query)) return "Commercial investigation";
  if (/login|sign in|website|support contact/i.test(query)) return "Navigational";
  if (/create account|download|sign up|start free/i.test(query)) return "Transactional";
  return "Informational";
}
export function freshnessFor(opportunity, now = new Date()) {
  const end = opportunity.reportingPeriodEnd || opportunity.dateRange?.endDate || opportunity.evidence?.dateRange?.endDate || null;
  if (!end) return { status: "UNKNOWN", ageDays: null, reportingPeriodEnd: null };
  const time = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(time)) return { status: "INVALID", ageDays: null, reportingPeriodEnd: end };
  const ageDays = Math.floor((now.getTime() - time) / 86400000);
  return { status: ageDays < 0 ? "FUTURE" : ageDays > STALE_AFTER_DAYS ? "STALE" : "FRESH", ageDays, reportingPeriodEnd: end };
}
export async function retrieveSource(source, { fetchImpl = fetch, now = new Date() } = {}) {
  const retrievedAt = now.toISOString();
  try {
    const response = await fetchImpl(source.url, { redirect: "follow", headers: { "user-agent": "FinFlowTrack-EditorialResearch/1.0 (+https://www.finflowtrack.com)" } });
    if (!response.ok) return { ...source, sourceTitle: null, publisher: source.expectedPublisher || sourcePublisher(source.url), publishedAt: null, retrievedAt, reliability: sourceReliability(source.url), status: "UNAVAILABLE", httpStatus: response.status, excerpt: null, error: `HTTP_${response.status}`, supportedClaims: [] };
    const html = await response.text();
    const text = cleanText(html);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || source.expectedPublisher || source.url;
    const excerpt = excerptFor(text, source.terms || []);
    const termMatches = (source.terms || []).filter(term => text.toLowerCase().includes(term.toLowerCase()));
    const supported = termMatches.length >= Math.min(2, (source.terms || []).length) && Boolean(excerpt);
    return {
      url: source.url, sourceTitle: title, publisher: sourcePublisher(source.url),
      publishedAt: dateFromHtml(html), retrievedAt, reliability: sourceReliability(source.url),
      status: supported ? "RETRIEVED_RELEVANT" : "RETRIEVED_RELEVANCE_UNCONFIRMED",
      httpStatus: response.status, excerpt, termMatches,
      supportedClaims: supported ? (source.supports || []) : [],
      limitations: ["Automated relevance uses keyword matching, not semantic fact-checking.", "Publication date is null when the source page does not expose a parseable date."],
    };
  } catch (error) {
    return { url: source.url, sourceTitle: null, publisher: source.expectedPublisher || sourcePublisher(source.url), publishedAt: null, retrievedAt, reliability: sourceReliability(source.url), status: "UNAVAILABLE", excerpt: null, error: String(error.message || error), supportedClaims: [] };
  }
}
function tokenize(value) {
  return new Set(String(value || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(word => word.length > 2 && !["the","and","for","with","how","what","your","from","that","this","small","business"].includes(word)));
}
function similarity(a, b) {
  const aa = tokenize(a), bb = tokenize(b);
  if (!aa.size || !bb.size) return 0;
  let overlap = 0; for (const token of aa) if (bb.has(token)) overlap += 1;
  return overlap / (aa.size + bb.size - overlap);
}
export async function loadInventory({ contentDir = CONTENT_DIR } = {}) {
  const files = (await readdir(contentDir)).filter(file => file.endsWith(".md"));
  const items = [];
  for (const file of files) {
    const raw = await readFile(path.join(contentDir, file), "utf8");
    const parsed = matter(raw);
    const data = parsed.data || {};
    items.push({ file, slug: data.slug || file.replace(/\.md$/, ""), title: data.title || file, description: data.description || "", tags: Array.isArray(data.tags) ? data.tags : [], content: parsed.content, markdown: raw });
  }
  return items;
}
export function analyzeCannibalization(query, inventory, targetUrl = null) {
  const targetSlug = targetUrl ? new URL(targetUrl).pathname.split("/").filter(Boolean).pop() : null;
  const scored = inventory.map(item => {
    const text = [item.title, item.description, item.slug, ...item.tags].join(" ");
    return { slug: item.slug, title: item.title, score: Number(similarity(query, text).toFixed(3)), url: `https://www.finflowtrack.com/blog/${item.slug}`, exactTarget: item.slug === targetSlug };
  }).sort((a,b) => b.score-a.score);
  const target = scored.find(item => item.exactTarget) || null;
  const strongest = scored[0] || null;
  const conflict = (target && target.score >= 0.12) || (strongest && strongest.score >= 0.42);
  return {
    status: conflict ? "EXISTING_INTENT_MATCH" : "NO_STRONG_MATCH",
    decision: conflict ? "UPDATE_EXISTING_ARTICLE" : "NEW_ARTICLE_CANDIDATE",
    target: target || (strongest?.score >= 0.30 ? strongest : null),
    related: scored.slice(0,5),
    unresolved: conflict && !target && strongest?.score >= 0.42,
    method: "Token-overlap screening across title, description, slug and tags; not a semantic substitute for editorial review.",
  };
}
function buildDraft(candidate, pack, sourceRecords, productEvidence, internalLinks, target) {
  const sourceLines = sourceRecords.filter(s => s.status === "RETRIEVED_RELEVANT").map(s => `- [${s.publisher}: ${s.sourceTitle}](${s.url})`).join("\n");
  const sections = pack.sections.map(([heading, body]) => `## ${heading}\n\n${body}`).join("\n\n");
  const productLine = productEvidence
    ? "\n\nFor a business that wants to keep these workflows together, FinFlow Track's Free plan includes invoice creation, expense tracking, customer management and basic reports. Check the current [plan details](/pricing) and confirm that the available limits fit your workflow.\n"
    : "";
  const links = internalLinks.map(item => `- [${item.title}](/blog/${item.slug})`).join("\n");
  const markdown = `---\ntitle: "${pack.title.replace(/"/g, '\\"')}"\ndescription: "${pack.description.replace(/"/g, '\\"')}"\nslug: "${target.slug}"\nstatus: "draft"\npublicationStatus: "draft"\ncategory: "small-business-finance"\ntags:\n  - small business\n  - ${pack.id}\n---\n\n# ${pack.title}\n\nA reliable process is easier to maintain when each step has a clear purpose and an owner. This guide focuses on practical routines rather than promises or one-size-fits-all rules.\n\n${sections}\n${productLine}\n## Related FinFlow Track guides\n\n${links}\n\n## Sources and scope\n\n${sourceLines}\n\nRequirements differ by country, contract and business structure. Government sources cited here are provided for the jurisdiction they cover; they are not a substitute for local professional advice.\n`;
  const claims = pack.claimSpecs.map(spec => {
    const mappedSources = spec.sourceIndexes.map(index => sourceRecords[index]).filter(Boolean);
    const termsVerified = spec.terms.every(term => mappedSources.some(source => source.termMatches?.some(match => match.toLowerCase() === term.toLowerCase())));
    const sourcesVerified = mappedSources.length > 0 && mappedSources.every(source => source.status === "RETRIEVED_RELEVANT");
    return {
      id: spec.id, text: spec.text, sourceUrls: mappedSources.map(source => source.url),
      verificationStatus: termsVerified && sourcesVerified ? "KEYWORD_RELEVANCE_PASS_HUMAN_REVIEW_REQUIRED" : "UNVERIFIED",
      jurisdiction: spec.jurisdiction || null,
    };
  });
  if (productEvidence) claims.push({
    id: "finflow-free-plan-capabilities",
    text: "FinFlow Track's Free plan includes invoice creation, expense tracking, customer management and basic reports.",
    type: "product", capability: "Invoice creation, expense tracking, customer management and basic reports (Free plan)",
    sourceUrls: ["https://www.finflowtrack.com/pricing"],
    verificationStatus: "VERIFIED_IN_CURRENT_REPOSITORY_SOURCE",
  });
  const evidence = sourceRecords.filter(s => s.status.startsWith("RETRIEVED")).map(s => ({
    sourceUrl: s.url, sourceType: "official_government", sourceTitle: s.sourceTitle,
    publisher: s.publisher, publishedAt: s.publishedAt, retrievedAt: s.retrievedAt,
    verifiedAt: s.retrievedAt.slice(0,10), supports: s.supportedClaims.join("; "),
    excerpt: s.excerpt, reliability: s.reliability, limitations: s.limitations,
  }));
  if (productEvidence) evidence.push({
    sourceUrl: "https://www.finflowtrack.com/pricing", sourceType: "first_party_product_documentation",
    sourceTitle: "FinFlow Track pricing page and feature catalog", publisher: "FinFlow Track",
    publishedAt: null, retrievedAt: new Date().toISOString(), verifiedAt: new Date().toISOString().slice(0,10),
    supports: "Free plan feature list in src/routes/pricing.tsx; plan gating in src/lib/features/catalog.ts",
    excerpt: null, reliability: "FIRST_PARTY_REPOSITORY_VERIFIED",
    limitations: ["Verified against repository source, not a live authenticated account."],
  });
  return {
    title: pack.title, description: pack.description, slug: target.slug,
    publicationStatus: "draft", status: "draft", author: null, authorStatus: "NOT_ASSIGNED",
    intent: pack.intent, targetQuery: candidate.targetQuery, relatedQueries: candidate.relatedQueries || [],
    operationType: candidate.operationType || "EXISTING_ARTICLE_UPDATE", targetSlug: target.slug,
    canonicalUrl: `https://www.finflowtrack.com/blog/${target.slug}`,
    content: markdown, evidence, claims, productEvidence: productEvidence ? VERIFIED_PRODUCT : null,
    internalLinks, sourceRecords, candidate,
  };
}
export async function runResearchPipeline({
  opportunities, contentDir = CONTENT_DIR, outputDir = RESEARCH_DIR,
  fetchImpl = fetch, now = new Date(), store = createSupabaseSeoStoreFromEnv(process.env),
  allowFixture = false,
} = {}) {
  if (!Array.isArray(opportunities)) throw new Error("Research pipeline requires an opportunities array.");
  const inventory = await loadInventory({ contentDir });
  await mkdir(outputDir, { recursive: true });
  const results = [];
  for (const raw of opportunities) {
    const queryRows = raw.evidence?.sampleQueries || [];
    const queryRow = queryRows.find(row => row.query === raw.queryText) || queryRows[0] || null;
    const candidate = {
      id: raw.id || raw.opportunityKey || null,
      targetUrl: raw.targetUrl || null,
      targetQuery: raw.targetQuery || raw.queryText || queryRow?.query || "",
      relatedQueries: raw.relatedQueries || queryRows.map(row => row.query).filter(Boolean).slice(1,6),
      metrics: {
        impressions: raw.metrics?.impressions ?? queryRow?.impressions ?? raw.evidence?.impressions ?? null,
        clicks: raw.metrics?.clicks ?? queryRow?.clicks ?? raw.evidence?.clicks ?? null,
        ctr: raw.metrics?.ctr ?? queryRow?.ctr ?? raw.evidence?.ctr ?? null,
        averagePosition: raw.metrics?.averagePosition ?? queryRow?.position ?? raw.evidence?.averagePosition ?? null,
      },
      reportingPeriodEnd: raw.reportingPeriodEnd || raw.evidence?.dateRange?.endDate || raw.dateRange?.endDate || null,
      dataSource: raw.dataSource || raw.evidence?.source || "UNKNOWN",
      evidenceMode: raw.evidenceMode || (raw.dataSource === "TEST_FIXTURE" ? "FIXTURE" : "LIVE_OR_PERSISTED"),
    };
    const freshness = freshnessFor(candidate, now);
    const intent = classifySearchIntent(candidate.targetQuery);
    const cannibalization = analyzeCannibalization(candidate.targetQuery, inventory, candidate.targetUrl);
    const base = { candidate, intent, freshness, cannibalization, draft: null, quality: null, rejectionReasons: [] };
    if (!candidate.targetQuery) base.rejectionReasons.push("MISSING_TARGET_QUERY");
    if (freshness.status === "STALE" || freshness.status === "FUTURE" || freshness.status === "INVALID") base.rejectionReasons.push(`GSC_EVIDENCE_${freshness.status}`);
    if (freshness.status === "UNKNOWN" && !allowFixture) base.rejectionReasons.push("GSC_FRESHNESS_UNKNOWN");
    if (candidate.evidenceMode === "FIXTURE" && !allowFixture) base.rejectionReasons.push("FIXTURE_EVIDENCE_NOT_ALLOWED_IN_SCHEDULED_RUN");
    if (candidate.metrics.impressions === null || candidate.metrics.clicks === null || candidate.metrics.ctr === null || candidate.metrics.averagePosition === null) base.rejectionReasons.push("INCOMPLETE_GSC_METRICS");
    if (base.rejectionReasons.length) { base.status = "REJECTED"; results.push(base); continue; }

    const pack = SOURCE_PACKS.find(item => item.match.test(candidate.targetQuery));
    if (!pack) { base.rejectionReasons.push("NO_APPROVED_SOURCE_PACK_FOR_TOPIC"); base.status = "REJECTED"; results.push(base); continue; }
    if (cannibalization.unresolved) { base.rejectionReasons.push("UNRESOLVED_CANNIBALIZATION"); base.status = "REJECTED"; results.push(base); continue; }
    const operationType = cannibalization.decision === "UPDATE_EXISTING_ARTICLE" ? "EXISTING_ARTICLE_UPDATE" : "NEW_ARTICLE";
    const target = cannibalization.target || {
      slug: candidate.targetQuery.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
      title: pack.title,
    };
    candidate.operationType = operationType;
    candidate.opportunityRationale = `GSC reports ${candidate.metrics.impressions} impressions, ${candidate.metrics.clicks} clicks, CTR ${candidate.metrics.ctr}, and average position ${candidate.metrics.averagePosition} for the reporting period ending ${freshness.reportingPeriodEnd}. These are observed GSC values, not search-volume estimates.`;
    const sourceRecords = await Promise.all(pack.sources.map(source => retrieveSource(source,{fetchImpl,now})));
    const sourceFailures = sourceRecords.filter(source => source.status !== "RETRIEVED_RELEVANT");
    const unsupported = pack.claimSpecs.filter(spec => {
      const mapped = spec.sourceIndexes.map(index => sourceRecords[index]).filter(Boolean);
      return !mapped.length || mapped.some(source => source.status !== "RETRIEVED_RELEVANT") ||
        !spec.terms.every(term => mapped.some(source => source.termMatches?.some(match => match.toLowerCase() === term.toLowerCase())));
    });
    if (sourceFailures.length || unsupported.length) base.rejectionReasons.push("SOURCE_VERIFICATION_INCOMPLETE");
    const productEvidence = ["Invoice creation","Expense tracking","Customer management","Basic reports"]
      .every(name => VERIFIED_PRODUCT.verifiedCapabilities.some(item => item.name === name));
    const related = pack.related.map(slug => inventory.find(item => item.slug === slug))
      .filter(item => item && item.slug !== target.slug).map(item => ({slug:item.slug,title:item.title}));
    const draft = buildDraft(candidate,pack,sourceRecords,productEvidence,related,target);
    const duplicateSlug = operationType === "NEW_ARTICLE" && inventory.some(item => item.slug === draft.slug);
    const contentText = matter(draft.content);
    const frontmatterValid = contentText.data.status === "draft" && contentText.data.publicationStatus === "draft" &&
      contentText.data.title === draft.title && contentText.data.description === draft.description && contentText.data.slug === draft.slug;
    const bodyWords = contentText.content.trim().split(/\s+/).length;
    const existingComparisons = inventory.map(item => ({
      slug:item.slug, score:Number(similarity(contentText.content,item.content).toFixed(3)),
    })).sort((a,b)=>b.score-a.score);
    const originality = {
      highestSimilarity: existingComparisons[0] || null,
      status: existingComparisons[0]?.score >= 0.42 ? "POSSIBLE_REPETITION_REVIEW_REQUIRED" : "NO_HIGH_OVERLAP_DETECTED",
    };
    if (originality.status === "POSSIBLE_REPETITION_REVIEW_REQUIRED") base.rejectionReasons.push("SUBSTANTIAL_REPETITION_WITH_EXISTING_ARTICLE");
    const quality = validateDraft(draft, {
      existingSlugs: inventory.map(item=>item.slug), operationType, targetSlug: target.slug,
    });
    if (!frontmatterValid) base.rejectionReasons.push("INVALID_DRAFT_FRONTMATTER");
    if (duplicateSlug) base.rejectionReasons.push("DUPLICATE_SLUG");
    if (bodyWords < 250) base.rejectionReasons.push("DRAFT_TOO_THIN");
    if (quality.decision === "BLOCKED") base.rejectionReasons.push(...quality.errors);
    if (sourceFailures.length) base.rejectionReasons.push("UNVERIFIED_SOURCE");
    base.draft = draft;
    base.existingContentComparison = existingComparisons.slice(0,5);
    base.quality = {
      ...quality, frontmatterValid, bodyWords, duplicateSlug,
      sourceCount: sourceRecords.length,
      verifiedSourceCount: sourceRecords.filter(source=>source.status==="RETRIEVED_RELEVANT").length,
      originality, productCapabilities: productEvidence ? "VERIFIED_FROM_REPOSITORY" : "NOT_VERIFIED",
    };
    base.status = base.rejectionReasons.length ? "REJECTED" : "DRAFT_READY_FOR_HUMAN_REVIEW";
    if (base.status === "DRAFT_READY_FOR_HUMAN_REVIEW") {
      const hash = createHash("sha256").update(draft.content).digest("hex");
      const filename = `${candidate.id || draft.slug}-${hash.slice(0,10)}.md`.replace(/[^a-zA-Z0-9._-]/g,"-");
      const draftPath = path.join(outputDir,"drafts",filename);
      await mkdir(path.dirname(draftPath),{recursive:true});
      await writeFile(draftPath,draft.content,{flag:"wx"}).catch(async error => { if(error.code!=="EEXIST") throw error; });
      base.draftPath = draftPath;
      base.contentHash = hash;
      if (store) {
        const scheduledFor = now.toISOString().slice(0,10);
        const operationKey = `research:${candidate.id || draft.slug}:${freshness.reportingPeriodEnd}`;
        await store.recordContentOperation({
          operationKey, operationType,
          targetPath:`content/blog/${draft.slug}.md`, slug:draft.slug, status:"DRAFTED",
          proposedContentHash:hash,
          payload:{
            pipelineVersion:"b7.1", evidenceMode:candidate.evidenceMode,
            candidate, intent, freshness, cannibalization, existingContentComparison:existingComparisons,
            sources:sourceRecords, claims:draft.claims, productEvidence:draft.productEvidence,
            quality:base.quality, draftMarkdown:draft.content,
            publicationStatus:"draft", execution:"DRY_RUN_ONLY",
            createdAt:now.toISOString(), scheduledFor,
          },
        });
        base.persistence = "PERSISTED";
      } else base.persistence = "LOCAL_DRY_RUN_ONLY";
    }
    results.push(base);
  }
  const report = {
    schemaVersion:1, pipeline:"B7.1_EVIDENCE_BACKED_RESEARCH",
    generatedAt:now.toISOString(), mode:"DRY_RUN",
    evidencePolicy:"GSC evidence is never fabricated. Fixture evidence is clearly marked and cannot enter scheduled runs.",
    productCapabilities:VERIFIED_PRODUCT,
    candidateCount:results.length,
    readyDraftCount:results.filter(item=>item.status==="DRAFT_READY_FOR_HUMAN_REVIEW").length,
    rejectedCount:results.filter(item=>item.status==="REJECTED").length,
    results,
  };
  const reportPath=path.join(outputDir,"research-pipeline-report.json");
  await writeFile(reportPath,JSON.stringify(report,null,2)+"\n");
  return {reportPath,results,readyDraftCount:report.readyDraftCount,rejectedCount:report.rejectedCount};
}
export { SOURCE_PACKS, VERIFIED_PRODUCT };
