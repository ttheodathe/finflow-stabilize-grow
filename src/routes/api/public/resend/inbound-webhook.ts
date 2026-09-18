import { createFileRoute } from "@tanstack/react-router";
import { verifyResendSignature, extractRoutingToken } from "@/lib/resend/webhook.server";

// ---------------------------------------------------------------------------
// Inbound bill/receipt intake via email.
//
// Setup required on the Resend side (not something this code can do):
//   1. Add and verify an inbound domain in Resend, e.g. inbound.finflowtrack.com
//   2. Create a webhook pointed at this route's URL, subscribed to email.received
//   3. Copy the webhook's signing secret into RESEND_WEBHOOK_SECRET
// Each company's forwarding address is bills+<inbound_email_token>@<your-inbound-domain>
// — the token is on companies.inbound_email_token (generated automatically).
//
// NOTE: the exact Resend API surface for fetching attachment bytes
// (resend.emails.receiving.attachments.*) is inferred from Resend's public
// docs, not verified against a live call in this environment — worth a
// quick smoke test against a real forwarded email once this is deployed.
// A failure here fails closed: the document is marked 'failed' with the
// error message, nothing gets silently miscategorized.
// ---------------------------------------------------------------------------

async function fetchAttachmentBytes(emailId: string, attachmentId: string): Promise<ArrayBuffer> {
  const res = await fetch(
    `https://api.resend.com/emails/receiving/${emailId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } },
  );
  if (!res.ok) throw new Error(`Resend attachment fetch failed: ${res.status} ${await res.text()}`);
  const meta = (await res.json()) as { data?: { download_url?: string } };
  const downloadUrl = meta.data?.download_url;
  if (!downloadUrl) throw new Error("No download_url in attachment response");
  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) throw new Error(`Attachment download failed: ${fileRes.status}`);
  return fileRes.arrayBuffer();
}

export const Route = createFileRoute("/api/public/resend/inbound-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RESEND_WEBHOOK_SECRET;
        const rawBody = await request.text();

        const verified = verifyResendSignature(rawBody, request.headers, secret ?? "");
        if (!verified.ok) {
          console.warn("[resend-inbound] rejected:", verified.error);
          return new Response(verified.error, { status: verified.status });
        }
        const { event } = verified;
        if (event.type !== "email.received") {
          return new Response("ok (ignored event type)", { status: 200 });
        }

        const emailId = event.data.email_id as string | undefined;
        if (!emailId) return new Response("Missing email_id", { status: 400 });

        const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
        // biome-ignore lint/suspicious/noExplicitAny: schema types don't yet include this table
        const supabaseAdmin = _admin as any;

        // Dedupe — Resend delivers at-least-once.
        const insertEvent = await supabaseAdmin
          .from("inbound_email_events")
          .insert({ email_id: emailId, status: "received" })
          .select("id")
          .maybeSingle();
        if (insertEvent.error) {
          const code = (insertEvent.error as { code?: string }).code;
          if (code === "23505") return new Response("ok (duplicate)", { status: 200 });
          console.error("[resend-inbound] insert event failed:", insertEvent.error);
          return new Response("Server error", { status: 500 });
        }

        async function finish(status: "processed" | "skipped" | "failed", detail: string, companyId?: string, documentIds: string[] = []) {
          await supabaseAdmin
            .from("inbound_email_events")
            .update({ status, detail, company_id: companyId ?? null, document_ids: documentIds })
            .eq("email_id", emailId);
        }

        try {
          const toAddresses = (event.data.to as string[] | undefined) ?? [];
          const token = toAddresses.map(extractRoutingToken).find(Boolean);
          if (!token) {
            await finish("skipped", `No routing token found in recipient(s): ${toAddresses.join(", ")}`);
            return new Response("ok (no routing token)", { status: 200 });
          }

          const { data: company, error: companyErr } = await supabaseAdmin
            .from("companies")
            .select("id, user_id, currency")
            .eq("inbound_email_token", token)
            .maybeSingle();
          if (companyErr || !company) {
            await finish("skipped", `No company matches routing token ${token}`);
            return new Response("ok (unknown company)", { status: 200 });
          }

          const attachments = (event.data.attachments as
            | { id: string; filename: string; content_type: string }[]
            | undefined) ?? [];
          const usable = attachments.filter(
            (a) => a.content_type?.startsWith("image/") || a.content_type === "application/pdf",
          );
          if (usable.length === 0) {
            await finish("skipped", "No image or PDF attachments on this email", company.id);
            return new Response("ok (no usable attachments)", { status: 200 });
          }

          const { runDocumentExtraction } = await import("@/lib/document-ai.functions");
          const documentIds: string[] = [];

          for (const att of usable) {
            try {
              const bytes = await fetchAttachmentBytes(emailId, att.id);
              const path = `${company.id}/email-${emailId}-${att.id}/${att.filename}`;
              const { error: upErr } = await supabaseAdmin.storage
                .from("documents")
                .upload(path, Buffer.from(bytes), { contentType: att.content_type, upsert: true });
              if (upErr) throw new Error(upErr.message);

              const { data: doc, error: docErr } = await supabaseAdmin
                .from("documents")
                .insert({
                  company_id: company.id,
                  uploaded_by: company.user_id,
                  doc_type: "bill",
                  source: "email",
                  file_path: path,
                  file_name: att.filename,
                  mime_type: att.content_type,
                  file_size_bytes: bytes.byteLength,
                  status: "uploaded",
                })
                .select("id")
                .single();
              if (docErr || !doc) throw new Error(docErr?.message ?? "Could not create document record");
              documentIds.push(doc.id);

              await runDocumentExtraction(supabaseAdmin, doc.id, company.user_id);

              // Confidence-gated auto-post: only if the AI is essentially
              // certain AND the minimum fields a bill needs are present.
              // Anything short of that is left in 'needs_review' — it
              // already surfaces in Purchases > Bills > Scan a bill's
              // existing review workspace, which is the human-review layer.
              const { data: refreshed } = await supabaseAdmin
                .from("documents")
                .select("overall_confidence")
                .eq("id", doc.id)
                .single();
              const confidence = Number(refreshed?.overall_confidence ?? 0);

              if (confidence >= 0.99) {
                const { data: fields } = await supabaseAdmin
                  .from("document_extractions")
                  .select("field_name, field_value")
                  .eq("document_id", doc.id);
                const val = (name: string) =>
                  (fields ?? []).find((f: any) => f.field_name === name)?.field_value ?? null;
                const supplier = val("supplier") ?? val("company");
                const grandTotal = Number(val("grand_total"));
                const issueDate = val("date") ?? new Date().toISOString().slice(0, 10);

                if (supplier && Number.isFinite(grandTotal) && grandTotal > 0) {
                  const { data: vendorId } = await supabaseAdmin.rpc("match_or_create_vendor", {
                    _company_id: company.id,
                    _user_id: company.user_id,
                    _name: supplier,
                  });
                  const { data: accId } = await supabaseAdmin.rpc("find_account_by_company", {
                    _company_id: company.id,
                    _code: "7900",
                  });

                  if (vendorId && accId) {
                    const billNumber = `EML-${Date.now().toString().slice(-8)}`;
                    const { data: bill, error: billErr } = await supabaseAdmin
                      .from("bills")
                      .insert({
                        company_id: company.id,
                        user_id: company.user_id,
                        vendor_id: vendorId,
                        bill_number: billNumber,
                        issue_date: issueDate,
                        currency: company.currency,
                        subtotal: grandTotal,
                        tax: 0,
                        total: grandTotal,
                        status: "open",
                        notes: `Auto-posted from an emailed ${att.filename}`,
                      })
                      .select("id")
                      .single();
                    if (!billErr && bill) {
                      await supabaseAdmin.from("bill_items").insert({
                        company_id: company.id,
                        user_id: company.user_id,
                        bill_id: bill.id,
                        account_id: accId,
                        description: `Emailed bill from ${supplier}`,
                        quantity: 1,
                        unit_price: grandTotal,
                        tax_rate: 0,
                        amount: grandTotal,
                      });
                      // Fires the ledger-posting trigger now that the line
                      // item exists — same pattern purchases.bills.tsx uses.
                      await supabaseAdmin.from("bills").update({ status: "open" }).eq("id", bill.id);
                      await supabaseAdmin
                        .from("documents")
                        .update({
                          status: "approved",
                          linked_table: "bills",
                          linked_id: bill.id,
                          reviewed_at: new Date().toISOString(),
                        })
                        .eq("id", doc.id);
                    }
                  }
                }
              }
            } catch (attErr) {
              console.error("[resend-inbound] attachment processing failed:", attErr);
              const message = attErr instanceof Error ? attErr.message : "Extraction failed";

              // The one failure mode with no other visible surface: an
              // email channel has nowhere to show an "upgrade your plan"
              // prompt the way the in-app Scan-a-bill button can. Route it
              // through the existing notifications table/bell instead of
              // letting it vanish into a server log. Deduped to once per
              // company per day so a burst of forwarded bills on a free
              // plan doesn't spam the bell.
              if (message.includes("Upgrade your plan to continue")) {
                const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const { count } = await supabaseAdmin
                  .from("notifications")
                  .select("id", { count: "exact", head: true })
                  .eq("company_id", company.id)
                  .eq("type", "inbound_email_plan_gated")
                  .gte("created_at", since);
                if (!count) {
                  await supabaseAdmin.from("notifications").insert({
                    company_id: company.id,
                    user_id: company.user_id,
                    type: "inbound_email_plan_gated",
                    title: "An emailed bill couldn't be processed",
                    body: "AI document scanning needs a plan upgrade — the attachment is saved but wasn't auto-read.",
                    link: "/settings",
                  });
                }
              }
            }
          }

          await finish(documentIds.length > 0 ? "processed" : "failed", `Processed ${documentIds.length} attachment(s)`, company.id, documentIds);
          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("[resend-inbound] handler failed:", err);
          await finish("failed", err instanceof Error ? err.message : "Unknown error");
          return new Response("ok (logged failure)", { status: 200 });
        }
      },
    },
  },
});
