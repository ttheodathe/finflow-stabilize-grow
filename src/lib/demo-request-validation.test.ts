import assert from "node:assert/strict";
import test from "node:test";
import { demoRequestSchema } from "./demo-request-validation.ts";

const validRequest = {
  fullName: "Alex Morgan",
  businessName: "Northstar Studio",
  email: "ALEX@EXAMPLE.COM",
  businessType: "small_business",
  challenge: "We need a clearer way to track invoices and business expenses.",
  preferredTime: "flexible",
  phone: "",
  demoContactConsent: true,
  marketingConsent: false,
};

test("accepts a valid demo request without optional marketing consent", () => {
  const parsed = demoRequestSchema.parse(validRequest);
  assert.equal(parsed.email, "alex@example.com");
  assert.equal(parsed.marketingConsent, false);
});

test("rejects a request without explicit demo-contact consent", () => {
  const parsed = demoRequestSchema.safeParse({ ...validRequest, demoContactConsent: false });
  assert.equal(parsed.success, false);
});

test("rejects malformed email and unsupported selection values", () => {
  assert.equal(demoRequestSchema.safeParse({ ...validRequest, email: "not-an-email" }).success, false);
  assert.equal(
    demoRequestSchema.safeParse({ ...validRequest, preferredTime: "midnight" }).success,
    false,
  );
});

test("rejects a challenge that is too short", () => {
  assert.equal(demoRequestSchema.safeParse({ ...validRequest, challenge: "Help me" }).success, false);
});
