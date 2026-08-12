import {
  BadgeCheck,
  BookOpen,
  Boxes,
  Calculator,
  Receipt,
  Rocket,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { BlogAuthor, BlogCategory } from "./types";

export const editorialTeam: BlogAuthor = {
  name: "FinFlowTrack Editorial Team",
  bio: "Business finance writers and product specialists creating practical resources about accounting, financial management, and business operations.",
  expertise: ["Accounting software", "Business finance", "Small business operations"],
};

/**
 * Canonical category list. An article's frontmatter `category` field must match
 * one of these slugs — this is checked by getCategoryBySlug() at read time.
 */
export const blogCategories: BlogCategory[] = [
  {
    id: "accounting-basics",
    name: "Accounting Basics",
    slug: "accounting-basics",
    description: "Core concepts every business owner should understand.",
    icon: Calculator,
  },
  {
    id: "small-business-finance",
    name: "Small Business Finance",
    slug: "small-business-finance",
    description: "Practical finance guidance for growing businesses.",
    icon: TrendingUp,
  },
  {
    id: "invoicing-payments",
    name: "Invoicing & Payments",
    slug: "invoicing-payments",
    description: "Get paid faster with better invoicing habits.",
    icon: Receipt,
  },
  {
    id: "expense-management",
    name: "Expense Management",
    slug: "expense-management",
    description: "Keep business spending organized and audit-ready.",
    icon: Wallet,
  },
  {
    id: "inventory-management",
    name: "Inventory Management",
    slug: "inventory-management",
    description: "Keep stock levels healthy across your business.",
    icon: Boxes,
  },
  {
    id: "accounting-software",
    name: "Accounting Software",
    slug: "accounting-software",
    description: "What to look for when choosing accounting tools.",
    icon: BadgeCheck,
  },
  {
    id: "entrepreneurship",
    name: "Entrepreneurship",
    slug: "entrepreneurship",
    description: "Building the habits and systems behind a healthy business.",
    icon: Rocket,
  },
];

export function getCategoryBySlug(slug: string): BlogCategory | undefined {
  return blogCategories.find((category) => category.slug === slug);
}

export function formatCategoryName(slug: string): string {
  return getCategoryBySlug(slug)?.name ?? slug;
}
