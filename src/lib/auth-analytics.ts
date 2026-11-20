type SignupUser = {
  identities?: Array<{ provider?: string | null }> | null;
} | null | undefined;

/**
 * Supabase may return an obfuscated user with no identities for an existing
 * email address. Only a returned email identity is evidence of a new signup.
 */
export function isNewEmailSignup(user: SignupUser): boolean {
  return Array.isArray(user?.identities) && user.identities.some((identity) => identity?.provider === "email");
}

/**
 * Deduplicate OAuth SIGNED_IN notifications for the same user/session in this
 * page lifetime. The user ID is only used as a local in-memory key, never sent
 * to analytics.
 */
export function shouldTrackOAuthAuthentication(
  userId: string | null | undefined,
  expiresAt: number | null | undefined,
  seen: Set<string>,
): boolean {
  if (!userId) return false;
  const key = userId + ":" + (expiresAt ?? "unknown");
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}
