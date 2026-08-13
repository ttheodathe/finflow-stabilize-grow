import { createFileRoute } from "@tanstack/react-router";
import { getAllPosts } from "@/lib/blog/posts";

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
          "/compare/finflow-track-vs-quickbooks",
          "/careers",
          "/press",
          "/integrations",
        ];

        const today = new Date().toISOString();

        // Blog articles are generated from content/blog/*.md — adding a new article
        // and pushing to GitHub automatically adds it here on the next build, with
        // no manual sitemap maintenance. Draft articles are excluded by getAllPosts().
        const blogPosts = getAllPosts();

        const staticEntries = pages.map((page) => ({
          loc: `${baseUrl}${page}`,
          lastmod: today,
          changefreq: "weekly",
          priority: page === "/" ? "1.0" : "0.8",
        }));

        const blogEntries = blogPosts.map((post) => ({
          loc: `${baseUrl}/blog/${post.slug}`,
          lastmod: new Date(`${post.updatedAt}T00:00:00Z`).toISOString(),
          changefreq: "monthly",
          priority: "0.7",
        }));

        const entries = [...staticEntries, ...blogEntries];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${entries
  .map(
    (entry) => `
<url>
  <loc>${entry.loc}</loc>
  <lastmod>${entry.lastmod}</lastmod>
  <changefreq>${entry.changefreq}</changefreq>
  <priority>${entry.priority}</priority>
</url>`,
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
