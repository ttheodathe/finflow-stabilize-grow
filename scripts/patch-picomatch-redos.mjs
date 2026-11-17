import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const entry = require.resolve("picomatch");
const packageRoot = path.dirname(entry);
const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));

if (packageJson.version !== "4.0.7") {
  throw new Error("FinFlow's picomatch mitigation expects 4.0.7, found " + packageJson.version + ". Review the patch before proceeding.");
}

const parsePath = path.join(packageRoot, "lib", "parse.js");
let source = fs.readFileSync(parsePath, "utf8");
const marker = "/* FINFLOW_PICOMATCH_REDOS_GUARD */";

if (source.includes(marker)) {
  console.log("picomatch ReDoS mitigation already applied");
  process.exit(0);
}

const oldOverlap = "const hasRepeatedCharPrefixOverlap = branches => {\n  const values = branches.map(normalizeSimpleBranch).filter(Boolean);\n\n  for (let i = 0; i < values.length; i++) {\n    for (let j = i + 1; j < values.length; j++) {\n      const a = values[i];\n      const b = values[j];\n      const char = a[0];\n\n      if (!char || a !== char.repeat(a.length) || b !== char.repeat(b.length)) {\n        continue;\n      }\n\n      if (a === b || a.startsWith(b) || b.startsWith(a)) {\n        return true;\n      }\n    }\n  }\n\n  return false;\n};";

const newOverlap = "const hasRepeatedPrefixOverlap = branches => {\n  const values = branches.map(normalizeSimpleBranch).filter(Boolean);\n\n  for (let i = 0; i < values.length; i++) {\n    for (let j = i + 1; j < values.length; j++) {\n      const a = values[i];\n      const b = values[j];\n\n      if (a === b || a.startsWith(b) || b.startsWith(a)) {\n        return true;\n      }\n    }\n  }\n\n  return false;\n};";

if (source.split(oldOverlap).length !== 2) {
  throw new Error("Expected picomatch prefix-overlap guard was not found exactly once");
}
source = source.replace(oldOverlap, newOverlap);

if (source.split("hasRepeatedCharPrefixOverlap(branches)").length !== 2) {
  throw new Error("Expected prefix-overlap call was not found exactly once");
}
source = source.replace("hasRepeatedCharPrefixOverlap(branches)", "hasRepeatedPrefixOverlap(branches)");

const branchesAnchor = "  const branches = splitTopLevel(body).map(branch => branch.trim());";
const starCheck = "\n\n  " + marker + "\n" +
"  // Ignore escaped stars and stars inside character classes. Any remaining\n" +
"  // wildcard star nested inside a repeated extglob can create nested unbounded\n" +
"  // quantifiers; literalize that extglob instead of compiling a backtracking regex.\n" +
"  const hasUnescapedStar = pattern => {\n" +
"    let escaped = false;\n" +
"    let inBracket = false;\n" +
"    let inQuote = false;\n\n" +
"    for (const ch of pattern) {\n" +
"      if (escaped) { escaped = false; continue; }\n" +
"      if (ch === \"\\\\\") { escaped = true; continue; }\n" +
"      if (ch === '\"') { inQuote = !inQuote; continue; }\n" +
"      if (inQuote) continue;\n" +
"      if (ch === \"[\" && !inBracket) { inBracket = true; continue; }\n" +
"      if (ch === \"]\" && inBracket) { inBracket = false; continue; }\n" +
"      if (!inBracket && ch === \"*\") return true;\n" +
"    }\n\n" +
"    return false;\n" +
"  };";

if (source.split(branchesAnchor).length !== 2) {
  throw new Error("Expected repeated-extglob branch anchor was not found exactly once");
}
source = source.replace(branchesAnchor, branchesAnchor + starCheck);

const loopAnchor = "    const chars = getStarExtglobSequenceChars(branch);\n" +
"    if (chars) {\n" +
"      sawStarSequence = true;\n" +
"      safeChars.push(...chars);\n" +
"      continue;\n" +
"    }\n\n" +
"    const literal = normalizeSimpleBranch(branch);";

const loopReplacement = "    const chars = getStarExtglobSequenceChars(branch);\n" +
"    if (chars) {\n" +
"      sawStarSequence = true;\n" +
"      safeChars.push(...chars);\n" +
"      continue;\n" +
"    }\n\n" +
"    if (hasUnescapedStar(branch)) {\n" +
"      return { risky: true };\n" +
"    }\n\n" +
"    const literal = normalizeSimpleBranch(branch);";

if (source.split(loopAnchor).length !== 2) {
  throw new Error("Expected repeated-extglob loop anchor was not found exactly once");
}
source = source.replace(loopAnchor, loopReplacement);

fs.writeFileSync(parsePath, source, "utf8");
console.log("Applied FinFlow's picomatch 4.0.7 ReDoS mitigation");
