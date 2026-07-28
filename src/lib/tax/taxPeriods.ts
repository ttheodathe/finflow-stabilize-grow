import type { TaxFilingFrequency } from "@/types/tax.types";

export interface GeneratedPeriod {
  period_start: string; // yyyy-mm-dd
  period_end: string; // yyyy-mm-dd
  due_date: string; // yyyy-mm-dd
}

/**
 * Generates the tax periods for one fiscal year, starting from
 * fiscalYearStartMonth (1-12, matches company_settings.fiscal_year_start_month),
 * based on the tax setting's filing_frequency. Due date defaults to the
 * period end + dueDaysAfter (typically 15-30 days depending on jurisdiction —
 * caller passes the right value, we don't hardcode a jurisdiction default).
 */
export function generatePeriodsForYear(
  year: number,
  fiscalYearStartMonth: number,
  frequency: TaxFilingFrequency,
  dueDaysAfter: number,
): GeneratedPeriod[] {
  const startMonthIndex = clampMonth(fiscalYearStartMonth) - 1; // 0-based
  const periods: GeneratedPeriod[] = [];

  const chunkSizeMonths = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
  const chunkCount = 12 / chunkSizeMonths;

  for (let i = 0; i < chunkCount; i++) {
    const chunkStart = new Date(Date.UTC(year, startMonthIndex + i * chunkSizeMonths, 1));
    const chunkEnd = new Date(
      Date.UTC(year, startMonthIndex + (i + 1) * chunkSizeMonths, 0), // last day of prior month
    );
    const dueDate = new Date(chunkEnd);
    dueDate.setUTCDate(dueDate.getUTCDate() + dueDaysAfter);

    periods.push({
      period_start: toISODate(chunkStart),
      period_end: toISODate(chunkEnd),
      due_date: toISODate(dueDate),
    });
  }

  return periods;
}

/** Finds which generated period a given date falls into, if any. */
export function findPeriodForDate(
  date: Date,
  periods: GeneratedPeriod[],
): GeneratedPeriod | undefined {
  const t = date.getTime();
  return periods.find((p) => {
    const start = new Date(p.period_start).getTime();
    const end = new Date(p.period_end).getTime();
    return t >= start && t <= end;
  });
}

function clampMonth(month: number): number {
  if (month < 1 || month > 12) return 1;
  return month;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
