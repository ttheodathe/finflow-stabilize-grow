/**
 * Browser-only acquisition attribution. First touch is immutable; last touch
 * advances only when a source is actually known. Unknown/direct visits never
 * get guessed as organic or overwrite a previously known source.
 */

const VISITOR_ID_KEY = "ffVisitorId";
const PENDING_REFERRAL_KEY = "pendingReferralCode";
const FIRST_TOUCH_KEY = "ffFirstTouch";
const LAST_TOUCH_KEY = "ffLastTouch";

export type AttributionTouchpoint = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  landingPage: string;
  referrerHost: string | null;
  referralCode: string | null;
  timestamp: string;
};

function safeAttributionValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(trimmed)) return null;
  if (trimmed.includes("@") || /\d{7,}/.test(trimmed)) return null;
  return trimmed;
}

export function buildAttributionTouchpoint(input: {
  href: string;
  referrer?: string | null;
  now?: string;
}): AttributionTouchpoint {
  const url = new URL(input.href);
  const params = url.searchParams;
  const utmSource = safeAttributionValue(params.get("utm_source"));
  const utmMedium = safeAttributionValue(params.get("utm_medium"));
  const campaign = safeAttributionValue(params.get("utm_campaign"));
  let referrerHost: string | null = null;
  try {
    if (input.referrer) {
      const candidate = new URL(input.referrer);
      if (candidate.hostname.toLowerCase() !==¶»§q«^u±…¹‘¥¹}Á…”è…¹…±åÑ¥Í1…¹‘¥¹A…”¡™¥ÉÍĞü¹±…¹‘¥¹A…”¤°(€€€™¥ÉÍÑ}Ñ½Õ¡}Ñ¥µ•ÍÑ…µÀè™¥ÉÍĞü¹Ñ¥µ•ÍÑ…µÀñğ€‰Õ¹­¹½İ¸ˆ°(€€€™¥ÉÍÑ}Ñ½Õ¡}É•™•ÉÉ…°è™¥ÉÍĞü¹É•™•ÉÉ…±½‘”ñğ€‰Õ¹­¹½İ¸ˆ°(€€€±…ÍÑ}Ñ½Õ¡}Í½ÕÉ”è±…ÍĞü¹Í½ÕÉ”ñğ€‰Õ¹­¹½İ¸ˆ°(€€€±…ÍÑ}Ñ½Õ¡}µ•‘¥Õ´è±…ÍĞü¹µ•‘¥Õ´ñğ€‰Õ¹­¹½İ¸ˆ°(€€€±…ÍÑ}Ñ½Õ¡}…µÁ…¥¸è±…ÍĞü¹…µÁ…¥¸ñğ€‰Õ¹­¹½İ¸ˆ°(€€€±…ÍÑ}Ñ½Õ¡}±…¹‘¥¹}Á…”è…¹…±åÑ¥Í1…¹‘¥¹A…”¡±…ÍĞü¹±…¹‘¥¹A…”¤°(€€€±…ÍÑ}Ñ½Õ¡}Ñ¥µ•ÍÑ…µÀè±…ÍĞü¹Ñ¥µ•ÍÑ…µÀñğ€‰Õ¹­¹½İ¸ˆ°(€€€±…ÍÑ}Ñ½Õ¡}É•™•ÉÉ…°è±…ÍĞü¹É•™•ÉÉ…±½‘”ñğ€‰Õ¹­¹½İ¸ˆ°(€€€…ÑÑÉ¥‰ÕÑ¥½¹}½¹™¥‘•¹”è™¥ÉÍĞü¹Í½ÕÉ”€˜˜±…ÍĞü¹Í½ÕÉ”(€€€€€€ü€‰­¹½İ¸ˆ(€€€€€€è™¥ÉÍĞü¹Í½ÕÉ”ñğ±…ÍĞü¹Í½ÕÉ”€ü€‰Á…ÉÑ¥…°ˆ€è€‰Õ¹­¹½İ¸ˆ°(€ôì)ô()•áÁ½ÉĞ™Õ¹Ñ¥½¸•Ñ=ÉÉ•…Ñ•Y¥Í¥Ñ½É% ¤èÍÑÉ¥¹œì(€¥˜€¡ÑåÁ•½˜İ¥¹‘½Ü€ôôô€‰Õ¹‘•™¥¹•ˆ¤É•ÑÕÉ¸€ˆˆì(€ÑÉäì(€€€±•Ğ¥€ô±½…±MÑ½É…”¹•Ñ%Ñ•´¡Y%M%Q=I}%}-d¤ì(€€€¥˜€ …¥¤ì(€€€€€¥€ôÉåÁÑ¼¹É…¹‘½µUU% ¤ì(€€€€€±½…±MÑ½É…”¹Í•Ñ%Ñ•´¡Y%M%Q=I}%}-d°¥¤ì(€€€ô(€€€É•ÑÕÉ¸¥ì(€ô…Ñ ì(€€€É•ÑÕÉ¸€ˆˆì(€ô)ô()•áÁ½ÉĞ™Õ¹Ñ¥½¸•ÑA•¹‘¥¹I•™•ÉÉ…±½‘” ¤èÍÑÉ¥¹œğ¹Õ±°ì(€¥˜€¡ÑåÁ•½˜İ¥¹‘½Ü€ôôô€‰Õ¹‘•™¥¹•ˆ¤É•ÑÕÉ¸¹Õ±°ì(€ÑÉäìÉ•ÑÕÉ¸±½…±MÑ½É…”¹•Ñ%Ñ•´¡A9%9}III1}-d¤ìô(€…Ñ ìÉ•ÑÕÉ¸¹Õ±°ìô)ô()•áÁ½ÉĞ™Õ¹Ñ¥½¸±•…ÉA•¹‘¥¹I•™•ÉÉ…±½‘” ¤èÙ½¥ì(€¥˜€¡ÑåÁ•½˜İ¥¹‘½Ü€ôôô€‰Õ¹‘•™¥¹•ˆ¤É•ÑÕÉ¸ì(€ÑÉäì±½…±MÑ½É…”¹É•µ½Ù•%Ñ•´¡A9%9}III1}-d¤ìô(€…Ñ ì€¼¨MÑ½É…”µ…ä‰”Õ¹…Ù…¥±…‰±”ì…ÑÑÉ¥‰ÕÑ¥½¸µÕÍĞ¹½Ğ‰±½¬İ½É­™±½İÌ¸€¨¼ô)ô((¼¨¨(€¨…ÁÑÕÉ”Ñ¡”ÕÉÉ•¹Ğ±…¹‘¥¹œÑ½Õ ±½…±±ä¸%˜„Á…ÉÑ¹•È½‘”¥ÌÁÉ•Í•¹Ğ°(€¨…±Í¼É•½ÉÑ¡”–ÚîÆ­y