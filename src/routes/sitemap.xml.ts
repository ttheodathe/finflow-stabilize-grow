import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const baseUrl = "https://finflowtrack.com";

        const pages = [
          "/",
          "/about",
          "/pricing",
          "/features",
          "/security",
          "/trust",
          "/privacy",
          "/terms",
          "/contact",
          "/roadmap",
          "/changelog",
          "/help",
          "/docs",
          "/blog",
          "/careers",
          "/press",
          "/integrations",
        ];

        const today = new Date().toISOString();

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${pages
  .map(
    (page) => `
<url>
  <loc>${baseUrl}${page}</loc>
  <lastmod>${today}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>${page === "/" ? "1.0" : "0.8"}</priority>
</url>`
  )
  .join("")}

</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
          },
        });
      },
    },
  },
});
