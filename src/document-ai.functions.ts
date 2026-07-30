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

async function callGeminiVision(imageDataUrl: string, prompt: string, key: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract structured data from this document." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("AI rate limit reached. Please retry in a moment.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Upgrade your plan to continue processing documents.");
    throw new Error(`AI gateway error (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return String(json.choices?.[0]?.message?.content ?? "");
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
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { supabase } = context;

    // RLS (is_company_member) scopes this to documents the caller can see.
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, company_id, file_path, mime_type, doc_type")
      .eq("id", data.documentId)
      .single();
    if (docErr || !doc) throw new Error("Document not found or you don't have access to it.");

    if (!doc.mime_type.startsWith("image/")) {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message:
            "Only image files (JPG/PNG/HEIC) are supported for extraction today. PDF page-rasterization is on the roadmap.",
        })
        .eq("id", doc.id);
      throw new Error("Only image files (JPG/PNG/HEIC) are supported for extraction today.");
    }

    await supabase.from("documents").update({ status: "processing" }).eq("id", doc.id);

    try {
      const { data: file, error: dlErr } = await supabase.storage
        .from("documents")
        .download(doc.file_path);
      if (dlErr || !file) throw new Error(dlErr?.message ?? "Could not read the uploaded file.");

      const buf = Buffer.from(await file.arrayBuffer());
      const imageDataUrl = `data:${doc.mime_type};base64,${buf.toString("base64")}`;

      const raw = await callGeminiVision(imageDataUrl, EXTRACTION_PROMPT, key);
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

const RejectInput = z.object({ documentId: z.string().uuid(), reason: z.string().optional() });

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
