import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";

const execFile = promisify(nodeExecFile);
const DEFAULT_QUERY_FILE = "seo-engine/activation/production-aggregate-readonly.sql";

function validateConnectionString(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("SEO_PRODUCTION_READONLY_DATABASE_URL is required.");
  }
  let parsed;
  try { parsed = new URL(value); }
  catch { throw new Error("SEO_PRODUCTION_READONLY_DATABASE_URL must be a valid PostgreSQL connection URI."); }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname || !parsed.username || !parsed.pathname || parsed.pathname === "/" || decodeURIComponent(parsed.username).split(".")[0].toLowerCase() === "postgres") {
    throw new Error("SEO_PRODUCTION_READONLY_DATABASE_URL must include a PostgreSQL host, dedicated username, and database name.");
  }
  return value;
}

function parseAggregateOutput(stdout) {
  const rows = String(stdout).trim().split(/\r?\n/).filter(Boolean);
  if (rows.length !== 1) throw new Error("Production activation query returned an unexpected number of rows.");
  const fields = rows[0].split("|");
  if (fields.length !== 9) throw new Error("Production activation query returned an unexpected column count.");
  const sourceWatermark = new Date(fields[0]);
  if (!Number.isFinite(sourceWatermark.getTime())) throw new Error("Production activation query returned an invalid source watermark.");
  const count = (value, name) => {
    if (!/^\d+$/.test(value)) throw new Error(`Production activation query returned an invalid ${name} count.`);
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) throw new Error(`Production activation query returned an unsafe ${name} count.`);
    return parsed;
  };
  return {
    sourceWatermark: sourceWatermark.toISOString(),
    registeredUsersAllTime: count(fields[1], "registered users"),
    onboardingCompletionsAllTime: count(fields[2], "onboarding completions"),
    activatedUsersAllTime: count(fields[3], "activated users"),
    returningActivatedUsersAllTime: count(fields[4], "returning activated users"),
    newRegistrations30d: count(fields[5], "30-day registrations"),
    newOnboardingCompletions30d: count(fields[6], "30-day onboarding completions"),
    newActivatedUsers30d: count(fields[7], "30-day activated users"),
    newReturningActivatedUsers30d: count(fields[8], "30-day returning activated users"),
  };
}

export async function collectProductionActivationAggregate({
  connectionString,
  queryFile = DEFAULT_QUERY_FILE,
  execFileImpl = execFile,
} = {}) {
  const databaseUrl = validateConnectionString(connectionString);
  const sql = await readFile(queryFile, "utf8");
  if (!sql.startsWith("-- READ-ONLY PRODUCTION AGGREGATE QUERY.") ||
      !/\bselect\b/i.test(sql) ||
      /\b(insert|update|delete|merge|alter|drop|create|truncate|grant|revoke)\b/i.test(sql.replace(/^--.*$/gm, ""))) {
    throw new Error("Production activation SQL did not pass the read-only query guard.");
  }

  let result;
  try {
    result = await execFileImpl("psql", [
      "--no-psqlrc", "--set=ON_ERROR_STOP=1", "--no-align", "--tuples-only",
      "--field-separator=|", "--file", queryFile, "--dbname", databaseUrl,
    ], {
      encoding: "utf8",
      timeout: 45_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, PGSSLMODE: "require", PGAPPNAME: "finflow-seo-scheduler-3-readonly" },
    });
  } catch {
    // Never include the connection URI, password, or raw driver output in logs/reports.
    throw new Error("Production read-only activation query failed. Verify the dedicated login, network access, and PostgreSQL client installation.");
  }
  return parseAggregateOutput(result.stdout);
}
