import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  Mail,
  RefreshCw,
  UserCircle2,
} from "lucide-react";
import {
  blogCategories,
  editorialTeam,
  getArticleBySlug,
  getCategoryBySlug,
  getRelatedArticles,
} from "@/lib/blog-data";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogArticlePage,
  loader: ({ params }) => {
    const article = getArticleBySlug(params.slug);
    if (!article) {
      throw notFound();
    }
    return { article };
  },
  head: ({ loaderData }) => {
    const article = loaderData?.article;
    if (!article) {
      return { meta: [{ title: "Article Not Found | FinFlowTrack Blog" }] };
    }

    const url = `https://www.finflowtrack.com/blog/${article.slug}`;

    return {
      meta: [
        { title: `${article.title} | FinFlowTrack Blog` },
        { name: "description", content: article.excerpt },
        { property: "og:title", content: article.title },
        { property: "og:description", content: article.excerpt },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "article:published_time", content: article.publishedAt },
        { property: "article:modified_time", content: article.updatedAt },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: article.title,
            description: article.excerpt,
            author: {
              "@type": "Organization",
              name: article.author,
            },
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
            publisher: {
              "@type": "Organization",
              name: "FinFlowTrack",
            },
            mainEntityOfPage: url,
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Article not found</h1>
      <p className="mt-3 text-slate-600">
        We couldn't find the article you're looking for. It may have moved
        or been renamed.
      </p>
      <Link
        to="/blog"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Blog
      </Link>
    </div>
  ),
});

function formatCategoryName(slug: string): string {
  return getCategoryBySlug(slug)?.name ?? slug;
}

function BlogArticlePage() {
  const { article } = Route.useLoaderData();
  const relatedArticles = getRelatedArticles(article);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          <span className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {formatCategoryName(article.categorySlug)}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-4 text-lg text-slate-600">{article.excerpt}</p>

          <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <UserCircle2 className="h-4 w-4" />
              {article.author}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Published {article.publishedAt}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Updated {article.updatedAt}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {article.readTime}
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Article content */}
          <article
            className="
              prose prose-slate max-w-none
              prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
              prose-h2:mt-10 prose-h2:text-2xl
              prose-p:leading-relaxed prose-p:text-slate-600
              prose-li:text-slate-600
              prose-strong:text-slate-900
              prose-table:text-sm
              prose-th:bg-slate-50 prose-th:text-left prose-th:font-semibold prose-th:text-slate-700
              prose-td:text-slate-600
            "
          >
            {article.content}
          </article>

          {/* Sidebar */}
          <aside className="space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Related Articles
              </h2>
              <ul className="mt-4 space-y-4">
                {relatedArticles.length === 0 ? (
                  <li className="text-sm text-slate-500">
                    More articles coming soon.
                  </li>
                ) : (
                  relatedArticles.map((related) => (
                    <li key={related.slug}>
                      <Link
                        to="/blog/$slug"
                        params={{ slug: related.slug }}
                        className="flex items-start gap-2 text-sm font-medium text-slate-700 hover:text-emerald-700"
                      >
                        <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {related.title}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Categories
              </h2>
              <ul className="mt-4 space-y-2">
                {blogCategories.map((category) => (
                  <li key={category.id}>
                    <Link
                      to="/blog"
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-700"
                    >
                      <category.icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
              <Mail className="h-5 w-5 text-emerald-400" />
              <h2 className="mt-3 text-sm font-semibold">
                Get Business Finance Insights
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                New articles on accounting and small business finance, sent
                occasionally.
              </p>
              <Link
                to="/blog"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Subscribe on the Blog
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </aside>
        </div>

        {/* Author box */}
        <div className="mt-16 flex flex-col gap-6 rounded-2xl border border-slate-200 bg-slate-50 p-8 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
            <UserCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {editorialTeam.name}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {editorialTeam.bio}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {editorialTeam.expertise.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom related content */}
        {relatedArticles.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold text-slate-900">
              Related Reading
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((related) => (
                <Link
                  key={related.slug}
                  to="/blog/$slug"
                  params={{ slug: related.slug }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {formatCategoryName(related.categorySlug)}
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">
                    {related.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {related.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Product CTA */}
        <div className="mt-16 rounded-3xl bg-slate-900 px-8 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Put This Into Practice in FinFlowTrack
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
            Manage invoices, expenses, inventory, and reports in one
            connected platform.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
