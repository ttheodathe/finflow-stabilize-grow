import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Intelligent Document Processing — extraction + review/approval pipeline.
//
// Reuses the Lovable AI gateway call already used by src/lib/ai-receipts.functions.ts
// and src/lib/ai-bookkeeper.functions.ts, but:
//  - persists the uploaded file + every extracted field (with confidence) to
//    the documents / document_extractions tables instead of discarding them
//  - runs deterministic validation checks (duplicates, math, missing fields)
//  - supports the broader field set + doc types from the IDP spec, not just
//    a flat receipt-to-expense mapping
//
// Client flow (see expenses.tsx for the reference integration):
//   1. client uploads the file to the `documents` storage bucket
//   2. client inserts a `documents` row (status='uploaded')
//   3. client calls extractDocument({ documentId })
//   4. review workspace shows document_extractions + document_validations
//   5. user edits/approves -> client calls approveDocument({ documentId, expense })
// ---------------------------------------------------------------------------

const DOC_TYPES = [
  "receipt",
  "purchase_invoice",
  "sales_invoice",
  "credit_note",
  "debit_note",
  "bill",
  "payroll_document",
  "bank_statement",
  "utility_bill",
  "delivery_note",
  "tax_certificate",
  "supporting_tax_document",
  "other",
] as const;

const LINE_ITEM_FIELDS = ["product", "quantity", "unit_price", "tax", "total"] as const;

const FIELD_GROUPS: Record<string, string[]> = {
  general: ["document_type", "language", "currency", "company", "supplier", "customer", "date", "due_date"],
  invoice: ["invoice_number", "reference_number", "purchase_order", "payment_terms", "tax_number", "vat_number"],
  financial: ["subtotal", "discount", "vat", "tax", "shipping", "grand_total"],
  payment: ["payment_method", "bank_details", "mobile_money", "reference_number"],
};

// AI provider: prefers Lovable's gateway (OpenAI-compatible shape, proxies
// to Gemini) if LOVABLE_API_KEY is set; falls back to calling Google's
// Gemini API directly with GEMINI_API_KEY otherwise — a genuinely free
// option (ai.google.dev, no credit card required as of this writing) for
// anyone who doesn't have/want a Lovable subscription. The two APIs have
// different request/response shapes entirely, so this isn't just a
// different URL — every call site goes through these two functions so the
// rest of the pipeline never needs to know which provider is in use.
type AiProvider = { kind: "lovable"; key: string } | { kind: "gemini-direct"; key: string };

function resolveAiProvider(): AiProvider {
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (lovableKey) return { kind: "lovable", key: lovableKey };
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) return { kind: "gemini-direct", key: geminiKey };
  throw new Error(
    "No AI provider configured. Set LOVABLE_API_KEY (Lovable AI gateway) or GEMINI_API_KEY " +
      "(free tier at ai.google.dev — no credit card required) in your environment variables.",
  );
}

function handleProviderError(res: Response, body: string, providerName: string): never {
  if (res.status === 429) throw new Error(`${providerName} rate limit reached. Please retry in a moment.`);
  if (res.status === 402)
    throw new Error(`${providerName} credits exhausted. Upgrade your plan to continue processing documents.`);
  throw new Error(`${providerName} error (${res.status}): ${body.slice(0, 200)}`);
}

