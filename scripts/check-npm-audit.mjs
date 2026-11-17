import fs from "node:fs";

const report = JSON.parse(fs.readFileSync("npm-audit.json", "utf8"));
const allowedUrl = "https://github.com/advisories/GHSA-fc5q-39xc-vjpf";
const unexpected = [];

for (const [name, item] of Object.entries(report.vulnerabilities ?? {})) {
  for (const advisory of item.via ?? []) {
    if (advisory && typeof advisory === "object" &&
        ["high", "critical"].includes(advisory.severity) &&
        advisory.url !== allowedUrl) {
      unexpected.push({
        package: name,
        title: advisory.title,
        url: advisory.url,
        severity: advisory.severity
      });
    }
  }
}

if (Number(report.metadata?.vulnerabilities?.critical ?? 0) > 0) {
  throw new Error("Critical npm advisories remain; release gate blocked.");
}

if (unexpected.length > 0) {
  console.error("Unapproved high/critical npm advisories:", unexpected);
  process.exit(1);
}

const picomatch = report.vulnerabilities?.picomatch;
const knownAdvisoryPresent = picomatch?.via?.some(
  advisory => advisory && typeof advisory === "object" && advisory.url === allowedUrl
);

if (Number(report.metadata?.vulnerabilities?.high ?? 0) > 0 && !knownAdvisoryPresent) {
  throw new Error("High-severity npm findings exist without the explicitly mitigated picomatch advisory.");
}

if (knownAdvisoryPresent) {
  console.warn("Known picomatch advisory remains in the lockfile; its 4.0.7 code is patched at postinstall and tested.");
}

console.log("No unmitigated high/critical npm advisories found.");
