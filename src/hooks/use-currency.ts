import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cached: string | null = null;
const listeners = new Set<(c: string) => void>();

export function setDefaultCurrency(code: string) {
  cached = code;
  listeners.forEach((fn) => fn(code));
}

export function useDefaultCurrency() {
  const [currency, setCurrency] = useState<string>(cached ?? "USD");

  useEffect(() => {
    const listener = (c: string) => setCurrency(c);
    listeners.add(listener);
    if (cached === null) {
      (async () => {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;
        const { data } = await supabase
          .from("profiles")
          .select("default_currency")
          .eq("id", u.user.id)
          .maybeSingle();
        const code = (data?.default_currency as string) || "USD";
        setDefaultCurrency(code);
      })();
    }
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return currency;
}
