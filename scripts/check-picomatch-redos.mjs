import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const picomatch = require("picomatch");

for (const pattern of ["+(*a)", "+(*)", "+(\"a*\")", "+(ab|abab)"]) {
  const compiled = picomatch.makeRe(pattern);
  assert.ok(compiled, "expected a compiled regular expression");
  assert.ok(compiled.source.includes("\\+\\("), pattern + " was not literalized: " + compiled.source);
  assert.ok(compiled.test(pattern), pattern + " should match its literal spelling");
  assert.ok(!compiled.test("ab".repeat(30) + "!"), pattern + " matched an unexpected input");
}

assert.ok(picomatch.isMatch("abcabc", "+(abc|def)"), "safe repeated extglobs should retain normal behavior");
assert.ok(picomatch.isMatch("ab", "+(*(a)|*(b))"), "safe star-sequence rewrites should retain all branches");

console.log("picomatch ReDoS mitigation checks passed");
