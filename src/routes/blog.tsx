import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Clock,
  FileText,
  Mail,
  Receipt,
  Search,
  Sparkles,
  UserCircle2,
  Wallet,
} from "lucide-react";
import { blogArticles, blogCategories, editorialTeam } from "@/lib/blog-data";

export const Route = createFileRoute("/blog")({
  component: BlogPage,
  head: () => ({
    meta: [
      {
        title: "FinFlowTrack Blog | Accounting & Small Business Finance Insights",
      },
      {
        name: "description",
        content:
          "Explore accounting guides, business finance strategies, invoicing tips, and small business growth insights from FinFlowTrack experts.",
      },
      {
        property: "og:title",
        content: "FinFlowTrack Blog | Accounting & Small Business Finance Insights",
      },
      {
        property: "og:description",
        content:
          "Explore accounting guides, business finance strategies, invoicing tips, and small business growth insights from FinFlowTrack experts.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: "https://www.finflowtrack.com/blog",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://www.finflowtrack.com/blog",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "FinFlowTrack Blog",
          description:
            "Accounting guides, business finance strategies, and small business growth insights.",
          url: "https://www.finflowtrack.com/blog",
        }),
      },
    ],
  }),
});

const popularTopics = [
  "Accounting",
  "Invoicing",
  "Expenses",
  "Small Business",
  "Inventory",
  "Finance",
  "Automation",
];

const productEducationCards = [
  { title: "Creating invoices", to: "/guides", icon: Receipt },
  { title: "Tracking expenses", to: "/guides", icon: Wallet },
  { title: "Managing companies", to: "/security", icon: Building2 },
  { title: "Understanding reports", to: "/guides", icon: BarChart3 },
  { title: "Inventory management", to: "/guides", icon: FileText },
];

const faqs = [
  {
    question: "Is FinFlowTrack suitable for small businesses?",
    answer:
      "Yes. FinFlowTrack is built around the workflows small businesses actually use — invoicing, expense tracking, inventory, and reporting — with a free plan to get started.",
  },
  {
    question: "Can beginners learn accounting from FinFlowTrack?",
    answer:
      "Yes. Our blog and guides start with core concepts like what accounting is and how cash flow works, then move into practical, day-to-day topics as you get more comfortable.",
  },
  {
    question: "What topics does the FinFlowTrack blog cover?",
    answer:
      "Accounting basics, small business finance, invoicing and payments, expense management, inventory management, accounting software, and entrepreneurship.",
  },
  {
    question: "How often are new articles published?",
    answer:
      "We publish new articles and update existing ones regularly as we continue building out the FinFlowTrack Blog. Check back often, or subscribe for updates.",
  },
];

function formatCategoryName(slug: string): string {
  return blogCategories.find((category) => category.slug === slug)?.name ?? slug;
}

