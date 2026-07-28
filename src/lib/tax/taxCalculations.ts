import type { TaxSetting } from "@/types/tax.types";

/**
 * Pure, side-effect-free tax math. Kept separate from services/ so it can be
 * unit tested without touching Supabase.
 */

export interface TaxableLine {
  amount: number;
  taxRate: number;
}

/**
 * Given a line amount and rate, returns { taxable, tax } — handling both
 * tax-inclusive and tax-exclusive pricing, matching the same is_inclusive
 * flag already used by company_tax_settings and items.tax_rate.
 */
export function splitAmountAndTax(
  amount: number,
  ratePercent: number,
  isInclusive: boolean,
): { taxable: number; tax: number } {
  const rate = ratePercent / 100;
  if (rate <= 0) return { taxable: round2(amount), tax: 0 };

  if (isInclusive) {
    const taxable = amount / (1 + rate);
    return { taxable: round2(taxable), tax: round2(amount - taxable) };
  }

  const tax = amount * rate;
  return { taxable: round2(amount), tax: round2(tax) };
}

export function sumTaxableLines(
  lines: TaxableLine[],
  isInclusive: boolean,
): { taxable: number; tax: number } {
  return lines.reduce(
    (acc, line) => {
      const { taxable, tax } = splitAmountAndTax(line.amount, line.taxRate, isInclusive);
      return { taxable: round2(acc.taxable + taxable), tax: round2(acc.tax + tax) };
    },
    { taxable: 0, tax: 0 },
  );
}

/**
 * Net tax due for a return = output tax (collected on sales) minus input
 * tax (paid on purchases/expenses) — the standard VAT/GST net calculation.
 * For simple sales-tax-only jurisdictions, input tax will just be 0.
 */
export function calcNetTaxDue(outputTax: number, inputTax: number): number {
  return round2(outputTax - inputTax);
}

export function defaultTaxSetting(settings: TaxSetting[]): TaxSetting | undefined {
  return settings.find((s) => s.is_default && s.is_active) ?? settings.find((s) => s.is_active);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
