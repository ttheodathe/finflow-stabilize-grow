import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collect, collectPartial, collectGa4, collectGa4Events } from "./collect.mjs";
import { resolveDateRange } from "./normalize.mjs";

const ok = () => new Response(JSON.stringify({ rows: [] }), { status: 200 });

test("collect defaults to a concrete date range when callers omit it", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "seo-default-range-"));
  try {
    const expected = resolveDateRange();
    const requests = [];
    const result = await collect({
      token: "fixture-token",
      outputDir,
      fetchImpl: async (url) => { requests.push(String(url)); return ok(); },
    });
    assert.deepEqual(result.dateRange, expected);
    assert.ok(result.file.endsWith("seo-data-" + expected.startDate + "-to-" + expected.endDate + ".json"));
    const snapshot = JSON.parse(await readFile(result.file, "utf8"));
    assert.deepEqual(snapshot.dateRange, expected);
    assert.equal(requests.filter(url => url.includes("googleapis.com/webmasters")).length, 6);
    assert.equal(requests.filter(url => url.includes("analyticsdata.googleapis.com")).length, 2);
    assert.equal(snapshot.sourceStatus.ga4, "AVAILABLE");
    assert.deepEqual(snapshot.ga4Events, []);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("collectPartial default¶»§q«^t°ìÍÑ…ÑÕÌè€ÈÀÀô¤¤°(€€€€½½µ¥ÑÑ•É½ÝÌÝ¥Ñ¡½ÕÐ½¹™¥Éµ¥¹œ…¸•µÁÑäÉ•ÍÕ±Ð¼°(€€¤ì)ô¤ì()Ñ•ÍÐ ‰Ð•Ù•¹ÐÉ•Á½ÉÐÉ•ÑÉ¥•ÌÑÉ…¹Í¥•¹Ð!QQ@™…¥±ÕÉ•ÌÝ¥Ñ •áÁ½¹•¹Ñ¥…°‰…­½™˜ˆ°…Íå¹Œ€ ¤€ôøì(€±•Ð…ÑÑ•µÁÑÌ€ô€Àì(€½¹ÍÐ‘•±…åÌ€ômtì(€½¹ÍÐÉ•Á½ÉÐ€ô…Ý…¥Ð½±±•Ñ„ÑÙ•¹ÑÌ (€€€€‰™¥áÑÕÉ”µÑ½­•¸ˆ°(€€€ìÍÑ…ÉÑ…Ñ”è€ˆÈÀÈØ´ÄÄ´ÀÄˆ°•¹‘…Ñ”è€ˆÈÀÈØ´ÄÄ´ÀÈˆô°(€€€…Íå¹Œ€ ¤€ôøì(€€€€€…ÑÑ•µÁÑÌ€¬ô€Äì(€€€€€¥˜€¡…ÑÑ•µÁÑÌ€ôôô€Ä¤É•ÑÕÉ¸¹•ÜI•ÍÁ½¹Í” ‰Ñ•µÁ½É…Éäˆ°ìÍÑ…ÑÕÌè€ÔÀÌô¤ì(€€€€€É•ÑÕÉ¸¹•ÜI•ÍÁ½¹Í”¡)M=8¹ÍÑÉ¥¹¥™ä¡ìÉ½ÝÌèmtô¤°ìÍÑ…ÑÕÌè€ÈÀÀô¤ì(€€€ô°(€€€…Íå¹Œ€¡µÌ¤€ôø‘•±…åÌ¹ÁÕÍ ¡µÌ¤°(€€¤ì(€…ÍÍ•ÉÐ¹•ÅÕ…°¡…ÑÑ•µÁÑÌ°€È¤ì(€…ÍÍ•ÉÐ¹‘••ÁÅÕ…°¡‘•±…åÌ°lÔÀÁt¤ì(€…ÍÍ•ÉÐ¹‘••ÁÅÕ…°¡É•Á½ÉÐ¹É½ÝÌ°mt¤ì)ô¤ì()Ñ•ÍÐ ‰Á…ÉÑ¥…°½±±•Ñ¥½¸ÁÉ•Í•ÉÙ•ÌÍ•ÍÍ¥½¸‘…Ñ„…¹µ…É­Ì™…¥±••Ù•¹ÐÉ•Á½ÉÑ¥¹œ…ÌÁ…ÉÑ¥…°ˆ°…Íå¹Œ€ ¤€ôøì(€½¹ÍÐ½ÕÑÁÕÑ¥È€ô…Ý…¥Ðµ­‘Ñ•µÀ¡Á…Ñ ¹©½¥¸¡½Ì¹ÑµÁ‘¥È ¤°€‰Í•¼µ„ÐµÁ…ÉÑ¥…°´ˆ¤¤ì(€ÑÉäì(€€€½¹ÍÐÉ•ÍÕ±Ð€ô…Ý…¥Ð½±±•ÑA…ÉÑ¥…°¡ì(€€€€€‘…Ñ•I…¹”èìÍÑ…ÉÑ…Ñ”è€ˆÈÀÈØ´ÄÄ´ÀÄˆ°•¹‘…Ñ”è€ˆÈÀÈØ´ÄÄ´ÀÈˆô°(€€€€€Ñ½­•¸è€‰™¥áÑÕÉ”µÑ½­•¸ˆ°(€€€€€½ÕÑÁÕÑ¥È°(€€€€€™•Ñ¡%µÁ°è…Íå¹Œ€¡ÕÉ°°½ÁÑ¥½¹Ì¤€ôøì(€€€€€€€¥˜€¡MÑÉ¥¹œ¡ÕÉ°¤¹¥¹±Õ‘•Ì ‰…¹…±åÑ¥Í‘…Ñ„¹½½±•…Á¥Ì¹½´ˆ¤¤ì(€€€€€€€€€½¹ÍÐ‰½‘ä€ô)M=8¹Á…ÉÍ”¡½ÁÑ¥½¹Ì¹‰½‘ä¤ì(€€€€€€€€€¥˜€¡‰½‘ä¹‘¥µ•¹Í¥½¹Ì¹Í½µ” ¡‘¥µ•¹Í¥½¸¤€ôø‘¥µ•¹Í¥½¸¹¹…µ”€ôôô€‰•Ù•¹Ñ9…µ”ˆ¤¤ì(€€€€€€€€€€€É•ÑÕÉ¸¹•ÜI•ÍÁ½¹Í” ‰•Ù•¹ÐÉ•Á½ÉÐÕ¹…Ù…¥±…‰±”ˆ°ìÍÑ…ÑÕÌè€ÐÀÌô¤ì(€€€€€€€€€ô(€€€€€€€ô(€€€€€€€É•ÑÕÉ¸½¬ ¤ì(€€€€€ô°(€€€ô¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…°¡É•ÍÕ±Ð¹Í½ÕÉ•MÑ…ÑÕÌ¹„Ð°€‰AIQ%0ˆ¤ì(€€€…ÍÍ•ÉÐ¹•ÅÕ…°¡É•ÍÕ±Ð¹Í¾ÚîÆ­yÒ„¥4ôâç7G&–æv–g’‡°¢&÷w3¢·°¢F–ÖVç6–öåfÇVW3¢°¢²fÇVS¢###c"ÒÀ¢²fÇVS¢&‡GG3¢ò÷wwræf–æfÆ÷wG&6²æ6öÒö&ÆöröW†×ÆS÷WFÕ÷6÷W&6S×FW7B"ÒÀ¢²fÇVS¢$÷&væ–26V&6‚"ÒÀ¢ÒÀ¢ÖWG&–5fÇVW3¢·²fÇVS¢#r"ÒÂ²fÇVS¢#R"ÒÂ²fÇVS¢#B"ÒÂ²fÇVS¢#""ÕÒÀ¢ÕÒÀ¢Ò’Â²7FGW3¢#Ò“°¢ÒÀ¢“°¢76W'BæWVÂ‡&÷w5³Òç6W76–öç2Âr“°¢76W'BæWVÂ‡&÷w5³Òæ7F—fUW6W'2ÂR“°¢76W'BæWVÂ‡&÷w5³ÒæVævvVE6W76–öç2ÂB“°¢76W'BæWVÂ‡&÷w5³Òæ¶W”WfVçG2Â"“°¢76W'BæWVÂ‡&÷w5³ÒæÆæF–æuvRÂ&‡GG3¢ò÷wwræf–æfÆ÷wG&6²æ6öÒö&ÆöröW†×ÆR"“°§Ò“°