import { supabase } from "@/integrations/supabase/client";
import { PartnerServiceError } from "@/types/partner.types";

export interface PartnerApiKey {
  id: string;
  partner_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function listApiKeys(partnerId: string): Promise<PartnerApiKey[]> {
  const { data, error } = await supabase
    .from("partner_api_keys")
    .select("id, partner_id, name, key_prefix, last_used_at, revoked_at, created_at")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (error) throw new PartnerServiceError("FETCH_API_KEYS_FAILED", error.message);
  return (data ?? []) as PartnerApiKey[];
}

/**
 * Creates a new key and returns the plaintext exactly once — the caller
 * must show it to the user immediately, since only the hash is persisted.
 */
export async function createApiKey(
  partnerId: string,
  name: string,
): Promise<{ plaintextKey: string }> {
  const raw = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const plaintextKey = `ffpk_${raw}`;
  const keyHash = await sha256Hex(plaintextKey);
  const keyPrefix = plaintextKey.slice(0, 12);

  const { error } = await supabase
    .from("partner_api_keys")
    .insert({ partner_id: partnerId, name, key_hash: keyHash, key_prefix: keyPrefix });

  if (error) throw new PartnerServiceError("CREATE_API_KEY_FAILED", error.message);
  return { plaintextKey };
}

export async function revokeApiKey(keyId: string): Promise<void> {
  const { error } = await supabase
    .from("partner_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId);

  if (error) throw new PartnerServiceError("REVOKE_API_KEY_FAILED", error.message);
}
