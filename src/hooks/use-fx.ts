import { useEffect, useState } from "react";
import { getRates } from "@/lib/fx";

export function useFxRates(base = "USD") {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    getRates(base)
      .then((c) => {
        if (alive) setRates(c.rates);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [base]);
  return { rates, loading };
}
