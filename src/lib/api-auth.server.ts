// Server-only helpers for authenticated API routes (never imported by browser code).
// Used by /api/send-invoice and /api/send-invitation so that only a signed-in member
// of the right company can trigger an email from the FinFlowTrack domain.

// biome-ignore lint/suspicious/noExplicitAny: admin client is loosely typed in server routes
type Admin = any;

export const SITE_URL = process.env.PUBLIC_SITE_URL || "https://www.finflowtrack.com";

export type AuthedCaller = { userId: string; email: string | null; admin: Admin };

/** Verifies the Supabase access token sent as "Authorization: Bearer <token>". */
export async function authenticate(request: Request): Promise<AuthedCaller | Response> {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as Admin;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return Response.json({ error: "Invalid session" }, { status: 401 });

  return { userId: data.user.id, email: data.user.email ?? null, admin };
}

/** The caller's active role key in a company, or null if they are not an active member. */
export async function getActiveRoleKey(
  admin: Admin,
  userId: string,
  companyId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("company_members")
    .select("status, role:roles(key)")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const role = Array.isArray(data.role) ? data.role[0] : data.role;
  return (role?.key as string | undefined) ?? "member";
}

/** True if the caller holds the permission key through their role in that company. */
export async function hasCompanyPermission(
  admin: Admin,
  userId: string,
  companyId: string,
  permissionKey: string,
): Promise<boolean> {
  const { data } = await admin
    .from("company_members")
    .select("role:roles(key, role_permissions(permission:permissions(key)))")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return false;
  const role = Array.isArray(data.role) ? data.role[0] : data.role;
  if (role?.key === "owner" || role?.key === "admin") return true;
  const keys: string[] =
    role?.role_permissions?.map((rp: { permission?: { key?: string } }) => rp.permission?.key) ??
    [];
  return keys.includes(permissionKey);
}
