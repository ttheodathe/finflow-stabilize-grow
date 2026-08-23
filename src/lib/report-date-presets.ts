import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  subQuarters,
  subYears,
  format,
} from "date-fns";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

export type RangePreset =
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "last-quarter"
  | "this-year"
  | "last-year"
  | "custom";

export const RANGE_PRESET_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-quarter", label: "This quarter" },
  { value: "last-quarter", label: "Last quarter" },
  { value: "this-year", label: "This year (YTD)" },
  { value: "last-year", label: "Last year" },
  { value: "custom", label: "Custom range" },
];

/** Returns { from, to } for a range preset, or null for "custom" (caller keeps existing dates). */
export function resolveRangePreset(preset: RangePreset): { from: string; to: string } | null {
  const now = new Date();
  switch (preset) {
    case "this-month":
      return { from: iso(startOfMonth(now)), to: iso(now) };
    case "last-month": {
      const d = subMonths(now, 1);
      return { from: iso(startOfMonth(d)), to: iso(endOfMonth(d)) };
    }
    case "this-quarter":
      return { from: iso(startOfQuarter(now)), to: iso(now) };
    case "last-quarter": {
      const d = subQuarters(now, 1);
      return { from: iso(startOfQuarter(d)), to: iso(endOfQuarter(d)) };
    }
    case "this-year":
      return { from: iso(startOfYear(now)), to: iso(now) };
    case "last-year": {
      const d = subYears(now, 1);
      return { from: iso(startOfYear(d)), to: iso(endOfYear(d)) };
    }
    case "custom":
    default:
      return null;
  }
}

export type AsOfPreset = "today" | "end-last-month" | "end-last-quarter" | "end-last-year" | "custom";

export const AS_OF_PRESET_OPTIONS: { value: AsOfPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "end-last-month", label: "End of last month" },
  { value: "end-last-quarter", label: "End of last quarter" },
  { value: "end-last-year", label: "End of last year" },
  { value: "custom", label: "Custom date" },
];

/** Returns an ISO date for an as-of preset, or null for "custom" (caller keeps existing date). */
export function resolveAsOfPreset(preset: AsOfPreset): string | null {
  const now = new Date();
  switch (preset) {
    case "today":
      return iso(now);
    case "end-last-month":
      return iso(endOfMonth(subMonths(now, 1)));
    case "end-last-quarter":
      return iso(endOfQuarter(subQuarters(now, 1)));
    case "end-last-year":
      return iso(endOfYear(subYears(now, 1)));
    case "custom":
    default:
      return null;
  }
}
