import { supabase as _sb } from "@/integrations/supabase/client";
const supabase = _sb as any;
import type { Permission, SeatUsage } from "@/types/team.types";
import { TeamServiceError } from "@/types/team.types";

/** Full permission catalog (global, same for every company). */
export async function listAllPermissions(): Promise<Permission[]> {
  const { data, error } = await supabase
    .from("permissions")
    .select("*")
    .order("category", { ascending: true })
    .order("label", { ascending: true });

  if (error) throw new TeamServiceError("FETCH_PERMISSIONS_FAILED", error.message);
  return (data ?? []) as Permission[];
}

/** Permission keys granted to a given role. */
export async function listPermissionsForRole(roleId: string): Promise<Permission[]> {
  const { data, error } = await supabase
    .from("role_permissions")
    .select("permission:permissions(*)")
    .eq("role_id", roleId);

  if (error) throw new TeamServiceError("FETCH_ROLE_PERMISSIONS_FAILED", error.message);
  return (data ?? []).map((row: any) => row.permission) as Permission[];
}

/** Set of permission keys the current user holds within a company. Used by usePermissions. */
export async function getCurrentUserPermissionKeys(companyId: string): Promise<Set<string>> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id;
  if (!userId) return new Set();

  const { data, error } = await supabase
    .from("company_members")
    .select("role:roles(role_permissions(permission:permissions(key)))")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new TeamServiceError("FETCH_USER_PERMISSIONS_FAILED", error.message);
  if (!data) return new Set();

  const role = (data as any).role;
  const keys: string[] =
    role?.role_permissions?.map((rp: any) => rp.permission?.key).filter(Boolean) ?? [];
  return new Set(keys);
}

export async function getSeatUsage(companyId: string): Promise<SeatUsage> {
  const [{ data: usedData, error: usedError }, { data: limitData, error: limitError }] =
    await Promise.all([
      supabase.rpc("get_company_seat_usage", { p_company_id: companyId }),
      supabase.rpc("get_company_seat_limit", { p_company_id: companyId }),
    ]);

  if (usedError) throw new TeamServiceError("FETCH_SEAT_USAGE_FAILED", usedError.message);
  if (limitError) throw new TeamServiceError("FETCH_SEAT_LIMIT_FAILED", limitError.message);

  return { used: (usedData as number) ?? 0, limit: (limitData as number | null) ?? null };
}
