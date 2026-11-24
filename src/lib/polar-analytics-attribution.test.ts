import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAttributedPolarPurchase,
  getPendingPolarCheckoutStartedAt,
  hasRecentPolarCheckout,
} from "./polar-analytics-attribution.ts";

const NOW = Date.parse("2026-11-24T12:00:00.000Z");
const CHECKOUT_STARTED = NOW - 15_000;

const validOrder = (overrides: Record<string, unknown> = {}) => ({
  id: "order_123",
  created_at: new Date(NOW - 5_000).toISOString(),
  paid: true,
  status: "paid",
  subscription_id: "sub_123",
  currency: "usd",
  net_amount: 1900,
  tax_amount: 342,
  total_amount: 2242,
  billing_reason: "subscription_create",
  product_id: "polar_product_pro_monthly",
  ...overrides,
});

test("reads a recent pending Polar checkout marker", () => {
  const marker = JSON.stringify({ startedAt: CHECKOUT_STARTED });
  assert.equal(getPendingPolarCheckoutStartedAt(marker, NOW), CHECKOUT_STARTED);
  assert.equal(hasRecentPolarCheckout(marker, NOW), true);
});

test("ignores invalid, future-dated, and expired checkout markers", () => {
  assert.equal(getPendingPolarCheckoutStartedAt("not-json", NOW), null);
  assert.equal(
    getPendingPolarCheckoutStartedAt(JSON.stringify({ startedAt: NOW + 120_000 }), NOW),
    null,
  );
  assert.equal(hasRecentPolarCheckout(JSON.stringify({ startedAt: NOW - 180_000 }), NOW), false);
  assert.equal(
    getPendingPolarCheckoutStartedAt(JSON.stringify({ startedAt: NOW - 90_000_000 }), NOW),
    null,
  );
});

test("maps a paid order for the active subscription to GA4 currency units", () => {
  const result = getAttributedPolarPurchase(validOrder(), {
    subscriptionId: "sub_123",
    checkoutStartedAt: CHECKOUT_STARTED,
    now: NOW,
  });

  assert.deepEqual(result, {
    orderId: "order_123",
    createdAt: NOW - 5_000,
    currency: "USD",
    value: 19,
    tax: 3.42,
    billingReason: "subscription_create",
    productId: "polar_product_pro_monthly",
  });
});

test("uses total less tax when Polar net_amount is missing", () => {
  const result = getAttributedPolarPurchase(
    validOrder({ net_amount: undefined, total_amount: 2242, tax_amount: 342 }),
    {
      subscriptionId: "sub_123",
      checkoutStartedAt: CHECKOUT_STARTED,
      now: NOW,
    },
  );

  assert.equal(result?.value, 19);
  assert.equal(result?.tax, 3.42);
});

test("rejects unpaid or unrelated orders", () => {
  const options = {
    subscriptionId: "sub_123",
    checkoutStartedAt: CHECKOUT_STARTED,
    now: NOW,
  };

  assert.equal(
    getAttributedPolarPurchase(validOrder({ paid: false, status: "pending" }), options),
    null,
  );
  assert.equal(
    getAttributedPolarPurchase(validOrder({ subscription_id: "sub_other" }), options),
    null,
  );
  assert.equal(getAttributedPolarPurchase(validOrder({ currency: "US" }), options), null);
  assert.equal(getAttributedPolarPurchase(validOrder({ net_amount: 0 }), options), null);
  assert.equal(getAttributedPolarPurchase(validOrder({ net_amount: -100 }), options), null);
  assert.equal(getAttributedPolarPurchase(validOrder({ id: undefined }), options), null);
});

test("rejects orders outside the checkout attribution window", () => {
  const options = {
    subscriptionId: "sub_123",
    checkoutStartedAt: CHECKOUT_STARTED,
    now: NOW,
  };

  assert.equal(
    getAttributedPolarPurchase(
      validOrder({ created_at: new Date(CHECKOUT_STARTED - 120_000).toISOString() }),
      options,
    ),
    null,
  );
  assert.equal(
    getAttributedPolarPurchase(
      validOrder({ created_at: new Date(NOW + 120_000).toISOString() }),
      options,
    ),
    null,
  );
});
