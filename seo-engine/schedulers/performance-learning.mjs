import { readFile, writeFile, mkdir } from "node:fs/promises";
import { collectPartial } from "../collect.mjs";
import { resolveDateRange } from "../normalize.mjs";
import { createSupabaseSeoStoreFromEnv } from "../persistence/supabase-store.mjs";

const OUTPUT = process.env.SEO_OUTPUT_DIR || "seo-output";

function sumKnown(rows, key) {
  if (rows.length === 0) return 0;
  const values = rows.map(row => row[key]).filter(Number.isFinite);
  return values.length ? values.reduce((sum,value)=>sum+value,0) : null;
}

export async function runPerformanceLearning({
  dateRange = resolveDateRange(), collectFn = collectPartial,
  outputDir = OUTPUT, env = process.env,
} = {}) {
  await mkdir(outputDir, { recursive: true });
  let snapshot = null;
  let collectionError = null;
  let sourceFile = null;
  try {
    const result = await collectFn({ dateRange, outputDir });
    sourceFile = result.file;
    snapshot = JSON.parse(await readFile(result.file, "utf8"));
  } catch (error) {
    collectionError = String(error.message || error);
  }

  const gscAvailable = Boolean(snapshot?.gsc && snapshot.sourceStatus?.gsc !== "UNAVAILABLE");
  const ga4Available = Array.isArray(snapshot?.ga4) && snapshot.sourceStatus?.ga4Sessions !== "UNAVAILABLE" && snapshot.sourceStatus?.ga4 !== "UNAVAILABLE";
  const ga4EventsAvailable = Array.isArray(snapshot?.ga4Events) && snapshot.sourceStatus?.ga4Events !== "UNAVAILABLE";
  const search = gscAvailable ? {
    status: "AVAILABLE",
    clicks: sumKnown(sn¶»§q«^tˆô°(€€€‘…Ñ…EÕ…±¥Ñäèì(€€€€€½±±•Ñ¥½¹MÑ…ÑÕÌèÍÙ…¥±…‰±”€˜˜„ÑÙ…¥±…‰±”€˜˜„ÑÙ•¹ÑÍÙ…¥±…‰±”(€€€€€€€€ü€‰=5A1Qˆ(€€€€€€€€è€¡ÍÙ…¥±…‰±”ñð„ÑÙ…¥±…‰±”ñð„ÑÙ•¹ÑÍÙ…¥±…‰±”€ü€‰AIQ%0ˆ€è€‰%1ˆ¤°(€€€€€Í½ÕÉ•MÑ…ÑÕÌèÍ¹…ÁÍ¡½Ðü¹Í½ÕÉ•MÑ…ÑÕÌñðìÍŒè€‰U9Y%1	1ˆ°„Ðè€‰U9Y%1	1ˆô°(€€€€€Í½ÕÉ•ÉÉ½ÉÌèÍ¹…ÁÍ¡½Ðü¹Í½ÕÉ•ÉÉ½ÉÌñð¹Õ±°°(€€€€€•ÉÉ½Èè½±±•Ñ¥½¹ÉÉ½È°(€€€€€¥¹Ñ•ÉÁÉ•Ñ…Ñ¥½¸è€‰U¹…Ù…¥±…‰±”Ù…±Õ•Ì…É”¹Õ±°ì„ÍÕ•ÍÍ™Õ±±äÉ•ÑÉ¥•Ù•é•É¼¥ÌÉ•Á½ÉÑ•…Ìé•É¼¸ˆ°(€€€ô°(€€€±¥µ¥Ñ…Ñ¥½¹Ìèl(€€€€€€‰Ð‘…Ñ„¥Ì…É•…Ñ”°¹½ÐÕÍ•Èµ±•Ù•°¸ˆ°(€€€€€€‰M±¥­Ì…¹ÐÍ•ÍÍ¥½¹Ì…É”‘¥™™•É•¹Ðµ•…ÍÕÉ•Ì¸ˆ°(€€€€€€‰9¼…ÕÍ…°…ÑÑÉ¥‰ÕÑ¥½¸¥Ì¥¹™•ÉÉ•¸ˆ°(€€€€€€‰Q¡”ÁÉ½‘ÕÑ¥½¸•áÁ•¹Í•ÌÑ…‰±”¡…Ì¹¼ÍÑ…ÑÕÌ½É•Ù•ÉÍ…°½±Õµ¸ìÁ•ÉÍ¥ÍÑ••áÁ•¹Í”É½ÝÌ…É”ÑÉ•…Ñ•…ÌÅÕ…±¥™å¥¹œ°…¹¡…Éµ‘•±•Ñ•É½ÝÌ…É”…‰Í•¹Ð¸ˆ°(€€€t°(€ôì(€±•ÐÍÑ½É”€ô¹Õ±°ì(€±•ÐÍÑ½É•½¹™¥ÕÉ…Ñ¥½¹ÉÉ½È€ô¹Õ±°ì(€½¹ÍÐÁ•ÉÍ¥ÍÑ•¹•I•ÅÕ¥É•€ô•¹Ø¹M=}AIM%MQ9}IEU%I€ôôô€‰ÑÉÕ”ˆñð•¹Ø¹%Q!U	}Q%=9L€ôôô€‰ÑÉÕ”ˆì(€ÑÉäìÍÑ½É”€ôÉ•…Ñ•MÕÁ…‰…Í•M•½MÑ½É•É½µ¹Ø¡•¹Ø¤ìô(€…Ñ €¡•ÉÉ½È¤ìÍÑ½É•½¹™¥ÕÉ…Ñ¥½¹ÉÉ½È€ôMÑÉ¥¹œ¡•ÉÉ½È¹µ•ÍÍ…”ñð•ÉÉ½È¤ìô(€±•ÐÁ•ÉÍ¥ÍÑ•¹”€ôÍÑ½É”(€€€€üìÍÑ…ÑÕÌè€‰A9%9ˆ°Í¡•‘Õ±•ÉIÕ¹%è¹Õ±°ô(€€€€èÍÑ½É•½¹™¥ÕÉ…Ñ¥½¹ÉÉ½È(€€€€€€üìÍÑ…ÑÕÌè€‰	1=-ˆ°É•…Í½¸è€‰AQ9}AI=)Q}UI}=I}I9Q%1Lˆ°Í¡•‘Õ±•ÉIÕ¹%è¹Õ±°°•ÉÉ½ÈèÍÑ½É•½¹™¥ÕÉ…Ñ¥½¹ÉÉ½Èô(€€€€€€èìÍÑ…ÑÕÌè€‰9=Q}=9%UIˆ°Í¡•‘Õ±•ÉIÕ¹%è¹Õ±°ôì(€¥˜€¡ÍÑ½É”¤ì(€€€½¹ÍÐÍ¡•‘Õ±•‘½È€ô¹•Ü…Ñ” ¤¹Ñ½%M=MÑÉ¥¹œ ¤¹Í±¥” À°€ÄÂÚîÆ­y×W&f÷&Öæ6R×&W÷'Bæ§6öæ°¢v—Bw&—FTf–ÆR‡F‚Â¥4ôâç7G&–æv–g’‡&W÷'BÂçVÆÂÂ"’²%Æâ"Â²fÆs¢'r"Ò“°¢–b€¢VçbÓÓÒ&ö6W72æVçbb`¢‡&W÷'BæFFVÆ—G’æ6öÆÆV7F–öå7FGW2ÓÓÒ$d”ÄTB"ÇÀ¢‡W'6—7FVæ6U&WV—&VBbbW'6—7FVæ6Rç7FGW2ÓÒ%U%4•5DTB"’¢’&ö6W72æW†—D6öFRÒ°¢&WGW&â°¢F‚Â6V&6…7FGW3¢6V&6‚ç7FGW2ÂæÇ—F–757FGW3¢æÇ—F–72ç7FGW2À¢WfVçDæÇ—F–757FGW3¢WfVçDæÇ—F–72ç7FGW2À¢6öÆÆV7F–öå7FGW3¢&W÷'BæFFVÆ—G’æ6öÆÆV7F–öå7FGW2À¢&öGV7D7V—6—F–öã¢&W÷'Bç&öGV7D7V—6—F–öâç7FGW2À¢W'6—7FVæ6U7FGW3¢W'6—7FVæ6Rç7FGW2À¢W'6—7FVæ6U&WV—&VBÀ¢Ó°§Ð ¦–b†–×÷'BæÖWFçW&ÂÓÓÒæWrU$Â‡&ö6W72æ&we³ÒÂ&f–ÆS¢"’æ‡&Vb’°¢G'’²&ö6W72ç7FF÷WBçw&—FR„¥4ôâç7G&–æv–g’†v—B'VåW&f÷&Öæ6TÆV&æ–ær‚’ÂçVÆÂÂ"’²%Æâ"“²Ð¢6F6‚†W'&÷"’²6öç6öÆRæW'&÷"†66†VGVÆW"2f–ÆVBFòw&—FR—G2&W÷'C¢G¶W'&÷"æÖW76vWÖ“²&ö6W72æW†—D6öFRÒ²Ð§Ð 