/**
 * src/lib/invoice-pdf.ts
 *
 * Renders an invoice to a jsPDF document. This module is a pure renderer:
 *
 *   NEVER:
 *     - fetch()
 *     - FileReader
 *     - Image()
 *     - supabase.storage.createSignedUrl()
 *     - import anything from an "@/integrations/supabase/*" path
 *
 *   ONLY:
 *     - receives a fully-resolved `CompanyLogo | null` (see
 *       src/lib/company-logo.ts) from its caller
 *     - lays out text and calls `doc.addImage(...)`
 *
 * The caller (src/routes/_authenticated/invoices.tsx) owns resolving the
 * logo via `getCompanyLogo()` before calling `generateInvoicePdf()`.
 */

import { jsPDF } from "jspdf";
import type { CompanyLogo } from "@/lib/company-logo";
import { renderDocumentHeader, type DocumentHeaderCompany } from "@/lib/pdf/document-header";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
};

export type InvoiceCompany = DocumentHeaderCompany;

export type InvoiceCustomer = {
  name: string;
  address?: string | null;
  email?: string | null;
};

export type InvoiceDocument = {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string | null;
  currency: string;
  lineItems: InvoiceLineItem[];
  notes?: string | null;
};

export type GenerateInvoicePdfInput = {
  company: InvoiceCompany;
  companyLogo: CompanyLogo | null;
  customer: InvoiceCustomer;
  invoice: InvoiceDocument;
};

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const MARGIN_MM = 15;
const MAX_LOGO_WIDTH_MM = 110;
const MAX_LOGO_HEIGHT_MM = 60;

const TABLE_ROW_HEIGHT_MM = 7;
const TABLE_HEADER_HEIGHT_MM = 8;

// ---------------------------------------------------------------------------
// Structured logging (rendering-stage failures only — networking/validation
// failures are logged inside company-logo.ts, upstream of this module)
// ---------------------------------------------------------------------------

function logRenderError(stage: string, payload: Record<string, unknown>, error: unknown): void {
  // eslint-disable-next-line no-console
  console.error({
    scope: "invoice-pdf",
    stage,
    ...payload,
    error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    timestamp: new Date().toISOString(),
  });
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch (error) {
    logRenderError("format-currency", { amount, currency }, error);
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderCustomerBlock(doc: jsPDF, customer: InvoiceCustomer, startY: number): number {
  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(120, 120, 120);
  doc.text("BILL TO", MARGIN_MM, y);
  y += 5.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(customer.name, MARGIN_MM, y);
  y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(90, 90, 90);

  for (const line of [customer.address, customer.email].filter(
    (l): l is string => Boolean(l && l.trim().length > 0),
  )) {
    doc.text(line, MARGIN_MM, y);
    y += 5;
  }

  return y;
}

function renderInvoiceMetaBlock(doc: jsPDF, invoice: InvoiceDocument, startY: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - MARGIN_MM;
  let y = startY;

  const rows: Array<[string, string]> = [
    ["Invoice #", invoice.invoiceNumber],
    ["Issue Date", invoice.issueDate],
  ];
  if (invoice.dueDate) {
    rows.push(["Due Date", invoice.dueDate]);
  }

  doc.setFontSize(9.5);
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 120, 120);
    doc.text(label, rightX - 55, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(value, rightX, y, { align: "right" });
    y += 5.5;
  }
}

function renderLineItemsTable(doc: jsPDF, invoice: InvoiceDocument, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableRight = pageWidth - MARGIN_MM;
  const colDescX = MARGIN_MM;
  const colQtyX = tableRight - 85;
  const colPriceX = tableRight - 55;
  const colTotalX = tableRight;

  let y = startY;

  doc.setFillColor(245, 246, 248);
  doc.rect(MARGIN_MM, y, tableRight - MARGIN_MM, TABLE_HEADER_HEIGHT_MM, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const headerY = y + TABLE_HEADER_HEIGHT_MM - 2.5;
  doc.text("DESCRIPTION", colDescX + 2, headerY);
  doc.text("QTY", colQtyX, headerY, { align: "right" });
  doc.text("UNIT PRICE", colPriceX, headerY, { align: "right" });
  doc.text("AMOUNT", colTotalX, headerY, { align: "right" });

  y += TABLE_HEADER_HEIGHT_MM + 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(40, 40, 40);

  let subtotal = 0;
  let taxTotal = 0;

  for (const item of invoice.lineItems) {
    const lineSubtotal = item.quantity * item.unitPrice;
    const lineTax = lineSubtotal * ((item.taxRate ?? 0) / 100);
    subtotal += lineSubtotal;
    taxTotal += lineTax;

    doc.text(item.description, colDescX, y, { maxWidth: colQtyX - colDescX - 10 });
    doc.text(String(item.quantity), colQtyX, y, { align: "right" });
    doc.text(formatCurrency(item.unitPrice, invoice.currency), colPriceX, y, { align: "right" });
    doc.text(formatCurrency(lineSubtotal, invoice.currency), colTotalX, y, { align: "right" });
    y += TABLE_ROW_HEIGHT_MM;
  }

  doc.setDrawColor(225, 225, 225);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_MM, y + 1, tableRight, y + 1);
  y += 7;

  const total = subtotal + taxTotal;

  const totalsRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9.5);
    doc.setTextColor(bold ? 20 : 90, bold ? 20 : 90, bold ? 20 : 90);
    doc.text(label, colPriceX, y);
    doc.text(value, colTotalX, y, { align: "right" });
    y += bold ? 7 : 5.5;
  };

  totalsRow("Subtotal", formatCurrency(subtotal, invoice.currency));
  if (taxTotal > 0) {
    totalsRow("Tax", formatCurrency(taxTotal, invoice.currency));
  }
  totalsRow("Total Due", formatCurrency(total, invoice.currency), true);

  return y;
}

