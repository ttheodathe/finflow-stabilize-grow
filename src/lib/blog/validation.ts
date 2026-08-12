import { z } from "zod";

const isoDateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "must be a valid date string (e.g. 2026-08-11)",
});

/**
 * Schema for article frontmatter. Fails loudly (at build/module-eval time) when an
 * article in content/blog/*.md is missing required fields or has malformed metadata,
 * per the "fail clearly rather than ship bad SEO pages" requirement.
 */
export const blogFrontmatterSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  description: z.string().trim().min(1, "description is required"),
  slug: z
    .string()
    .trim()
    .min(1, "slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case (e.g. my-article)"),
  author: z.string().trim().min(1, "author is required"),
  publishedAt: isoDateString,
  updatedAt: isoDateString.optional(),
  category: z.string().trim().min(1, "category is required"),
  tags: z.array(z.string().trim().min(1)).default([]),
  featured: z.boolean().default(false),
  coverImage: z.string().trim().min(1).optional(),
  readingTime: z.number().int().positive().optional(),
  canonicalUrl: z.string().trim().min(1).optional(),
  draft: z.boolean().default(false),
});

export type BlogFrontmatterInput = z.infer<typeof blogFrontmatterSchema>;
