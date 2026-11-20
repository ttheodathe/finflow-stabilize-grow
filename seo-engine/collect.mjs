import { mkdir, writeFile } from "node:fs/promises";
import { createAccessToken } from "./google-auth.mjs";
import { normalizePageUrl, resolveDateRange } from "./normalize.mjs";

const GSC_SITE_URL = process.env.GSC_SITE_URL || "sc-domain:finflowtrack.com";
const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || "546829553";
const OUTPUT_DIR = process.env.SEO_OUTPUT_DIR || "seo-output";
const PAGE_SIZE = 25_000;
const GA4_PAGE_SIZE = 100_000;

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestJson(url, options, { fetchImpl = fetch, retries = 3, sleepImpl = defaultSleep } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let response;
    try { response = await fetchImpl(url, options); }
    catch (error) {
      if (attempt < retries) { await sleepImpl(500 * 2 ** attempt); continue; }
      throw new Error("Google API network request failed after " + (attempt + 1) + " attempts: " + String(error?.message || error));
    }
    if (response.ok) {
      try { return await response.json(); }
      catch (error) { throw new Error("Google API returned invalid JSON: " + String(error?.message || error)); }
    }
    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      await sleepImpl(500 * 2 ** attempt);
      continue;
    }
    const message = await response.text().catch(() => "");
    throw new Error("Google API request failed (HTTP " + response.status + "): " + message.slice(¶»§q«^u…•ÍÍQ½­•¸°‘…Ñ•I…¹”°l‰‘…Ñ”ˆ°€‰Á…”ˆ°€‰½Õ¹ÑÉä‰t°™•Ñ¡%µÁ°¤ì(€½¹ÍÐÁ…•Í	å•Ù¥”€ô…Ý…¥Ð½±±•ÑÍ¥µ•¹Í¥½¸¡…•ÍÍQ½­•¸°‘…Ñ•I…¹”°l‰‘…Ñ”ˆ°€‰Á…”ˆ°€‰‘•Ù¥”‰t°™•Ñ¡%µÁ°¤ì(€½¹ÍÐÍ•…É¡ÁÁ•…É…¹”€ô…Ý…¥Ð½±±•ÑÍ¥µ•¹Í¥½¸¡…•ÍÍQ½­•¸°‘…Ñ•I…¹”°l‰‘…Ñ”ˆ°€‰Í•…É¡ÁÁ•…É…¹”‰t°™•Ñ¡%µÁ°¤ì(€É•ÑÕÉ¸ìÁ…•Ì°ÅÕ•É¥•Ì°Á…•EÕ•É¥•Ì°Á…•Í	å½Õ¹ÑÉä°Á…•Í	å•Ù¥”°Í•…É¡ÁÁ•…É…¹”ôì)ô()•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸½±±•Ñ„Ð¡…•ÍÍQ½­•¸°‘…Ñ•I…¹”°™•Ñ¡%µÁ°€ô™•Ñ ¤ì(€½¹ÍÐ•¹‘Á½¥¹Ð€ô¡ÑÑÁÌè¼½…¹…±åÑ¥Í‘…Ñ„¹½½±•…Á¥Ì¹½´½ØÅ‰•Ñ„½ÁÉ½Á•ÉÑ¥•Ì¼‘í•¹½‘•UI%½µÁ½¹•¹Ð¡Ñ}AI=AIQe}%¥ôéÉÕ¹I•Á½ÉÑ€ì(€½¹ÍÐÉ½ÝÌ€ômtì(€™½È€¡±•Ð½™™Í•Ð€ô€Àì€ì½™™Í•Ð€¬ôÑ}A}M%i¤ì(€€€½¹ÍÐÁ…”€ô…Ý…¥ÐÉ•ÅÕ•ÍÑ)Í½¸¡•¹‘Á½¥¹Ð°ì(€€€€€µ•Ñ¡½è€‰A=MPˆ°(€€€€€¡•…‘•ÉÌèì(€€€€€€€…ÕÑ¡½É¥é…Ñ¥½¸è	•…É•È€‘í…•ÍÍQ½­•¹õ€°(€€€€€€€€‰½¹Ñ•¹ÐµÑåÁ”ˆè€‰…ÁÁ±¥…Ñ¥½¸½©Í½¸ˆ°(€€€€€ô°(€€€€€‰½‘äè)M=8¹ÍÑÉ¥¹¥™ä¡ì(€€€€€€€‘…Ñ•I…¹•ÌèmìÍÑ…ÉÑ…Ñ”è‘…Ñ•I…¹”¹ÍÑ…ÉÑ…Ñ”°•¹‘…Ñ”è‘…Ñ•I…¹”¹•¹‘…Ñ”õt°(€€€€€€€‘¥µ•¹Í¥½¹Ìèl(€€€€€€€€€ì¹…µ”è€‰‘…Ñ”ˆô°(€€€€€€€€€ì¹…µ”è€‰±…¹‘¥¹A…•A±ÕÍEÕ•ÉåMÑÉ¥¹œˆô°(€€€€€€€€€ì¹…µ”è€‰Í•ÍÍ¥½¹•™…Õ±Ñ¡…¹¹•±É½ÕÀˆô°(€€€€€€€t°(€€€€€€€µ•ÑÉ¥Ìèl(€€€€€€€€€ì¹…µ”è€‰Í•ÍÍ¥½¹Ìˆô°(€€€€€€€€€ì¹…µ”è€‰…Ñ¥Ù•UÍ•ÉÌˆô°(€€€€€€€€€ì¹…µ”è€‰•¹…•‘M•ÍÍ¥½¹Ìˆô°(€€€€€€€€€ì¹…µ”è€‰­•åÙ•¹ÑÌˆô°(€€€€€€€t°(€€€€€€€‘¥µ•¹Í¥½¹¥±Ñ•Èèì(€€€€€€€€€™¥±Ñ•Èèì(€€€€€€€€€€€™¥•±‘9…µ”è€‰Í•ÍÍ¥½¹•™…Õ±Ñ¡…¹¹•±É½ÕÀˆ°(€€€€€€€€€€€ÍÑÉ¥¹¥±Ñ•Èèìµ…Ñ¡QåÁ”è€‰aPˆ°Ù…±Õ”è€‰=É…¹¥ŒM•…É ˆô°(€€€€€€€€€ô°(€€€€€€€ô°(€‚ÚîÆ­y×2æ6öÒ÷c&WF÷&÷W'F–W2ò"²Væ6öFUU$”6ö×öæVçB„tEõ$õU%E•ô”B’²#§'Vå&W÷'B#°¢6öç7B&÷w2ÒµÓ°¢6öç7BfWF6†VDBÒæWrFFR‚’çFô•4õ7G&–ær‚“°¢f÷"†ÆWBöfg6WBÒ²²öfg6WB³ÒtEõtUõ4•¤R’°¢6öç7BvRÒv—B&WVW7D§6öâ†VæGö–çBÂ°¢ÖWF†öC¢%õ5B"À¢†VFW'3¢²WF†÷&—¦F–öã¢$&V&W""²66W75Fö¶VâÂ&6öçFVçB×G—R#¢&Æ–6F–öâö§6öâ"ÒÀ¢&öG“¢¥4ôâç7G&–æv–g’‡°¢FFU&ævW3¢·²7F'DFFS¢FFU&ævRç7F'DFFRÂVæDFFS¢FFU&ævRæVæDFFRÕÒÀ¢F–ÖVç6–öç3¢·²æÖS¢&WfVçDæÖR"ÕÒÀ¢ÖWG&–73¢·²æÖS¢&WfVçD6÷VçB"ÒÂ²æÖS¢'F÷FÅW6W'2"ÕÒÀ¢Æ–Ö—C¢tEõtUõ4•¤RÀ¢öfg6WBÀ¢Ò’À¢ÒÂ²fWF6„–×ÂÂ6ÆVW–×ÂÒ“°¢–b‚vRÇÂG—VöbvRÓÒ&ö&¦V7B"ÇÂ'&’æ—4'&’‡vR’ÇÂ‡vRç&÷w2ÓÒVæFVf–æVBbb'&’æ—4'&’‡vRç&÷w2’’’°¢F‡&÷ræWrW'&÷"‚$tBWfVçG2&W÷'B&WGW&æVBÖÆf÷&ÖVB&W7öç6Râ"“°¢Ð¢6öç7B&÷t6÷VçBÒvRç&÷t6÷VçBÓÓÒVæFVf–æVBòçVÆÂ¢çVÖ&W"‡vRç&÷t6÷VçB“°¢–b‡&÷t6÷VçBÓÒçVÆÂbb‚çVÖ&W"æ—4–çFVvW"‡&÷t6÷VçB’ÇÂ&÷t6÷VçBÂ’’F‡&÷ræWrW'&÷"‚$tBWfVçG2&W÷'B&WGW&æVBâ–çfÆ–B&÷t6÷VçBâ"“°¢–b‚'&’æ—4'&’‡vRç&÷w2’bb&÷t6÷VçBÓÒ’F‡&÷ræWrW'&÷"‚$tBWfVçG2&W÷'BöÖ—GFVB&÷w2v—F†÷WB6öæf—&Ö–ærâV×G’&W7VÇBâ"“°¢6öç7B&F6‚ÒvRç&÷w2ÇÂµÓ°¢&÷w2çW6‚‚ââæ&F6‚æÖ‚‡&÷r’Óâ°¢6öç7BF–ÖVç6–öç2Ò&÷ræF–ÖVç6–öåfÇVW2ÇÂµÓ°¢6öç7BÖWG&–72Ò&÷ræÖWG&–5fÇVW2ÇÂµÓ°¢6öç7BWfVçDæÖRÒF–ÖVç6–öç5³ÓòçfÇVS°¢6öç7BWfVçD6÷VçBÒçVÖ&W"†Ûkºwµç\Y]Y]NˆÂˆØMÙ\ÜÚ[ÛœÎˆÈÝ]\ÎˆØM›ÝÜÈÈURSP“Hˆˆ•SURSP“H‹ØÛÜNˆ“Ô‘ÐS’P×ÔÑPTÒ‹™]ÚY]ˆØM›ÝÜÈÈ™]È]J
KÒTÓÔÝš[™Ê
Hˆ[KˆØM]™[ÎˆÈÝ]\ÎˆØM]™[™\ÜÈURSP“Hˆˆ•SURSP“H‹ØÛÜNˆSÐÒS“‘SÈ‹™]ÚY]ˆØM]™[™\ÜË™™]ÚY]ÏÈ[KˆKˆÛÝ[ÎˆÂˆÜØÔYÙT›ÝÜÎˆÜØÔ›ÝÜËœYÙ\Ë›[™ÝˆÜØÔ]Y\žT›ÝÜÎˆÜØÔ›ÝÜËœ]Y\šY\Ë›[™ÝˆÜØÔYÙT]Y\žT›ÝÜÎˆÜØÔ›ÝÜËœYÙT]Y\šY\Ë›[™ÝˆÜØÔYÙPÛÝ[žT›ÝÜÎˆÜØÔ›ÝÜËœYÙ\ÐžPÛÝ[žK›[™ÝˆÜØÔYÙQ]šXÙT›ÝÜÎˆÜØÔ›ÝÜËœYÙ\ÐžQ]šXÙK›[™ÝˆÜØÔÙX\˜Ú\X\˜[˜ÙT›ÝÜÎˆÜØÔ›ÝÜËœÙX\˜Ú\X\˜[˜ÙK›[™ÝˆØM›ÝÜÎˆØM›ÝÜÏË›[™ÝÏÈ[ˆØM]™[›ÝÜÎˆØM]™[™\ÜËœ›ÝÜË›[™ÝÏÈ[ˆKˆÜØÎˆÜØÔ›ÝÜËˆØMˆØM›ÝÜËˆØM]™[ÎˆØM]™[™\ÜËœ›ÝÜÈÏÈ[ˆNÂˆ]ØZ]ZÙ\ŠÝ]]\‹È™XÝ\œÚ]™NˆYHJNÂˆÛÛœÝš[HHÝ]]\ˆ
È‹ÜÙ[ËY]KHˆ
È]T˜[™ÙKœÝ\]H
È‹]ËHˆ
È]T˜[™ÙK™[™]H
È‹šœÛÛˆŽÂˆ]ØZ]Üš]Qš[Jš[K”ÓÓ‹œÝš[™ÚYžJÛ˜\ÚÝ[ŠH
È—ˆ‹È›YÎˆÈˆJNÂˆ™]\›ˆÈš[KÛÝ[ÎˆÛ˜\ÚÝ˜ÛÝ[Ë]T˜[™ÙKÛÝ\˜ÙTÝ]\ÎˆÛ˜\ÚÝœÛÝ\˜ÙTÝ]\ËÛÝ\˜ÙQ\œ›ÜœÎˆÛ˜\ÚÝœÛÝ\˜ÙQ\œ›ÜœÈNÂŸB‚‹ÊŠ‚ˆ
ˆÛÛXÝÔÐÈ[™ÐM[™\[™[H›ÜˆØÚY[\ˆËˆÛ™H›ÝšY\ˆÝ]YÙH]\Ýˆ
ˆ›Ý\ØØ\™HÝ\ˆ›ÝšY\‰ÜÈ˜[Y™XY[Û›HY]šXÜË‚ˆ
‹Â™^Ü\Þ[˜È[˜Ý[ÛˆÛÛXÝ\X[
È]T˜[™ÙHH™\ÛÛ™Q]T˜[™ÙJ
KÚÙ[‹Ý]]\ˆHÕUUÑT‹™]Ú[\H™]ÚHHßJHÂˆ]XØÙ\ÜÕÚÙ[ˆHÚÙ[ˆ-®éÜj×null,
      gscQueryRows: gsc?.queries.length ?? null,
      gscPageQueryRows: gsc?.pageQueries.length ?? null,
      gscPageCountryRows: gsc?.pagesByCountry.length ?? null,
      gscPageDeviceRows: gsc?.pagesByDevice.length ?? null,
      gscSearchAppearanceRows: gsc?.searchAppearance.length ?? null,
      ga4Rows: sessions?.length ?? null,
      ga4EventRows: events?.rows.length ?? null,
    },
    gsc,
    ga4: sessions,
    ga4Events: events?.rows ?? null,
  };
  await mkdir(outputDir, { recursive: true });
  const file = outputDir + "/seo-data-partial-" + dateRange.startDate + "-to-" + dateRange.endDate + ".json";
  await writeFile(file, JSON.stringify(snapshot, null, 2) + "\n", { flag: "w" });
  return { file, counts: snapshot.counts, dateRange, sourceStatus: snapshot.sourceStatus, sourceErrors: snapshot.sourceErrors };
}

function parseArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!["--start-date", "--end-date"].includes(key)) throw new Error(`Unknown argument: ${key}`);
    values[key] = args[index + 1];
    index += 1;
  }
  return resolveDateRange({ startDate: values["--start-date"], endDate: values["--end-date"] });
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    const dateRange = parseArgs(process.argv.slice(2));
    const result = await collect({ dateRange });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`SE¶»§q«^