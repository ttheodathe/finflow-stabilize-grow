// Partner commission rules (matches the published Partner Program terms):
//   20%  for 1-10 qualified referrals
//   35%  for 11-49 qualified referrals
//   50%  for 50+ qualified referrals
//   Eligible commissions continue for up to 15 months per referred customer.
// Pure functions so the money rules are unit-tested.

export const STANDARD_PARTNER_RATE = 20;
export const COMMISSION_WINDOW_MONTHS = 15;

export function tierRateForReferralCount(qualifiedReferrals: number): number {
  if (qualifiedReferrals >= 50) return 50;
  if (qualifiedReferrals >= 11) return 35;
  return 20;
}

/**
 * Tier-1 rate for a partner. Partners on the standard 20% rate move up with
 * volume. A partner whose rate was set to any other value by staff (a negotiated
 * rate) keeps exactly that rate; the tiers never raise or lower it.
 */
export function resolveTier1Rate(partnerRate: number, qualifiedReferrals: number): number {
  if (partnerRate !== STANDARD_PARTNER_RATE) return partnerRate;
  return tierRateForReferralCount(qualifiedReferrals);
}

/** True while the referred customer's commission window is still open. */
export function isWithinCommissionWindow(
  firstCommissionAt: string | Date | null,
  now: Date = new Date(),
  months: number = COMMISSION_WINDOW_MONTHS,
): boolean {
  if (!firstCommissionAt) return true; // first paid order: window starts now
  const end = new Date(firstCommissionAt);
  if (Number.isNaN(end.getTime())) return true;
  end.setUTCMonth(end.getUTCMonth() + months);
  return now.getTime() <= end.getTime();
}
