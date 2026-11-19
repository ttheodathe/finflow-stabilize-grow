export function normalizePageUrl(input) {
  const url = new URL(input);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP(S) page URLs can be normalized.");
  }
  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase().replace(/^www\\./, "");
  url.search = "";
  url.hash = "";
  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\\/+$/, "");
  }
  return url.toString();
}

export function isoDateDaysAgo(days, now = new Date()) {
  if (!Number.isInteger(days) || days < 0) throw new Error("days must be a non-negative integer.");
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function resolveDateRange({ startDate, endDate, now = new Date() } = {}) {
  const end = endDate || isoDateDaysAgo(3, now);
  const start = startDate || isoDateDaysAgo(30, now);
  const valid = /^\\d{4}-\\d{2}-\\d{2}$/;
  if (!valid.test(start) || !valid.test(end) || start > end) {
    throw new Error("Use a valid inclusive date range: YYYY-MM-DD, with startDate no later than endDate.");
  }
  return { startDate: start, endDate: end };
}