async function callGeminiVision(imageDataUrls: string[], prompt: string, provider: AiProvider) {
  const userText =
    imageDataUrls.length > 1
      ? `Extract structured data from this ${imageDataUrls.length}-page document. Treat all pages as one document; put line items from every page into a single line_items array in reading order.`
      : "Extract structured data from this document.";

  if (provider.kind === "lovable") {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": provider.key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              ...imageDataUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
            ],
          },
        ],
      }),
    });
    if (!res.ok) handleProviderError(res, await res.text(), "AI gateway");
    const json = await res.json();
    return String(json.choices?.[0]?.message?.content ?? "");
  }

  // Direct Google Gemini API — native request/response shape, not the
  // OpenAI-style one Lovable's gateway exposes. Field names are snake_case
  // here deliberately: that's what the raw REST API takes (confirmed
  // against ai.google.dev's curl examples) — inlineData/mimeType/
  // systemInstruction are camelCase convenience names the JS/Python SDKs
  // convert before sending, not what goes over the wire when calling
  // fetch() directly like this.
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": provider.key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: prompt }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: userText },
              ...imageDataUrls.map((url) => {
                const [meta, base64] = url.split(",");
                const mimeType = meta.match(/data:(.*?);base64/)?.[1] ?? "image/png";
                return { inline_data: { mime_type: mimeType, data: base64 } };
              }),
            ],
          },
        ],
      }),
    },
  );
  if (!res.ok) handleProviderError(res, await res.text(), "Gemini API");
  const json = await res.json();
  return String(json.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
}

const MAX_PDF_PAGES = 10;

// Extracts the text layer from a PDF, page by page — pure JS/WASM via
// pdfjs-dist, zero native binaries. This matters here specifically: this
// project's Nitro build defaults to a Cloudflare Workers target (see
// wrangler.json getting generated even for Vercel deploys), and edge/worker
// runtimes cannot load compiled .node addons at all — a bundler will either
// fail trying to inline the binary, or the binary simply won't exist at
// runtime. Sticking to pure JS here means this works identically regardless
// of which Nitro preset actually ends up serving the deployed function.
//
// Trade-off, stated plainly: this only works for PDFs that have a real text
// layer (i.e. generated by software — the overwhelming majority of invoices,
// bills, and statements). A PDF that's just a scanned photo with no text
// layer will come back empty; extractDocument() below detects that and
// fails with a clear message rather than silently returning nothing.
async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableFontFace: true,
    standardFontDataUrl: "node_modules/pdfjs-dist/standard_fonts/",
  }).promise;

  const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES);
  const pages: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => ("str" in item ? item.str : "")).join(" ");
    pages.push(text.trim());
  }
  return pages.map((t, i) => (pages.length > 1 ? `--- Page ${i + 1} ---\n${t}` : t)).join("\n\n");
}

async function callGeminiText(documentText: string, prompt: string, provider: AiProvider) {
  const userText = `Extract structured data from this document's text:\n\n${documentText}`;

  if (provider.kind === "lovable") {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": provider.key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userText },
        ],
      }),
    });
    if (!res.ok) handleProviderError(res, await res.text(), "AI gateway");
    const json = await res.json();
    return String(json.choices?.[0]?.message?.content ?? "");
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": provider.key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: prompt }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
      }),
    },
  );
  if (!res.ok) handleProviderError(res, await res.text(), "Gemini API");
  const json = await res.json();
  return String(json.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
}

