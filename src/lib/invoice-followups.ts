export type InvoiceContactChannel = "email" | "phone" | "whatsapp" | "sms" | "in_person" | "other";

export type InvoiceSilenceStatus = "draft" | "sent" | "partial" | "overdue" | "paid" | string;

/** Relative date label used by invoice lists and follow-up history. */
export function formatRelativeContact(
  contactedAt: string | null | undefined,
  now = new Date(),
): string {
  if (!contactedAt) return "Never";

  const date = new Date(contactedAt);
  if (Number.isNaN(date.getTime())) return "Never";

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const contactDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.floor((today - contactDay) / 86_400_000);

  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

/**
 * Silence is meaningful only for unpaid invoices that have been sent.
 * A recorded follow-up takes precedence over the original sent timestamp.
 */
export function getDaysSilent(
  status: InvoiceSilenceStatus,
  lastContactAt: string | null | undefined,
  sentAt: string | null | undefined,
  now = new Date(),
): number | null {
  if (!["sent", "partial", "overdue"].includes(status)) return null;

  const baseline = lastContactAt || sentAt;
  if (!baseline) return null;

  const date = new Date(baseline);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const baselineDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  return Math.max(0, Math.floor((today - baselineDay) / 86_400_000));
}

/** Converts a Date to the local value expected by an HTML datetime-local input. */
export function toLocalDateTimeInput(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
