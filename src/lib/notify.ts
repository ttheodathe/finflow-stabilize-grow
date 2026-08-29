import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "invoice_paid"
  | "invoice_overdue"
  | "weekly_summary"
  | "partner_commission"
  | "team_invitation";

/**
 * Notifies every active member of a company (optionally excluding the user
 * who triggered the event, so you don't notify yourself for your own
 * action). Writes directly to the notifications table — this is the same
 * table the bell dropdown reads from, so any event wired through here
 * shows up there immediately.
 */
export async function notifyCompanyMembers(
  companyId: string,
  payload: { type: NotificationType; title: string; body?: string; link?: string },
  opts?: { excludeUserId?: string },
) {
  const { data: members, error } = await supabase
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("status", "active");
  if (error || !members) return;

  const rows = members
    .filter((m) => m.user_id !== opts?.excludeUserId)
    .map((m) => ({
      company_id: companyId,
      user_id: m.user_id,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
    }));
  if (rows.length === 0) return;

  await (supabase as any).from("notifications").insert(rows);
}
