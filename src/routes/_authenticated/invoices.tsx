/**
 * src/routes/_authenticated/invoices.tsx
 *
 * The invoice route OWNS image loading: it resolves the company logo once
 * via `getCompanyLogo()` and passes the plain, pre-resolved `CompanyLogo`
 * value into the PDF generator. `invoice-pdf.ts` never fetches anything.
 *
 * NOTE: this file focuses on the data-loading -> logo-resolution -> PDF
 * pipeline called out in the refactor brief. Wire in your existing
 * table/filter/search UI around `<InvoicesPage />` as needed — the shape of
 * `loadInvoiceForPdf()` below is what matters for the objective ("remove
 * every image-processing responsibility from this route, load the logo via
 * getCompanyLogo(), pass CompanyLogo into the generator").
 */

import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyLogo, type CompanyLogo } from "@/lib/company-logo";
import {
  downloadInvoicePdf,
  type GenerateInvoicePdfInput,
  type InvoiceCompany,
  type InvoiceCustomer,
  type InvoiceDocument,
} from "@/lib/invoice-pdf";

export const Route = createFileRoute("/_authenticated/invoices")({
  component: InvoicesPage,
});

// ---------------------------------------------------------------------------
// Row shapes returned from Supabase (adjust to match your actual schema)
// ---------------------------------------------------------------------------

type CompanyRow = {
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
};

type CustomerRow = {
  name: string;
  address: string | null;
  email: string | null;
};

type InvoiceLineItemRow = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  notes: string | null;
  company: CompanyRow;
  customer: CustomerRow;
  line_items: InvoiceLineItemRow[];
};

// ---------------------------------------------------------------------------
// Logging (route-level: data-loading failures, not image-pipeline internals
// — company-logo.ts already logs its own stage-by-stage detail)
// ---------------------------------------------------------------------------

function logRouteError(stage: string, payload: Record<string, unknown>, error: unknown): void {
  // eslint-disable-next-line no-console
  console.error({
    scope: "invoices-route",
    stage,
    ...payload,
    error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    timestamp: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function fetchInvoiceForPdf(invoiceId: string): Promise<InvoiceRow> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      id,
      invoice_number,
      issue_date,
      due_date,
      currency,
      notes,
      company:companies ( name, address, email, phone, website, logo_url ),
      customer:customers ( name, address, email ),
      line_items:invoice_line_items ( description, quantity, unit_price, tax_rate )
    `,
    )
    .eq("id", invoiceId)
    .single();

  if (error || !data) {
    logRouteError("fetch-invoice", { invoiceId }, error ?? new Error("Invoice not found"));
    throw new Error(`Unable to load invoice ${invoiceId}`);
  }

  return data as unknown as InvoiceRow;
}

/**
 * Assembles the fully-resolved `GenerateInvoicePdfInput`. This is the one
 * place image loading happens for invoices — it calls `getCompanyLogo()`
 * exactly once and hands the result straight to the (network-free) PDF
 * generator.
 */
async function buildInvoicePdfInput(invoiceId: string): Promise<GenerateInvoicePdfInput> {
  const invoiceRow = await fetchInvoiceForPdf(invoiceId);

  // The image pipeline lives entirely in company-logo.ts. This call may hit
  // the network (public URL) or Supabase Storage (private path, with signed
  // URL caching) — invoice-pdf.ts never knows or cares which.
  const companyLogo: CompanyLogo | null = await getCompanyLogo(invoiceRow.company.logo_url);

  const company: InvoiceCompany = {
    name: invoiceRow.company.name,
    address: invoiceRow.company.address,
    email: invoiceRow.company.email,
    phone: invoiceRow.company.phone,
    website: invoiceRow.company.website,
  };

  const customer: InvoiceCustomer = {
    name: invoiceRow.customer.name,
    address: invoiceRow.customer.address,
    email: invoiceRow.customer.email,
  };

  const invoice: InvoiceDocument = {
    invoiceNumber: invoiceRow.invoice_number,
    issueDate: invoiceRow.issue_date,
    dueDate: invoiceRow.due_date,
    currency: invoiceRow.currency,
    notes: invoiceRow.notes,
    lineItems: invoiceRow.line_items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      taxRate: item.tax_rate ?? 0,
    })),
  };

  return { company, companyLogo, customer, invoice };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function InvoicesPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = useCallback(async (invoiceId: string) => {
    setDownloadingId(invoiceId);
    setDownloadError(null);

    try {
      const pdfInput = await buildInvoicePdfInput(invoiceId);
      downloadInvoicePdf(pdfInput);
    } catch (error) {
      logRouteError("generate-pdf", { invoiceId }, error);
      setDownloadError("Couldn't generate that invoice PDF. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Invoices</h1>
      </div>

      {downloadError && (
        <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {downloadError}
        </div>
      )}

      {/*
        Existing invoice list/table UI goes here. Each row's "Download PDF"
        action should call handleDownload(invoice.id) — e.g.:

        <button
          onClick={() => handleDownload(invoice.id)}
          disabled={downloadingId === invoice.id}
        >
          {downloadingId === invoice.id ? "Generating…" : "Download PDF"}
        </button>
      */}
    </div>
  );
}
