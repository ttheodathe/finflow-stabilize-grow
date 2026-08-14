import "./buffer-polyfill";
import matter from "gray-matter";
import { marked, Renderer, type Tokens } from "marked";
import { blogFrontmatterSchema } from "./validation";
import type { BlogFrontmatter, BlogPost, TocHeading } from "./types";
import { getCategoryBySlug } from "./categories";

export const SITE_URL = "https://www.finflowtrack.com";

// Bundled at build time via Vite's import.meta.glob — no filesystem access at request
// time, which matters because this app deploys to Cloudflare Workers (via Nitro),
// and Workers have no fs. New articles ship simply by adding a .md file here and
// pushing to GitHub; Vercel rebuilds and the article goes live automatically.
const rawModules = import.meta.glob("/content/blog/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function calculateReadingTime(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ") // drop code blocks
    .replace(/[#>*_`~-]/g, " ") // drop common markdown syntax characters
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Renders markdown to sanitized HTML and collects H2/H3 headings for the table of
 * contents. Raw inline HTML in article source is intentionally stripped (not
 * executed) — content files are plain Markdown, not MDX, and should not be able to
 * embed scripts or arbitrary markup.
 */
function renderMarkdown(markdown: string): { html: string; headings: TocHeading[] } {
  const headings: TocHeading[] = [];
  const renderer = new Renderer();

  renderer.html = () => "";

  renderer.heading = function headingRenderer(token: Tokens.Heading) {
    const inline = this.parser.parseInline(token.tokens);
    const plainText = stripTags(inline);
    const id = slugify(plainText);
    if (token.depth === 2 || token.depth === 3) {
      headings.push({ depth: token.depth, text: plainText, id });
    }
    return `<h${token.depth} id="${id}">${inline}</h${token.depth}>\n`;
  };

  const html = marked.parse(markdown, { renderer, gfm: true, breaks: false }) as string;
  return { html, headings };
}

function buildPost(filepath: string, raw: string): BlogPost {
  const filenameSlug = filepath.split("/").pop()!.replace(/\.md$/, "");
  const { data, content } = matter(raw);

  const parsed = blogFrontmatterSchema.safeParse({ slug: filenameSlug, ...data });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid frontmatter in content/blog/${filenameSlug}.md — ${issues}`);
  }

  const frontmatter = parsed.data as BlogFrontmatter;

  if (!getCategoryBySlug(frontmatter.category)) {
    throw new Error(
      `content/blog/${filenameSlug}.md references unknown category "${frontmatter.category}". ` +
        `Add it to src/lib/blog/categories.ts or fix the frontmatter.`,
    );
  }

  const { html, headings } = renderMarkdown(content);
  const readingTime = frontmatter.readingTime ?? calculateReadingTime(content);
  const updatedAt = frontmatter.updatedAt ?? frontmatter.publishedAt;
  const url = frontmatter.canonicalUrl ?? `${SITE_URL}/blog/${frontmatter.slug}`;

  return {
    ...frontmatter,
    updatedAt,
    contentHtml: html,
    headings,
    readingTime,
    excerpt: frontmatter.description,
    url,
  };
}

const allPostsIncludingDrafts: BlogPost[] = Object.entries(rawModules)
  .map(([filepath, raw]) => buildPost(filepath, raw))
  .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

// Fail the build loudly on duplicate slugs rather than silently shadowing an article.
const seenSlugs = new Set<string>();
for (const post of allPostsIncludingDrafts) {
  if (seenSlugs.has(post.slug)) {
    throw new Error(`Duplicate blog slug detected: "${post.slug}". Slugs must be unique.`);
  }
  seenSlugs.add(post.slug);
}

/** Published articles only, newest first. Drafts are excluded everywhere public-facing. */
export function getAllPosts(): BlogPost[] {
  return allPostsIncludingDrafts.filter((post) => !post.draft);
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  const post = allPostsIncludingDrafts.find((p) => p.slug === slug);
  return post && !post.draft ? post : undefined;
}

export function getFeaturedPosts(): BlogPost[] {
  return getAllPosts().filter((post) => post.featured);
}

export function getPostsByCategory(categorySlug: string): BlogPost[] {
  return getAllPosts().filter((post) => post.category === categorySlug);
}

export function getPostsByTag(tag: string): BlogPost[] {
  const normalized = tag.toLowerCase();
  return getAllPosts().filter((post) => post.tags.some((t) => t.toLowerCase() === normalized));
}

/**
 * Deterministic related-post scoring: same category outweighs shared tags, ties broken
 * by recency. No AI call — just metadata overlap, per spec.
 */
export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const candidates = getAllPosts().filter((p) => p.slug !== post.slug);

  const scored = candidates
    .map((candidate) => {
      let score = 0;
      if (candidate.category === post.category) score += 2;
      const sharedTags = candidate.tags.filter((tag) => post.tags.includes(tag)).length;
      score += sharedTags;
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.candidate.publishedAt < b.candidate.publishedAt ? 1 : -1;
    });

  return scored.slice(0, limit).map((entry) => entry.candidate);
}
