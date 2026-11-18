# Production hardening rollout

This runbook deliberately separates additive preparation from enforcement so the currently deployed application is not broken during rollout.

## Preconditions

- All pull-request CI checks pass on the commit being deployed.
- The application deployment contains:
  - `/api/partners/submit-application` and the partner service calling it.
  - Invoice share-link management controls and `/api/invoices/share-link`.
  - Invoice email checks for revoked and expired links.
- Use only test/sample submissions and invoices for smoke checks.
- Do not apply the final enforcement migrations before the new application deployment is live.

## Phase 1 — additive preparation (safe before deployment)

Apply these migrations to the production Supabase project in timestamp order:

1. `20261118170000_partner_application_server_rate_limit.sql`
   - Creates the private rate-limit table and service-role-only functions.
   - Keeps the legacy public partner submission RPC executable temporarily, so the currently deployed form continues to work.
2. `20261118180000_invoice_share_link_lifecycle.sql`
   - Adds nullable expiry/revocation fields.
   - Updates public invoice lookup to reject explicitly revoked or expired tokens.
   - Existing rows keep NULL lifecycle fields, so all existing invoice links remain valid.
   - Does not yet set a default expiry for newly created invoices.

After Phase 1, verify that the existing public partner application form still submits and existing invoice links still open.

The legacy direct partner RPC remains temporarily executable during this compatibility window and is not yet protected by the new server-side quota. Keep the interval between Phase 1 and Phase 3 short; apply the final revocation migration promptly after the new deployment passes its smoke checks.

## Phase 2 — deploy the application

Deploy the commit containing the new server routes and UI. Verify using test/sample records:

- Partner application submission succeeds through the new server endpoint.
- A sixth request from the same source IP in the same hour is rejected with HTTP 429.
- An invalid bearer token is rejected; a valid signed-in applicant is associated with the verified Supabase user.
- Invoice owners and non-viewer active company members can manage links; viewers and non-members cannot.
- Copying an active link opens the invoice.
- Revoking a link makes the old URL unavailable.
- Regenerating a link invalidates the previous URL and returns a new URL.
- Sending an invoice with a revoked or expired link is blocked.

Do not proceed if these checks fail.

## Phase 3 — final enforcement (only after Phase 2 passes)

Apply these migrations:

1. `20261118171000_revoke_legacy_partner_application_rpc.sql`
   - Removes anonymous and authenticated direct execution of the legacy partner RPC.
   - Keeps execution available to the service role.
2. `20261118181000_set_invoice_share_link_default_expiry.sql`
   - Sets a 90-day expiry default for invoices created after this point.
   - Existing invoices remain unchanged; their NULL expiry is preserved until an owner explicitly regenerates or revokes the link.

Run the partner RPC-revocation and invoice-link lifecycle smoke checks again against test/sample records.

## Rollback boundaries

- Before Phase 3, if the new deployment fails, the legacy partner RPC remains available and invoice expiry defaults are not enabled. Roll back the application deployment and investigate without changing customer records.
- After Phase 3, do not roll back by simply restoring the old application. The legacy partner RPC is revoked and new invoice links have expiry defaults. A coordinated rollback must first restore the legacy RPC grant and explicitly decide how to handle newly issued invoice links. Never clear customer revocations or rotate existing tokens automatically.

## Evidence to retain

Record the deployed commit SHA, migration versions, CI run URL, test/sample invoice IDs, partner test submission ID, HTTP 429 result, old/new invoice link outcomes, and the timestamp of each phase. Never record raw bearer tokens or IP addresses in the evidence report.
