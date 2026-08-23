import { supabase } from "@/integrations/supabase/client";
import { getRates, convert } from "@/lib/fx";

/**
 * Locks the exchange rate between a transaction's own currency and the
 * company's reporting currency (companies.currency), at the moment a
 * transaction is saved. Returns rate=1 when currencies match, or when the
 * company/company currency can't be resolved — same-currency behavior is
 * unaffected either way, and reports treat rate=1 identically to how they
 * always have.
 *
 * Callers store both the rate and the resulting base_currency_amount on
 * the transaction row, so later reports never need to re-fetch a rate —
 * they just use what was locked in at the time, exactly as real accounting
 * software requires (a rate move next week shouldn't silently reprice a
 * transaction from last month).
 */
export async function lockExchangeRate(
  companyId: string | null,
  transactionCurrency: string,
): Promise<{ rate: number; companyCurrency: string }> {
  if (!companyId) return { rate: 1, companyCurrency: transactionCurrency };

  const { data: company } = await supabase
    .from("companies")
    .select("currency")
    .eq("id", companyId)
    .maybeSingle();
  const companyCurrency = (company as { currency?: string } | null)?.currency || "USD";

  if (!transactionCurrency || transactionCurrency === companyCurrency) {
    return { rate: 1, companyCurrency };
  }

  try {
    const { rates } = await getRates(companyCurrency);
    const rate = convert(1, transactionCurrency, companyCurrency, rates);
    return { rate: rate > 0 ? rate : 1, companyCurrency };
  } catch {
    // Live rate fetch failed — fall back to 1:1 rather than blocking the
    // save. The transaction still records its own currency correctly;
    // only the base_currency_amount conversion is skipped this time.
    return { rate: 1, companyCurrency };
  }
}