function extractJson(text: string): any {
  const cleaned = text.replace(/```json\s*|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("AI response was not valid JSON");
  }
}

const EXTRACTION_PROMPT = `You are a document intelligence engine for an accounting platform. You extract
structured data from financial documents (receipts, invoices, bills, credit/debit notes,
delivery notes, tax certificates, bank statements, utility bills).

Reply with ONLY a single JSON object, no prose, no markdown fences, shaped exactly like this:

{
  "general": {
    "document_type": {"value": string|null, "confidence": number},
    "language": {"value": string|null, "confidence": number},
    "currency": {"value": string|null, "confidence": number},
    "company": {"value": string|null, "confidence": number},
    "supplier": {"value": string|null, "confidence": number},
    "customer": {"value": string|null, "confidence": number},
    "date": {"value": string|null (YYYY-MM-DD), "confidence": number},
    "due_date": {"value": string|null (YYYY-MM-DD), "confidence": number}
  },
  "invoice": {
    "invoice_number": {"value": string|null, "confidence": number},
    "reference_number": {"value": string|null, "confidence": number},
    "purchase_order": {"value": string|null, "confidence": number},
    "payment_terms": {"value": string|null, "confidence": number},
    "tax_number": {"value": string|null, "confidence": number},
    "vat_number": {"value": string|null, "confidence": number}
  },
  "financial": {
    "subtotal": {"value": number|null, "confidence": number},
    "discount": {"value": number|null, "confidence": number},
    "vat": {"value": number|null, "confidence": number},
    "tax": {"value": number|null, "confidence": number},
    "shipping": {"value": number|null, "confidence": number},
    "grand_total": {"value": number|null, "confidence": number}
  },
  "line_items": [
    {
      "product": {"value": string|null, "confidence": number},
      "quantity": {"value": number|null, "confidence": number},
      "unit_price": {"value": number|null, "confidence": number},
      "tax": {"value": number|null, "confidence": number},
      "total": {"value": number|null, "confidence": number}
    }
  ],
  "payment": {
    "payment_method": {"value": string|null, "confidence": number},
    "bank_details": {"value": string|null, "confidence": number},
    "mobile_money": {"value": string|null, "confidence": number},
    "reference_number": {"value": string|null, "confidence": number}
  }
}

confidence is your own calibrated certainty from 0 to 1 for that specific field, based on
legibility and unambiguity in the image — not a constant. Use null (never a placeholder
string) for anything not present on the document. Dates must be YYYY-MM-DD. Numbers must be
plain numbers, no currency symbols or thousands separators.`;

function flattenExtraction(parsed: any): {
  field_group: string;
  field_name: string;
  line_index: number | null;
  field_value: string | null;
  confidence: number;
}[] {
  const rows: {
    field_group: string;
    field_name: string;
    line_index: number | null;
    field_value: string | null;
    confidence: number;
  }[] = [];

  for (const group of Object.keys(FIELD_GROUPS)) {
    const groupData = parsed?.[group] ?? {};
    for (const field of FIELD_GROUPS[group]) {
      const cell = groupData?.[field];
      rows.push({
        field_group: group,
        field_name: field,
        line_index: null,
        field_value: cell?.value === null || cell?.value === undefined ? null : String(cell.value),
        confidence: typeof cell?.confidence === "number" ? clamp01(cell.confidence) : 0,
      });
    }
  }

  const lineItems = Array.isArray(parsed?.line_items) ? parsed.line_items : [];
  lineItems.forEach((item: any, idx: number) => {
    for (const field of LINE_ITEM_FIELDS) {
      const cell = item?.[field];
      rows.push({
        field_group: "line_item",
        field_name: field,
        line_index: idx,
        field_value: cell?.value === null || cell?.value === undefined ? null : String(cell.value),
        confidence: typeof cell?.confidence === "number" ? clamp01(cell.confidence) : 0,
      });
    }
  });

  return rows;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function fieldValue(rows: { field_name: string; field_value: string | null }[], name: string) {
  return rows.find((r) => r.field_name === name)?.field_value ?? null;
}

const ExtractInput = z.object({ documentId: z.string().uuid() });

export const extractDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExtractInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // RLS (is_company_member) scopes this to documents the caller can see.
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, company_id, file_path, mime_type, doc_type")
      .eq("id", data.documentId)
      .single();
    if (docErr || !doc) throw new Error("Document not found or you don't have access to it.");

    // Paid-plan enforcement (Professional and above). Runs before any
    // status change so a locked plan never leaves the doc in 'processing'.
    await assertFeature(supabase, { userId: context.userId, companyId: doc.company_id }, "documentAi");

    if (!doc.mime_type.startsWith("image/") && doc.mime_type !== "application/pdf") {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: "Unsupported file type. Upload a JPG, PNG, HEIC, or PDF.",
        })
        .eq("id", doc.id);
      throw new Error("Unsupported file type. Upload a JPG, PNG, HEIC, or PDF.");
    }

    await supabase.from("documents").update({ status: "processing" }).eq("id", doc.id);

    try {
      // Resolved INSIDE the try block deliberately: if no AI provider is
      // configured, this must still land in the catch below and mark the
      // document 'failed'. When this lived above the try (an earlier bug),
      // a missing key made this throw before the document ever left
      // 'uploaded' — the review workspace would then poll forever waiting
      // for a status change that could never come, showing an endless
      // "AI is reading the document…" spinner with no error surfaced.
      const provider = resolveAiProvider();
      const { data: file, error: dlErr } = await supabase.storage
        .from("documents")
        .download(doc.file_path);
      if (dlErr || !file) throw new Error(dlErr?.message ?? "Could not read the uploaded file.");

      const buf = Buffer.from(await file.arrayBuffer());

      let raw: string;
      if (doc.mime_type === "application/pdf") {
        const text = await extractPdfText(buf);
        if (text.replace(/\s/g, "").length < 20) {
          throw new Error(
            "This PDF doesn't contain a readable text layer (it looks like a scanned image saved as PDF). " +
              "Please upload it as a JPG or PNG instead so it can go through image extraction.",
          );
        }
        raw = await callGeminiText(text, EXTRACTION_PROMPT, provider);
      } else {
        const imageDataUrl = `data:${doc.mime_type};base64,${buf.toString("base64")}`;
        raw = await callGeminiVision([imageDataUrl], EXTRACTION_PROMPT, provider);
      }

      const parsed = extractJson(raw);
      const rows = flattenExtraction(parsed);

      const confidences = rows.filter((r) => r.field_value !== null).map((r) => r.confidence);
      const overallConfidence =
        confidences.length > 0
          ? Math.round((confidences.reduce((s, c) => s + c, 0) / confidences.length) * 1000) / 1000
          : 0;

      await supabase.from("document_extractions").delete().eq("document_id", doc.id);
      if (rows.length > 0) {
        const { error: insErr } = await supabase
          .from("document_extractions")
          .insert(rows.map((r) => ({ document_id: doc.id, ...r })));
        if (insErr) throw new Error(insErr.message);
      }

      // --- Phase 7: deterministic validation, not AI guesswork ---
      const validations: { check_name: string; severity: "info" | "warning" | "error"; message: string }[] = [];

      const subtotal = Number(fieldValue(rows, "subtotal"));
      const tax = Number(fieldValue(rows, "vat")) || Number(fieldValue(rows, "tax")) || 0;
      const shipping = Number(fieldValue(rows, "shipping")) || 0;
      const discount = Number(fieldValue(rows, "discount")) || 0;
      const grandTotal = Number(fieldValue(rows, "grand_total"));
      if (Number.isFinite(subtotal) && Number.isFinite(grandTotal)) {
        const expected = subtotal + tax + shipping - discount;
        if (Math.abs(expected - grandTotal) > 0.02) {
          validations.push({
            check_name: "math_mismatch",
            severity: "warning",
            message: `Subtotal + tax + shipping − discount (${expected.toFixed(2)}) doesn't match the grand total (${grandTotal.toFixed(2)}).`,
          });
        }
      }

      if (!fieldValue(rows, "supplier") && !fieldValue(rows, "company")) {
        validations.push({
          check_name: "missing_supplier",
          severity: "warning",
          message: "No supplier/company name was detected on this document.",
        });
      }

      const invoiceNumber = fieldValue(rows, "invoice_number");
      if (invoiceNumber) {
        const { data: dupes } = await supabase
          .from("document_extractions")
          .select("document_id, documents!inner(company_id, id)")
          .eq("field_name", "invoice_number")
          .eq("field_value", invoiceNumber)
          .neq("document_id", doc.id);
        const sameCompanyDupe = (dupes ?? []).some(
          (d: any) => d.documents?.company_id === doc.company_id,
        );
        if (sameCompanyDupe) {
          validations.push({
            check_name: "duplicate_invoice",
            severity: "error",
            message: `Invoice number "${invoiceNumber}" was already extracted from another document for this company.`,
          });
        }
      }

      const lowConfidenceCount = rows.filter((r) => r.field_value !== null && r.confidence < 0.6).length;
      if (lowConfidenceCount > 0) {
        validations.push({
          check_name: "low_confidence",
          severity: "info",
          message: `${lowConfidenceCount} field${lowConfidenceCount > 1 ? "s" : ""} were extracted with low confidence — please double-check before approving.`,
        });
      }

      await supabase.from("document_validations").delete().eq("document_id", doc.id);
      if (validations.length > 0) {
        await supabase
          .from("document_validations")
          .insert(validations.map((v) => ({ document_id: doc.id, ...v })));
      }

      await supabase
        .from("documents")
        .update({
          status: "needs_review",
          ai_model: "google/gemini-3-flash-preview",
          overall_confidence: overallConfidence,
          extracted_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", doc.id);

      return { ok: true as const, overallConfidence, fieldCount: rows.length, validationCount: validations.length };
    } catch (err) {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Extraction failed",
        })
        .eq("id", doc.id);
      throw err;
    }
  });

