// Live FX rates via exchangerate.host (free, no key). Cached 6h in localStorage.
const CACHE_KEY = "fx-rates-v1";
const TTL_MS = 6 * 60 * 60 * 1000;

type Cache = { base: string; ts: number; rates: Record<string, number> };

let inflight: Promise<Cache> | null = null;

async function fetchRates(base = "USD"): Promise<Cache> {
  const res = await fetch(`https://api.exchangerate.host/latest?base=${base}`);
  if (!res.ok) throw new Error("FX fetch failed");
  const j = await res.json();
  const rates = (j?.rates ?? {}) as Record<string, number>;
  rates[base] = 1;
  return { base, ts: Date.now(), rates };
}

export async function getRates(base = "USD"): Promise<Cache> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const c = JSON.parse(raw) as Cache;
        if (
          c.base === base &&
          Date.now() - c.ts < TTL_MS &&
          c.rates &&
          Object.keys(c.rates).length > 5
        )
          return c;
      }
    } catch {}
  }
  if (!inflight) {
    inflight = fetchRates(base)
      .then((c) => {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(c));
        } catch {}
        return c;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function convert(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number {
  if (!amount || from === to) return amount || 0;
  const rFrom = rates[from];
  const rTo = rates[to];
  if (!rFrom || !rTo) return amount; // fallback: as-is
  // rates are relative to base; amount in `from` -> base -> `to`
  return (amount / rFrom) * rTo;
}
