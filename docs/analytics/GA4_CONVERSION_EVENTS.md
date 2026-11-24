# GA4 conversion event mapping

FinFlow Track uses the existing GA4 web stream `G-XKQYZKSJ08` on
`https://www.finflowtrack.com`. The following event names match the three
key events configured on the GA4 property as of 2026-11-24:

| GA4 key event | FinFlow Track definition | Emission point |
| --- | --- | --- |
| `qualify_lead` | A visitor has created and saved a usable workspace and selected a plan. | After successful free-plan onboarding persistence, or after paid-plan workspace setup is persisted before checkout. |
| `close_convert_lead` | A qualified workspace has become a paying customer. | After the Polar webhook has made the subscription active and the browser can verify its first paid order with `billing_reason=subscription_create`. |
| `purchase` | A real, positive-value Polar order was paid. | Billing Settings after the user returns from Polar, the active subscription is confirmed, and the corresponding paid order is available from Polar. |

## Supporting events

- `begin_checkout`: emitted when the Polar checkout URL has been created successfully. Includes the displayed plan value, currency, and one subscription item.
- `auth_started` / `auth_completed`: sign-in and account creation flow.
- `onboarding_completed`: successful onboarding completion.
- `invoice_created` / `expense_created`: successful creation of the first-party accounting records.
- `first_value_action_completed`: the first invoice or expense recorded for a company.

## Purchase payload rules

The Polar order ID is sent as GA4's `transaction_id` for deduplication.
Order amounts are provided by Polar in cents and are converted to major currency
units. `value` is based on `net_amount` (after discounts, before tax), while
`tax` is passed separately. A purchase is rejected unless the provider marks
the order paid, the order belongs to the active subscription, it falls after
the browser's checkout marker, and the order has a valid currency and positive
net amount.

The browser-local checkout marker contains only a timestamp. Deduplication
keys are stored locally and are not sent to GA4. Event payloads must not include
names, email addresses, company names, account IDs, customer IDs, or financial
record details.

## Current limitation

The purchase/lead-conversion handoff is verified on the Polar checkout return
page, with a short refresh window for the Polar webhook. If a customer closes
the browser before returning, the client may not emit that order. This
implementation also does not guarantee that every automatic renewal is sent
to GA4. Complete server-side renewal reporting would require a consent-aware
GA4 Measurement Protocol implementation with a stored GA client identifier
and a server-side API secret; neither should be added to client-side code.

## Validation

The pure Polar attribution helpers are covered by
`src/lib/polar-analytics-attribution.test.ts`. The full repository CI checks
formatting, lint, tests, production build, TypeScript, and dependency audit.
After deployment, confirm new events in GA4 DebugView or Realtime; do not use a
test payment on the live billing provider merely to generate analytics data.
