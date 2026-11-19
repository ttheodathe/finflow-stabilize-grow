import { readFile, writeFile } from "node:fs/promises";

const WEIGHTS = Object.freeze({
  gscOpportunity: 20,
  searchIntent: 15,
  productFit: 15,
  commercialRelevance: 10,
  uniqueness: 10,
  topicalAuthority: 10,
  cannibalizationSafety: 10,
  researchConfidence: 5,
  conversionPotential: 5,
});

const REQUIRED_EVIDENCE = ["sourceUrl", "sourceType", "verifiedAt", "supports"];
const ALLOWED_STATES = [
  "DISCOVERED",
  "RESEARCHING",
  "DRAFTED",
  "VALIDATING",
  "APPROVED_BY_POLICY",
  "PUBLISHED",
  "VERIFIED",
];

function assertScore(value, field) {
  if (!Number.isFinite(value) || value < 0 || value > 5) {
    throw new Error(`${field} must be a number from 0 to 5.`);
  }
}

export function scoreOpportunity(opportunity) {
  if (!opportunity || typeof opportunity !== "object" || Array.isArray(opportunity)) {
    throw new Error("Each opportunity must be an object.");
  }
  const scores = opportunity.scores;
  if (!scores || typeof scores !== "object" || Array.isArray(scores)) {
    throw new Error("Opportunity scores are required.");
  }

  let total = 0;
  for (const [field, weight] of Object.entries(WEIGHTS)) {
    assertScore(scores[field], field);
    total += (scores[field] / 5) * weight;
  }

  const cannibalization = opportunity.cannibalization || {};
  const knownConflict = cannibalization.status === "confirmed_conflict";
  const missingEvidence = !Array.isArray(opportunity.evidence) ||
    opportunity.evidence.length === 0 ||
    opportunity.evidence.some((item) =>
      !item || REQUIRED_EVIDENCE.some((field) =>
        typeof item[field] !== "string" || item[field].trim() === ""
      )
    );
  const unclearIntent = typeof opportunity.searchIntent !== "string" ||
    opportunity.searchIntent.trim().length === 0;
  const missingOwner = typeof opportunity.editorialOwner !== "string" ||
    opportunity.editorialOwner.trim().length === 0;
  const remediation = [];
  if (missingEvidence) remediation.push("Add verifiable source evidence with URL, source type, verification date, and supported claim.");
  if (unclearIntent) remediation.push("Define the primary search intent before prioritization.");
  if (knownConflict) remediation.push("Resolve confirmed cannibalization against the identified existing URL.");
  if (missingOwner) remediation.push("Assign an editorial owner for review.");

  return {
    id: typeof opportunity.id === "string" ? opportunity.id : null,
    topic: typeof opportunity.topic === "string" ? opportunity.topic : "",
    score: Math.round(total * 100) / 100,
    scoreMaximum: 100,
    scoreBreakdown: Object.fromEntries(
      Object.entries(WEIGHTS).map(([field, weight]) => [
        field,
        Math.round((scores[field] / 5) * weight * 100) / 100,
      ]),
    ),
    priority: total >= 75 ? "HIGH" : total >= 55 ? "MEDIUM" : "LOW",
    decision: remediation.length ? "BLOCKED" : "REVIEW_REQUIRED",
    hardStops: [
      ...(missingEvidence ? ["MISSING_SOURCE_EVIDENCE"] : []),
      ...(unclearIntent ? ["UNCLEAR_SEARCH_INTENT"] : []),
      ...(knownConflict ? ["CONFIRMED_CANNIBALIZATION"] : []),
      ...(missingOwner ? ["MISSING_EDITORIAL_OWNER"] : []),
    ],
    remediation,
    existingUrl: cannibalization.existingUrl || null,
    nextState: "DISCOVERED",
  };
}

export function buildDryRunReport(input) {
  if (!input || typeof input !== "object" || !Array.isArray(input.opportunities)) {
    throw new Error("Input must contain an opportunities array.");
  }
  const results = input.opportunities.map(scoreOpportunity)
    .sort((a, b) => b.score - a.score || a.topic.localeCompare(b.topic));
  return {
    schemaVersion: 1,
    mode: "dry-run",
    generatedAt: new Date().toISOString(),
    source: input.source || "user-supplied local snapshot",
    note: "Scores are editorial prioritization aids, not search-volume estimates or ranking forecasts. No content was published or modified.",
    count: results.length,
    results,
  };
}

function parseArgs(args) {
  const options = { dryRun: false, input: null, output: null };
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--dry-run") options.dryRun = true;
    else if (flag === "--input") options.input = args[++index];
    else if (flag === "--out") options.output = args[++index];
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!options.dryRun) throw new Error("Refusing to run without explicit --dry-run.");
  if (!options.input) throw new Error("--input is required.");
  return options;
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const input = JSON.parse(await readFile(options.input, "utf8"));
    const report = buildDryRunReport(input);
    const output = `${JSON.stringify(report, null, 2)}\\n`;
    if (options.output) await writeFile(options.output, output, { flag: "wx" });
    process.stdout.write(output);
  } catch (error) {
    process.stderr.write(`SEO opportunity dry-run failed: ${error.message}\\n`);
    process.exitCode = 1;
  }
}
