import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collect, collectPartial } from "./collect.mjs";
import { runPerformanceLearning } from "./schedulers/performance-learning.mjs";

const dateRange = { startDate: "2026-11-17", endDate: "2026-11-18" };
const ok = (body) => new Response(JSON.stringify(body), { status: 200 });
const denied = () => new Response("provider unavailable", { status: 403 });

test("partial collector preserves GSC when GA4 is unavailable", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "seo-partial-"));
  try {
    const result = await collectPartial({
      dateRange, token: "test-token", outputDir,
      fetchImpl: async (url) => String(url).includes("analyticsdata.googleapis.com") ? denied() : ok({ rows: [] }),
    });
    const snapshot = JSON.parse(await readFile(result.file, "utf8"));
    assert.deepEqual(snapshot.sourceStatus, { gsc: "AVAILABLE", ga4: "UNAVAILABLE", ga4Sessions: "UNAVAILABLE", ga4Events: "UNAVAILABLE" });
    assert.equal(snapshot.gsc.pages.length, 0);
    assert.equal(snapshot.ga4, null);
    assert.match(snapshot.sourceErrors.ga4, /HTTP 403/);
    assert.equal(snapshot.counts.ga4Rows, null);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("partial collector preserves GA4 when GSC is unavailable", async () => {
  cons¶»§q«^t‘…Ñ•I…¹”±½ÕÑÁÕÑ¥È±•¹Øéíô°(€€½±±•Ñ¸é…Íå¹Œ¡í½ÕÑÁÕÑ¥Èé‘¥Éô¤ôùì(€€€½¹ÍÐ™¥±”õÁ…Ñ ¹©½¥¸¡‘¥È°‰™¥áÑÕÉ”µ¹Õ±°¹©Í½¸ˆ¤ì(€€€½¹ÍÐÍ¹…ÁÍ¡½ÐõíÍ½ÕÉ•MÑ…ÑÕÌéíÍŒè‰Y%1	1ˆ±„Ðè‰Y%1	1‰ô±Í½ÕÉ•ÉÉ½ÉÌéíÍŒé¹Õ±°±„Ðé¹Õ±±ô°(€€€€ÍŒéíÁ…•Ìémí±¥­Ìé¹Õ±°±¥µÁÉ•ÍÍ¥½¹Ìé¹Õ±±õuô±„ÐémíÍ•ÍÍ¥½¹Ìé¹Õ±°±•¹…•‘M•ÍÍ¥½¹Ìé¹Õ±±õuôì(€€€…Ý…¥ÐÝÉ¥Ñ•¥±”¡™¥±”±)M=8¹ÍÑÉ¥¹¥™ä¡Í¹…ÁÍ¡½Ð¤¤íÉ•ÑÕÉ¸í™¥±•ôì(€€ô°(€ô¤ì(€½¹ÍÐÉ•Á½ÉÐõ)M=8¹Á…ÉÍ”¡…Ý…¥ÐÉ•…‘¥±”¡É•ÍÕ±Ð¹Á…Ñ °‰ÕÑ˜àˆ¤¤ì(€…ÍÍ•ÉÐ¹•ÅÕ…°¡É•Á½ÉÐ¹Í•…É ¹±¥­Ì±¹Õ±°¤í…ÍÍ•ÉÐ¹•ÅÕ…°¡É•Á½ÉÐ¹Í•…É ¹¥µÁÉ•ÍÍ¥½¹Ì±¹Õ±°¤í…ÍÍ•ÉÐ¹•ÅÕ…°¡É•Á½ÉÐ¹Í•…É ¹ÑÈ±¹Õ±°¤ì(€…ÍÍ•ÉÐ¹•ÅÕ…°¡É•Á½ÉÐ¹…¹…±åÑ¥Ì¹½É…¹¥M•ÍÍ¥½¹Ì±¹Õ±°¤í…ÍÍ•ÉÐ¹•ÅÕ…°¡É•Á½ÉÐ¹…¹…±åÑ¥Ì¹•¹…•‘M•ÍÍ¥½¹Ì±¹Õ±°¤í…ÍÍ•ÉÐ¹•ÅÕ…°¡É•Á½ÉÐ¹…¹…±åÑ¥Ì¹•¹…•µ•¹ÑI…Ñ”±¹Õ±°¤ì(õ™¥¹…±±åí…Ý…¥ÐÉ´¡½ÕÑÁÕÑ¥È±íÉ•ÕÉÍ¥Ù”éÑÉÕ”±™½É”éÑÉÕ•ô¤íô)ô¤ì()Ñ•ÍÐ ‰M¡•‘Õ±•È€Ì•µ¥ÑÌÁ…ÉÑ¥…°µ•ÑÉ¥ÌÉ•Á½ÉÐÝ¡•¸…•ÁÑ…¹”µÁÉ½©•ÐÕ…É‰±½­ÌÁ•ÉÍ¥ÍÑ•¹”ˆ±…Íå¹Œ ¤ôùì(½¹ÍÐ½ÕÑÁÕÑ¥Èõ…Ý…¥Ðµ­‘Ñ•µÀ¡Á…Ñ ¹©½¥¸¡½Ì¹ÑµÁ‘¥È ¤°‰Í•¼µÁ•É™½Éµ…¹”µÕ…É´ˆ¤¤ì(ÑÉåì(€½¹ÍÐÉ•ÍÕ±Ðõ…Ý…¥ÐÉÕ¹A•É™½Éµ…¹•1•…É¹¥¹œ¡ì(€€‘…Ñ•I…¹”±½ÕÑÁÕÑ¥È°(€€•¹Øéì(€€€M=}=AM}11=]}AI=)Q}Iè‰‰Õ™‰å™ÝÍÑ‘ÅÙÝ¹­¡åÉ•„ˆ°(€€€MUA	M}UI0è‰¡ÑÑÁÌè¼½ÁÉ½‘ÕÑ¥½¸µÁÉ½©•Ð¹ÍÕÁ…‰…Í”¹¼ˆ°(€€€MUA	M}MIY%}I=1}-dè‰Ñ•ÍÐµ­•äˆ°(€€ô°(€€½±±•Ñ¸é…Íå¹Œ¡í½ÕÑÁÕÑ¥Èé‘¥Éô¤ôùì(€€€½¹ÍÐ™¥±”õÁ…Ñ ¹©½¥¸¡‘¥È°‰™¥áÑÕÉ”µÕ…É¹©Í½¸ˆ¤ì(€€€½¹ÍÐÍ¹…ÁÍ¡½Ðõì(€€€€Í½ÕÉ•MÑ…ÑÕÌéíÍŒè‰Y%1	1ˆ±„Ðè‰U9Y%1	1‰ô°(€€€€Í½ÕÉ•ÉÉ½ÉÌéíÍŒé¹Õ±°±„Ðè‰ÐÕ¹…Ù…¥±…‰±”‰ô°(€€€€ÍŒéíÁ…•Ìémí±¥­ÌèÌ±¥µÁÉ•ÍÍ¥½¹ÌèÊÚîÆ­yÒWfVçD6÷VçC¢"ÂF÷FÅW6W'3¢"ÒÂ²WfVçDæÖS¢&Æöv–â"ÂWfVçD6÷VçC¢2ÂF÷FÅW6W'3¢"ÕÒÀ¢Ó°¢v—Bw&—FTf–ÆR†f–ÆRÂ¥4ôâç7G&–æv–g’‡6æ6†÷B’“°¢&WGW&â²f–ÆRÓ°¢ÒÀ¢Ò“°¢6öç7B&W÷'BÒ¥4ôâç'6R†v—B&VDf–ÆR‡&W7VÇBçF‚Â'WFc‚"’“°¢76W'BæWVÂ‡&W7VÇBæWfVçDæÇ—F–757FGW2Â$d”Ä$ÄR"“°¢76W'BæWVÂ‡&W÷'BæWfVçDæÇ—F–72ç7FGW2Â$d”Ä$ÄR"“°¢76W'BæWVÂ‡&W÷'BæWfVçDæÇ—F–72æWfVçG2æf–æB‚†WfVçB’ÓâWfVçBæWfVçDæÖRÓÓÒ'6–vå÷W"’æWfVçD6÷VçBÂ"“°¢76W'BæWVÂ‡&W÷'BæFFVÆ—G’æ6öÆÆV7F–öå7FGW2Â$4ôÕÄUDR"“°¢Òf–æÆÇ’°¢v—B&Ò†÷WGWDF—"Â²&V7W'6—fS¢G'VRÂf÷&6S¢G'VRÒ“°¢Ð§Ò“° §FW7B‚%66†VGVÆW"2Ö&·266WFæ6RW'6—7FVæ6R2&WV—&VB–âv—D‡V"7F–öç2æB&Æö6·2Ö—76–ær7&VFVçF–Ç2"Â7–æ2‚’Óâ°¢6öç7B÷WGWDF—"Òv—BÖ¶GFV×‡F‚æ¦ö–â†÷2çF×F—"‚’Â'6Vò×W&f÷&Öæ6R×&WV—&VBÒ"’“°¢G'’°¢6öç7B&W7VÇBÒv—B'VåW&f÷&Öæ6TÆV&æ–ær‡°¢FFU&ævRÂ÷WGWDF—"ÂVçc¢²t•D…T%ô5D”ôå3¢'G'VR"ÒÀ¢6öÆÆV7Dfã¢7–æ2‡²÷WGWDF—#¢F—"Ò’Óâ°¢6öç7Bf–ÆRÒF‚æ¦ö–â†F—"Â&f—‡GW&R×&WV—&VBæ§6öâ"“°¢6öç7B6æ6†÷BÒ°¢6÷W&6U7FGW3¢²w63¢$d”Ä$ÄR"ÂvC¢$d”Ä$ÄR"ÂvE6W76–öç3¢$d”Ä$ÄR"ÂvDWfVçG3¢$d”Ä$ÄR"ÒÀ¢6÷W&6TW'&÷'3¢²w63¢çVÆÂÂvC¢çVÆÂÒÀ¢w63¢²vW3¢µÒÒÂvC¢µÒÂvDWfVçG3¢µÒÀ¢Ó°¢v—Bw&—FTf–ÆR†f–ÆRÂ¥4ôâç7G&–æv–g’‡6æ6†÷B’“°¢&WGW&â²f–ÆRÓ°¢ÒÀ¢Ò“°¢6öç7B&W÷'BÒ¥4ôâç'6R†v—B&VDf–ÆR‡&W7VÇBçF‚Âkºwµç