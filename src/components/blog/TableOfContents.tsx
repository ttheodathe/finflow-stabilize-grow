import type { TocHeading } from "@/lib/blog/types";
import { List } from "lucide-react";

export function TableOfContents({ headings }: { headings: TocHeading[] }) {
  if (headings.length === 0) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <List className="h-3.5 w-3.5" />
        On this page
      </h2>
      <ul className="mt-4 space-y-2 text-sm">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.depth === 3 ? "pl-4" : undefined}>
            <a href={`#${heading.id}`} className="text-slate-600 hover:text-emerald-700">
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
