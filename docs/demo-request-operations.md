# Demo request operations

The public contact form submits to `POST /api/demo-requests`. Requests are stored in the private `public.demo_requests` table. The browser roles have no table access; the route uses the server-only Supabase service-role client after validation.

## Optional internal notifications

To email an internal team inbox when a new request is saved, configure these Vercel environment variables for the intended deployment:

- `DEMO_REQUEST_NOTIFICATION_EMAIL`: one internal team inbox. This is the only recipient of the notification.
- `RESEND_API_KEY`: the existing Resend API key. The sender is `FinFlowTrack <invoices@finflowtrack.com>`, which must be verified with Resend.

If either variable is missing, the request is still stored and the route logs that internal notification is not configured. The person requesting a demo is not sent an email by this feature.

## Private lead-management API

Set `DEMO_REQUEST_ADMIN_EMAILS` to a comma-separated allowlist of staff account email addresses. A caller must also provide a valid Supabase access token for one of those accounts. Do not put this variable in a client-prefixed environment variable.

List the latest requests (maximum 100 per page):

```http
GET /api/demo-requests?limit=50&offset=0
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

Update a request status:

```http
PATCH /api/demo-requests
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
Content-Type: application/json

{"id":"<REQUEST_UUID>","status":"contacted"}
```

Allowed statuses: `new`, `contacted`, `scheduled`, `closed`, and `spam`.

The management endpoint returns only the selected lead fields and never returns the HMAC submission fingerprint or rate-limit hashes. Keep the allowlist limited to authorized staff and rotate/remove access when staff responsibilities change.

## Database rollout

The migration is `supabase/migrations/20261125170000_create_demo_requests.sql`. CI applies it only to an isolated PostgreSQL test database and checks RLS, role grants, consent enforcement, and rate-limit behavior. Production application remains a separate, explicitly approved rollout step.