function BlogPage() {
  const [query, setQuery] = useState("");

  const featuredArticle = blogArticles[0];
  const latestArticles = blogArticles.slice(1);

  const filteredArticles = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return latestArticles;
    return latestArticles.filter(
      (article) =>
        article.title.toLowerCase().includes(trimmed) ||
        article.excerpt.toLowerCase().includes(trimmed) ||
        formatCategoryName(article.categorySlug).toLowerCase().includes(trimmed),
    );
  }, [query, latestArticles]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              FinFlowTrack Blog
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              FinFlowTrack Blog
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Insights, guides, and practical resources to help businesses understand accounting,
              manage finances, and grow with confidence.
            </p>

            <div className="mt-10">
              <label htmlFor="blog-search" className="sr-only">
                Search articles
              </label>
              <div className="relative mx-auto max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="blog-search"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search accounting guides, finance tips, and business insights..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {popularTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setQuery(topic)}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Article */}
      <section aria-labelledby="featured-heading" className="mx-auto max-w-6xl px-6 py-20">
        <h2 id="featured-heading" className="sr-only">
          Featured article
        </h2>
        <Link
          to="/blog/$slug"
          params={{ slug: featuredArticle.slug }}
          className="grid grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 shadow-sm transition hover:shadow-md lg:grid-cols-2"
        >
          <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 lg:aspect-auto">
            <BookOpen className="h-16 w-16 text-white/20" />
          </div>
          <div className="flex flex-col justify-center bg-white p-8 sm:p-10">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Featured Article
            </span>
            <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              {featuredArticle.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{featuredArticle.excerpt}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <UserCircle2 className="h-3.5 w-3.5" />
                {featuredArticle.author}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {featuredArticle.readTime}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {featuredArticle.publishedAt}
              </span>
            </div>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              Read the guide
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>
      </section>

      {/* Category System */}
      <section
        aria-labelledby="categories-heading"
        className="border-t border-slate-100 bg-slate-50"
      >
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="categories-heading"
              className="text-3xl font-bold tracking-tight text-slate-900"
            >
              Browse by Category
            </h2>
            <p className="mt-4 text-slate-600">
              Find articles organized around the topics that matter most to your business.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {blogCategories.map((category) => (
              <article
                key={category.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <category.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{category.name}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{category.description}</p>
                <ul className="mt-4 space-y-2">
                  {category.previewArticles.map((title) => (
                    <li key={title}>
                      <button
                        type="button"
                        onClick={() => setQuery(title)}
                        className="flex items-start gap-2 text-left text-sm text-slate-600 hover:text-emerald-700"
                      >
                        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {title}
                      </button>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Articles */}
      <section aria-labelledby="latest-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="latest-heading" className="text-3xl font-bold tracking-tight text-slate-900">
            Latest Articles
          </h2>
          <p className="mt-4 text-slate-600">
            Fresh, practical reading for business owners and finance teams.
          </p>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
            <p className="text-sm text-slate-600">
              No articles match "{query}" yet. Try a different search term.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => (
              <Link
                key={article.slug}
                to="/blog/$slug"
                params={{ slug: article.slug }}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex aspect-[16/9] items-center justify-center bg-slate-100">
                  <BookOpen className="h-8 w-8 text-slate-300" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {formatCategoryName(article.categorySlug)}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-slate-900">{article.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                    {article.excerpt}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <UserCircle2 className="h-3.5 w-3.5" />
                      {article.author}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {article.readTime}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Expert Author Section */}
      <section aria-labelledby="authors-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="text-center">
            <h2 id="authors-heading" className="text-3xl font-bold tracking-tight text-slate-900">
              Meet Our Contributors
            </h2>
          </div>
          <article className="mt-10 flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
              <UserCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{editorialTeam.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{editorialTeam.bio}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {editorialTeam.expertise.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Research & Insights */}
      <section aria-labelledby="research-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="research-heading" className="text-3xl font-bold tracking-tight text-slate-900">
            FinFlowTrack Research &amp; Insights
          </h2>
          <p className="mt-4 text-slate-600">
            Ongoing analysis on small business finance, currently in progress.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Small business finance reports",
            "Accounting trends",
            "Industry insights",
            "Business studies",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
            >
              <BarChart3 className="mx-auto h-6 w-6 text-slate-400" />
              <h3 className="mt-3 text-sm font-semibold text-slate-700">{item}</h3>
              <p className="mt-1 text-xs text-slate-500">Coming soon</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product Education */}
      <section
        aria-labelledby="product-education-heading"
        className="border-t border-slate-100 bg-slate-50"
      >
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="product-education-heading"
              className="text-3xl font-bold tracking-tight text-slate-900"
            >
              Learn How FinFlowTrack Helps Businesses
            </h2>
            <p className="mt-4 text-slate-600">
              Put what you read into practice with guides built around the product itself.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {productEducationCards.map((card) => (
              <Link
                key={card.title}
                to={card.to}
                className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <card.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">{card.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section aria-labelledby="newsletter-heading" className="mx-auto max-w-4xl px-6 py-20">
        <article className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Mail className="h-6 w-6 text-emerald-600" />
          </div>
          <h2
            id="newsletter-heading"
            className="mt-5 text-2xl font-bold tracking-tight text-slate-900"
          >
            Get Business Finance Insights
          </h2>
          <p className="mt-3 text-slate-600">
            New articles on accounting and small business finance, sent occasionally — no spam.
          </p>
          <form
            className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="you@business.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Subscribe
            </button>
          </form>
        </article>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2
            id="faq-heading"
            className="text-center text-3xl font-bold tracking-tight text-slate-900"
          >
            Frequently Asked Questions
          </h2>
          <div className="mt-12 space-y-6">
            {faqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-base font-semibold text-slate-900">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="final-cta-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-3xl bg-slate-900 px-8 py-16 text-center sm:px-16">
          <h2
            id="final-cta-heading"
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Ready to Simplify Your Accounting?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Put these ideas into practice with a platform built for invoicing, expenses, inventory,
            and reporting.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              View Pricing
            </Link>
            <Link
              to="/features"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Explore Features
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