const ApproveInput = z.object({
  documentId: z.string().uuid(),
  expense: z.object({
    vendor_id: z.string().uuid(),
    account_id: z.string().uuid(),
    description: z.string().optional().default(""),
    amount: z.number(),
    expense_date: z.string(),
    currency: z.string().default("USD"),
    supplier_invoice_number: z.string().optional().nullable(),
  }),
});

// Approves a reviewed document: creates the real accounting record (an
// expense, for this MVP scope), links the document to it, and writes an
// audit_logs entry — reusing the audit_logs table that already exists
// rather than building a parallel history mechanism.
export const approveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ApproveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, company_id, status")
      .eq("id", data.documentId)
      .single();
    if (docErr || !doc) throw new Error("Document not found or you don't have access to it.");
    if (doc.status === "approved") throw new Error("This document was already approved.");

    const vendor = await supabase.from("vendors").select("name").eq("id", data.expense.vendor_id).single();
    const account = await supabase.from("accounts").select("name").eq("id", data.expense.account_id).single();

    const { data: expense, error: expErr } = await supabase
      .from("expenses")
      .insert({
        company_id: doc.company_id,
        user_id: auth.user.id,
        vendor_id: data.expense.vendor_id,
        vendor: vendor.data?.name ?? null,
        account_id: data.expense.account_id,
        category: account.data?.name ?? null,
        description: data.expense.description || null,
        amount: data.expense.amount,
        expense_date: data.expense.expense_date,
        currency: data.expense.currency,
        supplier_invoice_number: data.expense.supplier_invoice_number || null,
      } as never)
      .select("id")
      .single();
    if (expErr || !expense) throw new Error(expErr?.message ?? "Failed to create expense");

    await supabase
      .from("documents")
      .update({
        status: "approved",
        linked_table: "expenses",
        linked_id: expense.id,
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.user.id,
      })
      .eq("id", doc.id);

    await supabase.from("audit_logs").insert({
      company_id: doc.company_id,
      user_id: auth.user.id,
      action: "document_approved",
      entity_type: "documents",
      entity_id: doc.id,
      metadata: { linked_table: "expenses", linked_id: expense.id },
    });

    return { ok: true as const, expenseId: expense.id as string };
  });