function renderNotes(doc: jsPDF, notes: string | null | undefined, startY: number): void {
  if (!notes || notes.trim().length === 0) return;

  let y = startY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(120, 120, 120);
  doc.text("NOTES", MARGIN_MM, y);
  y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(70, 70, 70);
  const pageWidth = doc.internal.pageSize.getWidth();
  const wrapped = doc.splitTextToSize(notes, pageWidth - MARGIN_MM * 2);
  doc.text(wrapped, MARGIN_MM, y);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Renders a complete invoice PDF and returns the jsPDF instance. Purely
 * synchronous layout work — no I/O of any kind.
 */
export function generateInvoicePdf(input: GenerateInvoicePdfInput): jsPDF {
  const { company, companyLogo, customer, invoice } = input;

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let cursorY: number;
  try {
    cursorY = renderDocumentHeader(doc, company, companyLogo, {
      documentTitle: "INVOICE",
      maxLogoWidth: MAX_LOGO_WIDTH_MM,
      maxLogoHeight: MAX_LOGO_HEIGHT_MM,
      marginMm: MARGIN_MM,
    });
  } catch (error) {
    // renderDocumentHeader already falls back to text-only internally on
    // addImage failures; this catch only guards against a truly unexpected
    // layout exception so the invoice still renders with a minimal header
    // rather than throwing away the whole PDF.
    logRenderError("header", { invoiceNumber: invoice.invoiceNumber }, error);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("INVOICE", MARGIN_MM, 25);
    cursorY = 35;
  }

  cursorY += 8;

  const afterCustomerY = renderCustomerBlock(doc, customer, cursorY);
  renderInvoiceMetaBlock(doc, invoice, cursorY);

  const tableStartY = afterCustomerY + 10;
  const afterTableY = renderLineItemsTable(doc, invoice, tableStartY);

  renderNotes(doc, invoice.notes, afterTableY);

  return doc;
}

/**
 * Convenience wrapper matching the common "generate and download" call site.
 */
export function downloadInvoicePdf(input: GenerateInvoicePdfInput, filename?: string): void {
  const doc = generateInvoicePdf(input);
  const name = filename ?? `invoice-${input.invoice.invoiceNumber}.pdf`;
  doc.save(name);
}
