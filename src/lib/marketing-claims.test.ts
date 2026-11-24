import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("pricing page does not market API access before it is customer-facing", async () => {
  const pricing = await readFile(new URL("../routes/pricing.tsx", import.meta.url), "utf8");
  const features = await readFile(new URL("../routes/features.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(pricing, /API Access/i);
  assert.match(features, /apiAccess.*not offered as a customer-facing feature/i);
});
