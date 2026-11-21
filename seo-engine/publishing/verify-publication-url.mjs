const articleUrl = process.argv[2];
if (!articleUrl) throw new Error("Usage: verify-publication-url.mjs <article-url>");
const expected = new URL(articleUrl);
if (expected.protocol !== "https:" || expected.hostname !== "www.finflowtrack.com") {
  throw new Error("Publication URL must be on the canonical FinFlow Track domain.");
}

const page = await fetch(expected, { redirect: "follow" });
if (page.status !== 200) throw new Error(`Published article returned HTTP ${page.status}.`);
const html = await page.text();
const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
  || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
if (!canonicalMatch) throw new Error("Published page has no canonical link.");
if (new URL(canonicalMatch[1], expected).href.replace(/\/$/, "") !== expected.href.replace(/\/$/, "")) {
  throw new Error("Published page canonical URL does not match the target URL.");
}
const robotsHeader = page.headers.get("x-robots-tag") || "";
const robotsMeta = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] || "";
if (/noindex/i.test(`${robotsHeader} ${robotsMeta}`)) {
  throw new Error("Published page is marked noindex.");
}

const sitemapUrl = process.env.PUBLISH_SITEMAP_URL || "https://www.finflowtrack.com/sitemap.xml";
const sitemap = await fetch(sitemapUrl, { redirect: "follow" });
if (sitemap.status !== 200) throw new Error(`Sitemap returned HTTP ${sitemap.status}.`);
const sitemapText = await sitemap.text();
if (!sitemapText.includes(expected.href) && !sitemapText.includes(expected.href.replace(/\/$/, ""))) {
  throw new Error("Published article URL is not yet present in the sitemap.");
}

console.log(`Verified published article URL, canonical, indexability and sitemap inclusion: ${expected.href}`);
