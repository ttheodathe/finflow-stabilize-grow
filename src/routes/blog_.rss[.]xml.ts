import { createFileRoute } from "@tanstack/react-router";
import { getAllPosts, SITE_URL } from "@/lib/blog/posts";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/blog_/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const posts = getAllPosts();
        const now = new Date().toUTCString();

        const items = posts
          .map((post) => {
            const url = `${SITE_URL}/blog/${post.slug}`;
            return `
<item>
  <title>${escapeXml(post.title)}</title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  <description>${escapeXml(post.excerpt)}</description>
  <author>${escapeXml(post.author)}</author>
  <pubDate>${new Date(`${post.publishedAt}T00:00:00Z`).toUTCString()}</pubDate>
</item>`;
          })
          .join("");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>FinFlowTrack Blog</title>
  <link>${SITE_URL}/blog</link>
  <description>Accounting guides, business finance strategies, and small business growth insights from FinFlowTrack.</description>
  <language>en-us</language>
  <lastBuildDate>${now}</lastBuildDate>
  ${items}
</channel>
</rss>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/rss+xml",
          },
        });
      },
    },
  },
});
