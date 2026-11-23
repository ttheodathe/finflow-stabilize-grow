const baseUrl = (process.env.SEO_BASE_URL || "https://www.finflowtrack.com").replace(/\/$/, "");
const sitemapUrl = `${baseUrl}/sitemap.xml`;
const robotsUrl = `${baseUrl}/robots.txt`;

async function getText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "FinFlowTrack-SEO-Endpoint-Check/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return { response, body };
}

const [{ response: sitemapResponse, body: sitemap }, { response: robotsResponse, body: robots }] =
  await Promise.all([getText(sitemapUrl), getText(robotsUrl)]);

if (!sitemapResponse.headers.get("content-type")?.includes("xml")) {
  throw new Error(`Sitemap has unexpected Content-Type: ${sitemapResponse.headers.get("content-type")}`);
}
if (!robotsResponse.headers.get("content-type")?.includes("text/plain")) {
  throw new Error(`robots.txt has unexpected Content-Type: ${robotsResponse.headers.get("content-type")}`);
}
if (!/^<\?xml\s+version=/i.test(sitemap.trim()) || !/<urlset\b/i.test(sitemap) || !/<\/urlset>\s*$/i.test(sitemap.trim())) {
  throw new Error("sitemap.xml is not a well-formed sitemap document");
}

const locations = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1]);
if (locations.length === 0) throw new Error("sitemap.xml contains no URL entries");
if (locations.some((location) => !location.startsWith(`${baseUrl}/`))) {
  throw new Error("Sitemap contains a URL outside the configured canonical host");
}
if (new Set(locations).size !== locations.length) {
  throw new Error("Sitemap contains duplicate URL entries");
}
if (!locations.includes(`${baseUrl}/`)) throw new Error("Sitemap is missing the homepage");

const sitemapDirective = robots.match(/^\s*Sitemap:\s*(\S+)\s*$/im)?.[1];
if (sitemapDirective !== sitemapUrl) {
  throw new Error(`robots.txt must point to ${sitemapUrl}; found ${sitemapDirective || "no Sitemap directive"}`);
}

console.log(`SEO endpoints passed: ${locations.length} sitemap URLs; robots.txt references the canonical sitemap.`);
