import { useEffect, useState } from "react";

/**
 * Reads the currently active company id.
 *
 * This mirrors the source of truth already used by AppSidebar
 * (src/components/app-sidebar.tsx): the id is persisted in
 * localStorage under "currentCompanyId" and updates are broadcast
 * via a "company-changed" CustomEvent when the user switches
 * companies from the sidebar switcher.
 *
 * Returns null until a company is known (e.g. on first load before
 * AppSidebar has resolved the user's companies) — callers should
 * treat a null companyId as "loading" and gate dependent queries
 * with `enabled: Boolean(companyId)`.
 */
export function useActiveCompanyId(): string | null {
  const [companyId, setCompanyId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("currentCompanyId") : null,
  );

  useEffect(() => {
    function handleCompanyChanged(event: Event) {
      const detail = (event as CustomEvent<{ companyId: string }>).detail;
      if (detail?.companyId) setCompanyId(detail.companyId);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === "currentCompanyId") setCompanyId(event.newValue);
    }

    window.addEventListener("company-changed", handleCompanyChanged);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("company-changed", handleCompanyChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return companyId;
}
