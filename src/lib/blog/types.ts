import type { LucideIcon } from "lucide-react";

/** Raw, validated metadata parsed from an article's frontmatter block. */
export interface BlogFrontmatter {
  title: string;
  description: string;
  slug: string;
  author: string;
  /** ISO date string, e.g. "2026-07-01" */
  publishedAt: string;
  /** ISO date string. Defaults to publishedAt when omitted. */
  updatedAt: string;
  /** Category slug — must match a slug in BLOG_CATEGORIES. */
  category: string;
  tags: string[];
  featured: boolean;
  coverImage?: string;
  /** Manual override, in minutes. When omitted, reading time is computed from word count. */
  readingTime?: number;
  canonicalUrl?: string;
  /** Draft articles are excluded from the index, sitemap, RSS feed, and related posts. */
  draft: boolean;
}

export interface TocHeading {
  depth: 2 | 3;
  text: string;
  id: string;
}

/** A fully processed article, ready to render. */
export interface BlogPost extends BlogFrontmatter {
  /** Rendered, sanitized article body as HTML. */
  contentHtml: string;
  /** Auto-generated table of contents from H2/H3 headings. */
  headings: TocHeading[];
  /** Resolved reading time in minutes (frontmatter override or computed). */
  readingTime: number;
  /** Plain-text excerpt for cards/meta tags — currently the frontmatter description. */
  excerpt: string;
  /** Absolute canonical URL for this article. */
  url: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: LucideIcon;
}

export interface BlogAuthor {
  name: string;
  bio: string;
  expertise: string[];
}
