/**
 * Every list view in the app filters rows with `.eq("company_id", companyId)`.
 * Inserts therefore MUST carry the active company id, otherwise the row is
 * written but never shows up again ("Created" toast + empty table).
 *
 * These helpers read the same source of truth as useActiveCompanyId /
 * AppSidebar (localStorage "currentCompanyId"), so they can be used from any
 * nested form component without threading props.
 */
export function getActiveCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("currentCompanyId");
}

/** Adds company_id to a single insert payload (does not overwrite an explicit one). */
export function withCompany<T extends Record<string, any>>(payload: T): T {
  const companyId = getActiveCompanyId();
  if (!companyId || payload?.company_id) return payload;
  return { ...payload, company_id: companyId };
}

/** Adds company_id to every row of a bulk insert payload. */
export function withCompanyAll<T extends Record<string, any>>(rows: T[]): T[] {
  return rows.map((r) => withCompany(r));
}