const ApproveBillLineInput = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number(),
  tax_rate: z.number().default(0),
  account_id: z.string().uuid(),
});

const ApproveBillInput = z.object({
  documentId: z.string().uuid(),
  bill: z.object({
    vendor_id: z.string().uuid(),
    bill_number: z.string().min(1),
    reference: z.string().optional().nullable(),
    issue_date: z.string(),
    due_date: z.string().optional().nullable(),
    currency: z.string().default("USD"),
    notes: z.string().optional().nullable(),
    lines: z.array(ApproveBillLineInput).min(1),
  }),
});

// Bill counterpart to approveDocument. Bills are structurally different
// from expenses — a header plus N line items, each needing its own expense
// account — so this is a separate insert path rather than a shared one,
// but reuses the exact same document status/link/audit-log mechanics.
export const approveBillDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ApproveBillInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, company_id, status")
      .eq("id", data.documentId)
      .single();
    if (docErr || !doc) throw new Error("Document not found or you don't have access to it.");
    if (doc.status === "approved") throw new Error("This document was already approved.");

    const subtotal = data.bill.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
    const tax = data.bill.lines.reduce((s, l) => s + l.quantity * l.unit_price * (l.tax_rate / 100), 0);

    const { data: bill, error: billErr } = await supabase
      .from("bills")
      .insert({
        company_id: doc.company_id,
        user_id: auth.user.id,
        vendor_id: data.bill.vendor_id,
        bill_number: data.bill.bill_number,
        reference: data.bill.reference || null,
        issue_date: data.bill.issue_date,
        due_date: data.bill.due_date || null,
        currency: data.bill.currency,
        notes: data.bill.notes || null,
        subtotal,
        tax,
        total: subtotal + tax,
        status: "open",
      } as never)
      .select("id")
      .single();
    if (billErr || !bill) throw new Error(billErr?.message ?? "Failed to create bill");

    const items = data.bill.lines.map((l) => ({
      company_id: doc.company_id,
      user_id: auth.user.id,
      bill_id: (bill as { id: string }).id,
      account_id: l.account_id,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      tax_rate: l.tax_rate,
      amount: l.quantity * l.unit_price,
    }));
    const { error: itemsErr } = await supabase.from("bill_items").insert(items as never);
    if (itemsErr) throw new Error(itemsErr.message);

    // Touch the bill so the same status-change trigger that posts the
    // journal entry for the manual "New bill" flow fires here too.
    await supabase.from("bills").update({ status: "open" }).eq("id", (bill as { id: string }).id);

    await supabase
      .from("documents")
      .update({
        status: "approved",
        linked_table: "bills",
        linked_id: (bill as { id: string }).id,
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.user.id,
      })
      .eq("id", doc.id);

    await supabase.from("audit_logs").insert({
      company_id: doc.company_id,
      user_id: auth.user.id,
      action: "document_approved",
      entity_type: "documents",
      entity_id: doc.id,
      metadata: { linked_table: "bills", linked_id: (bill as { id: string }).id },
    });

    return { ok: true as const, billId: (bill as { id: string }).id };
  });

