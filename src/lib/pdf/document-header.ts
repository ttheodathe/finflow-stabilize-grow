/**
 * src/lib/pdf/document-header.ts
 *
 * Renders the "modern accounting software" header shared by every generated
 * document (invoices, quotes, purchase orders, receipts, delivery notes):
 *
 *   LOGO            COMPANY NAME
 *                    Address
 *                    Email
 *                    Phone
 *                    Website
 *   ------------------------------------
 *   <DOCUMENT TITLE>
 *
 * This module is pure rendering — jsPDF in, jsPDF out. It never fetches,
 * never talks to Supabase, and never knows a `CompanyLogo` came from a
 * network request. Callers (invoice-pdf.ts, quote-pdf.ts, purchase-order-pdf.ts,
 * receipt-pdf.ts, delivery-note-pdf.ts, ...) resolve the logo up front via
 * `getCompanyLogo()` in `src/lib/company-logo.ts` and pass the plain
 * `CompanyLogo | null` value in here.
 */

import type { jsPDF } from "jspdf";
import type { CompanyLogo } from "@/lib/company-logo";

export type DocumentHeaderCompany = {
  name: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
};

export type DocumentHeaderOptions = {
  /** e.g. "INVOICE", "QUOTE", "PURCHASE ORDER", "RECEIPT", "DELIVERY NOTE" */
  documentTitle: string;
  /** Maximum logo box, in mm. Defaults match company-logo.ts defaults (110x60). */
  maxLogoWidth?: number;
  maxLogoHeight?: number;
  /** Left/right page margin in mm. Default 15. */
  marginMm?: number;
};

const DEFAULT_MAX_LOGO_WIDTH_MM = 110;
const DEFAULT_MAX_LOGO_HEIGHT_MM = 60;
const DEFAULT_MARGIN_MM = 15;

const HEADER_TOP_MM = 15;
const LOGO_TEXT_GAP_MM = 8;
const LINE_HEIGHT_MM = 5.5;
const RULE_GAP_MM = 6;
const TITLE_GAP_MM = 10;

/**
 * Renders the shared header and returns the Y coordinate (mm) immediately
 * below it, so the calling generator knows where to start drawing the
 * document body (line items, totals, etc.).
 */
export function renderDocumentHeader(
  doc: jsPDF,
  company: DocumentHeaderCompany,
  companyLogo: CompanyLogo | null,
  options: DocumentHeaderOptions,
): number {
  const margin = options.marginMm ?? DEFAULT_MARGIN_MM;
  const maxLogoWidth = options.maxLogoWidth ?? DEFAULT_MAX_LOGO_WIDTH_MM;
  const maxLogoHeight = options.maxLogoHeight ?? DEFAULT_MAX_LOGO_HEIGHT_MM;
  const pageWidth = doc.internal.pageSize.getWidth();

  let logoRenderWidth = 0;
  let logoRenderHeight = 0;

  if (companyLogo) {
    // Fit within the max box while preserving the image's own aspect ratio
    // (companyLogo.width/height already reflect the pre-scaled asset, but we
    // clamp again here defensively in case a generator passes a raw logo).
    const scale = Math.min(
      maxLogoWidth / companyLogo.width,
      maxLogoHeight / companyLogo.height,
      1,
    );
    logoRenderWidth = companyLogo.width * scale;
    logoRenderHeight = companyLogo.height * scale;

    try {
      doc.addImage(
        companyLogo.dataUrl,
        companyLogo.format,
        margin,
        HEADER_TOP_MM,
        logoRenderWidth,
        logoRenderHeight,
      );
    } catch (error) {
      // Rendering failures here are a jsPDF/asset problem, not a networking
      // one (the asset already round-tripped through company-logo.ts). Log
      // structured detail and fall back to text-only — never throw and
      // never leave a blank header.
      // eslint-disable-next-line no-console
      console.error({
        scope: "document-header",
        stage: "addImage",
        format: companyLogo.format,
        width: companyLogo.width,
        height: companyLogo.height,
        error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
        timestamp: new Date().toISOString(),
      });
      logoRenderWidth = 0;
      logoRenderHeight = 0;
    }
  }

  // Company name / contact block sits to the right of the logo, or flush
  // left if there is no logo — never leaves the header visually empty.
  const textBlockX = logoRenderWidth > 0 ? margin + logoRenderWidth + LOGO_TEXT_GAP_MM : margin;
  let cursorY = HEADER_TOP_MM + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(company.name, textBlockX, cursorY);
  cursorY += LINE_HEIGHT_MM + 1.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(90, 90, 90);

  const contactLines = [company.address, company.email, company.phone, company.website].filter(
    (line): line is string => Boolean(line && line.trim().length > 0),
  );

  for (const line of contactLines) {
    doc.text(line, textBlockX, cursorY);
    cursorY += LINE_HEIGHT_MM;
  }

  // Header block height is whichever is taller: the logo, or the text stack.
  const headerBottom = Math.max(HEADER_TOP_MM + logoRenderHeight, cursorY);

  const ruleY = headerBottom + RULE_GAP_MM;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.4);
  doc.line(margin, ruleY, pageWidth - margin, ruleY);

  const titleY = ruleY + TITLE_GAP_MM;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(options.documentTitle, margin, titleY);

  return titleY + LINE_HEIGHT_MM;
}