const RejectInput = z.object({ documentId: z.string().uuid(), reason: z.string().optional() });

const ApproveItemsInput = z.object({
  documentId: z.string().uuid(),
  items: z
    .array(
      z.object({
        type: z.enum(["product", "service"]),
        name: z.string().min(1),
        sku: z.string().optional().nullable(),
        category_id: z.string().uuid().optional().nullable(),
        price: z.number().nonnegative(),
        cost: z.number().nonnegative().default(0),
        tax_rate: z.number().nonnegative().default(0),
        currency: z.string().default("USD"),
      }),
    )
    .min(1),
});

// Bulk counterpart to approveDocument/approveBillDocument: a scanned price
// list or catalog produces N new items rather than one accounting record,
// so this is a bulk insert rather than a single row. linked_id stays null
// on the document (there's no single record to point at); the created
// item count and ids go in the audit log instead.
export const approveItemsDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ApproveItemsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, company_id, status")
      .eq("id", data.documentId)
      .single();
    if (docErr || !doc) throw new Error("Document not found or you don't have access to it.");
    if (doc.status === "approved") throw new Error("This document was already approved.");

    const rows = data.items.map((it) => ({
      company_id: doc.company_id,
      user_id: auth.user.id,
      type: it.type,
      name: it.name,
      sku: it.sku || null,
      category_id: it.category_id || null,
      price: it.price,
      cost: it.cost,
      tax_rate: it.tax_rate,
      currency: it.currency,
    }));
    const { data: created, error: itemsErr } = await supabase
      .from("items")
      .insert(rows as never)
      .select("id");
    if (itemsErr) throw new Error(itemsErr.message);

    await supabase
      .from("documents")
      .update({
        status: "approved",
        linked_table: "items",
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.user.id,
      })
      .eq("id", doc.id);

    await supabase.from("audit_logs").insert({
      company_id: doc.company_id,
      user_id: auth.user.id,
      action: "document_approved",
      entity_type: "documents",
      entity_id: doc.id,
      metadata: { linked_table: "items", item_ids: (created ?? []).map((r: any) => r.id), count: rows.length },
    });

    return { ok: true as const, count: rows.length };
  });

const ApproveEstimateLineInput = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number(),
  tax_rate: z.number().default(0),
});

const ApproveEstimateInput = z.object({
  documentId: z.string().uuid(),
  estimate: z.object({
    customer_id: z.string().uuid(),
    estimate_number: z.string().min(1),
    issue_date: z.string(),
    expiry_date: z.string().optional().nullable(),
    currency: z.string().default("USD"),
    notes: z.string().optional().nullable(),
    lines: z.array(ApproveEstimateLineInput).min(1),
  }),
});

// Sales counterpart to approveBillDocument. Where a scanned vendor bill
// produces a `bills` record, a scanned customer PO / order document
// produces an `estimates` record (a draft quote/order you can then send or
// convert to an invoice) — customers don't get billed automatically just
// because their PO was scanned.
export const approveEstimateDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ApproveEstimateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, company_id, status")
      .eq("id", data.documentId)
      .single();
    if (docErr || !doc) throw new Error("Document not found or you don't have access to it.");
    if (doc.status === "approved") throw new Error("This document was already approved.");

    const subtotal = data.estimate.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
    const tax = data.estimate.lines.reduce((s, l) => s + l.quantity * l.unit_price * (l.tax_rate / 100), 0);

    const { data: estimate, error: estErr } = await supabase
      .from("estimates")
      .insert({
        company_id: doc.company_id,
        user_id: auth.user.id,
        customer_id: data.estimate.customer_id,
        estimate_number: data.estimate.estimate_number,
        issue_date: data.estimate.issue_date,
        expiry_date: data.estimate.expiry_date || null,
        status: "draft",
        currency: data.estimate.currency,
        notes: data.estimate.notes || null,
        subtotal,
        tax,
        total: subtotal + tax,
      } as never)
      .select("id")
      .single();
    if (estErr || !estimate) throw new Error(estErr?.message ?? "Failed to create estimate");

    const items = data.estimate.lines.map((l) => ({
      company_id: doc.company_id,
      user_id: auth.user.id,
      estimate_id: (estimate as { id: string }).id,
      item_id: null,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      tax_rate: l.tax_rate,
      amount: l.quantity * l.unit_price,
    }));
    const { error: itemsErr } = await supabase.from("estimate_items").insert(items as never);
    if (itemsErr) throw new Error(itemsErr.message);

    await supabase
      .from("documents")
      .update({
        status: "approved",
        linked_table: "estimates",
        linked_id: (estimate as { id: string }).id,
        reviewed_at: new Date().toISOString(),
        reviewed_by: auth.user.id,
      })
      .eq("id", doc.id);

    await supabase.from("audit_logs").insert({
      company_id: doc.company_id,
      user_id: auth.user.id,
      action: "document_approved",
      entity_type: "documents",
      entity_id: doc.id,
      metadata: { linked_table: "estimates", linked_id: (estimate as { id: string }).id },
    });

    return { ok: true as const, estimateId: (estimate as { id: string }).id };
  });

export const rejectDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RejectInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");

    const { data: doc } = await supabase
      .from("documents")
      .select("id, company_id")
      .eq("id", data.documentId)
      .single();
    if (!doc) throw new Error("Document not found or you don't have access to it.");

    await supabase
      .from("documents")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: auth.user.id })
      .eq("id", data.documentId);

    await supabase.from("audit_logs").insert({
      company_id: doc.company_id,
      user_id: auth.user.id,
      action: "document_rejected",
      entity_type: "documents",
      entity_id: data.documentId,
      metadata: { reason: data.reason ?? null },
    });

    return { ok: true as const };
  });

export type DocType = (typeof DOC_TYPES)[number];
export { DOC_TYPES };
