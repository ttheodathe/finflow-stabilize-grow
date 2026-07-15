import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  Calculator,
  CalendarClock,
  CheckCircle2,
  Compass,
  Download,
  FileSpreadsheet,
  FileText,
  Globe2,
  Lightbulb,
  Receipt,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/guides")({
  component: GuidesPage,
  head: () => ({
    meta: [
      {
        title: "FinFlowTrack Guides | Accounting & Business Management Resources",
      },
      {
        name: "description",
        content:
          "Learn accounting, invoicing, expense tracking, inventory management, and financial management with practical FinFlowTrack guides for businesses.",
      },
      {
        property: "og:title",
        content: "FinFlowTrack Guides | Accounting & Business Management Resources",
      },
      {
        property: "og:description",
        content:
          "Learn accounting, invoicing, expense tracking, inventory management, and financial management with practical FinFlowTrack guides for businesses.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: "https://www.finflowtrack.com/guides",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://www.finflowtrack.com/guides",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "FinFlowTrack Guides",
          description:
            "Practical accounting and business management guides for freelancers, startups, and growing businesses.",
          url: "https://www.finflowtrack.com/guides",
        }),
      },
    ],
  }),
});

const LAST_UPDATED = "July 12, 2026";

interface LearningPath {
  id: string;
  title: string;
  icon: typeof BookOpen;
  description: string;
  guides: string[];
}

const learningPaths: LearningPath[] = [
  {
    id: "accounting-fundamentals",
    title: "Accounting Fundamentals",
    icon: Calculator,
    description: "The core concepts every business owner should understand.",
    guides: [
      "What is accounting?",
      "Basic accounting terms every business owner should know",
      "Revenue vs. profit explained",
      "Understanding expenses",
      "Cash flow management basics",
      "Balance sheets explained",
    ],
  },
  {
    id: "getting-started",
    title: "Getting Started With FinFlowTrack",
    icon: Rocket,
    description: "Everything you need to set up and start using the platform.",
    guides: [
      "Creating your FinFlowTrack account",
      "Setting up your company workspace",
      "Adding customers and suppliers",
      "Creating your first invoice",
      "Recording your first expense",
      "Understanding the dashboard",
    ],
  },
  {
    id: "invoicing-mastery",
    title: "Invoicing Mastery",
    icon: Receipt,
    description: "Get paid faster with professional, well-structured invoices.",
    guides: [
      "How to create professional invoices",
      "Invoice numbering best practices",
      "Reducing late payments",
      "Payment terms explained",
      "Benefits of digital invoicing",
    ],
  },
  {
    id: "expense-management",
    title: "Expense Management",
    icon: Wallet,
    description: "Keep spending organized and ready for reporting.",
    guides: [
      "Tracking business expenses",
      "Expense categories explained",
      "Receipt management",
      "Business vs. personal expenses",
      "Preparing expenses for tax reporting",
    ],
  },
  {
    id: "inventory-management",
    title: "Inventory Management",
    icon: Boxes,
    description: "Stay on top of stock across products and warehouses.",
    guides: [
      "Inventory management basics",
      "Stock tracking",
      "Warehouse management",
      "Preventing stock shortages",
      "Inventory valuation basics",
    ],
  },
  {
    id: "small-business-finance",
    title: "Small Business Finance",
    icon: TrendingUp,
    description: "Build healthier finances as your business grows.",
    guides: [
      "Startup finance basics",
      "Creating business budgets",
      "Improving profitability",
      "Understanding financial reports",
      "Cash flow management",
    ],
  },
  {
    id: "team-collaboration",
    title: "Team & Business Collaboration",
    icon: Users,
    description: "Coordinate finances across people and companies.",
    guides: [
      "Managing multiple companies",
      "Inviting team members",
      "User permissions",
      "Financial workflow management",
    ],
  },
];

const roadmapSteps = [
  { title: "Create your FinFlowTrack account", description: "Sign up and verify your email to get started." },
  { title: "Set up your company", description: "Add your business details and create your first workspace." },
  { title: "Add customers and suppliers", description: "Build the contacts you'll invoice and purchase from." },
  { title: "Create invoices", description: "Bill your customers and start tracking payments." },
  { title: "Track expenses", description: "Log spending so your records stay accurate and complete." },
  { title: "Analyze reports", description: "Check income, expenses, and cash flow at a glance." },
  { title: "Grow your business", description: "Use your financial clarity to make confident decisions." },
];

const popularGuides = [
  {
    title: "How to Create Your First Invoice",
    description: "A step-by-step walkthrough for sending your first professional invoice.",
    icon: Receipt,
  },
  {
    title: "Complete Expense Tracking Guide",
    description: "Everything you need to record, categorize, and report business expenses.",
    icon: Wallet,
  },
  {
    title: "How Accounting Software Helps Small Businesses",
    description: "Why moving off spreadsheets saves time and reduces costly errors.",
    icon: Lightbulb,
  },
  {
    title: "Free Accounting Software: What to Look For",
    description: "A practical checklist for evaluating free accounting tools.",
    icon: BadgeCheck,
  },
  {
    title: "Managing Multiple Businesses in One Place",
    description: "How to keep separate companies organized without losing clarity.",
    icon: Building2,
  },
];

interface BusinessTypeGroup {
  id: string;
  title: string;
  icon: typeof Globe2;
  guides: string[];
}

const businessTypeGroups: BusinessTypeGroup[] = [
  {
    id: "freelancers",
    title: "Freelancers",
    icon: Sparkles,
    guides: [
      "Accounting tips for freelancers",
      "Tracking freelance income",
      "Managing client payments",
    ],
  },
  {
    id: "startups",
    title: "Startups",
    icon: Rocket,
    guides: [
      "Startup bookkeeping basics",
      "Financial planning for early-stage teams",
      "Preparing investor reporting",
    ],
  },
  {
    id: "small-businesses",
    title: "Small Businesses",
    icon: Building2,
    guides: [
      "Small business accounting checklist",
      "Managing cash flow",
      "Reducing operational costs",
    ],
  },
  {
    id: "ngos",
    title: "NGOs",
    icon: Globe2,
    guides: [
      "NGO financial reporting basics",
      "Expense transparency",
      "Budget management for programs",
    ],
  },
];

const freeResources = [
  { title: "Invoice Template", icon: Receipt },
  { title: "Expense Tracker Template", icon: FileSpreadsheet },
  { title: "Business Budget Template", icon: Calculator },
  { title: "Cash Flow Template", icon: TrendingUp },
  { title: "Financial Reporting Checklist", icon: CheckCircle2 },
];

const expertInsights = [
  {
    title: "Accounting Trends for Small Businesses",
    description: "What's shaping how small businesses manage their finances this year.",
    icon: TrendingUp,
  },
  {
    title: "The Future of Digital Bookkeeping",
    description: "How cloud-based tools are replacing manual, paper-driven processes.",
    icon: Compass,
  },
  {
    title: "AI in Accounting: What It Means for You",
    description: "A grounded look at where automation genuinely helps and where it doesn't.",
    icon: Sparkles,
  },
  {
    title: "Financial Automation Explained",
    description: "How automating routine tasks frees up time for real decision-making.",
    icon: BarChart3,
  },
];

const faqs = [
  {
    question: "Is FinFlowTrack suitable for beginners?",
    answer:
      "Yes. FinFlowTrack is designed so people without a formal accounting background can manage invoices, expenses, and reports with confidence, supported by guides that explain each concept in plain language.",
  },
  {
    question: "Can I learn accounting without experience?",
    answer:
      "Yes. Our Accounting Fundamentals learning path starts with the basics, like what accounting is and how revenue differs from profit, before moving into more practical, day-to-day topics.",
  },
  {
    question: "What accounting tasks can FinFlowTrack help with?",
    answer:
      "FinFlowTrack helps you track income and expenses, create and send invoices, manage inventory, generate financial reports, and collaborate with your team across one or more company workspaces.",
  },
  {
    question: "Can small businesses use free accounting software?",
    answer:
      "Yes. FinFlowTrack offers a free plan that covers core accounting and invoicing needs, with paid plans available as your business grows and needs more features or company workspaces.",
  },
  {
    question: "How does accounting software improve financial accuracy?",
    answer:
      "Accounting software reduces manual data entry and calculation errors, keeps records organized in one place, and makes it easier to spot mistakes early through consistent, structured reporting.",
  },
];

function GuidesPage() {
  const [query, setQuery] = useState("");

  const filteredPaths = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return learningPaths;

    return learningPaths
      .map((path) => {
        const pathMatches = path.title.toLowerCase().includes(trimmed);
        const matchingGuides = path.guides.filter((guide) =>
          guide.toLowerCase().includes(trimmed)
        );
        if (pathMatches) return path;
        if (matchingGuides.length > 0) return { ...path, guides: matchingGuides };
        return null;
      })
      .filter((path): path is LearningPath => path !== null);
  }, [query]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              FinFlowTrack Academy
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Learn Smarter Ways to Manage Your Business Finances
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Explore practical accounting guides, tutorials, and resources
              designed to help freelancers, startups, and growing businesses
              improve financial management.
            </p>

            <div className="mt-10">
              <label htmlFor="guides-search" className="sr-only">
                Search guides
              </label>
              <div className="relative mx-auto max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="guides-search"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search guides, e.g. 'cash flow' or 'invoicing'..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#learning-paths"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Browse Categories
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Featured guide */}
          <div className="mx-auto mt-14 max-w-3xl">
            <article className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
                <Rocket className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Featured Guide
                </span>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  New Business Owner Roadmap: From Sign-Up to First Report
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  A complete walkthrough for setting up FinFlowTrack and
                  running your first full accounting cycle.
                </p>
                <a
                  href="#roadmap"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Start the roadmap
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Featured Learning Paths */}
      <section id="learning-paths" aria-labelledby="paths-heading" className="scroll-mt-20 mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="paths-heading" className="text-3xl font-bold tracking-tight text-slate-900">
            Featured Learning Paths
          </h2>
          <p className="mt-4 text-slate-600">
            Structured guides organized around the way you actually run your
            business.
          </p>
        </div>

        {filteredPaths.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
            <p className="text-sm text-slate-600">
              No guides match "{query}" yet. Try a different search term.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPaths.map((path) => (
              <article
                key={path.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <path.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {path.title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">
                  {path.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {path.guides.map((guide) => (
                    <li key={guide}>
                      <a
                        href="#"
                        className="flex items-start gap-2 text-sm text-slate-600 hover:text-emerald-700"
                      >
                        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {guide}
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Beginner Roadmap */}
      <section id="roadmap" aria-labelledby="roadmap-heading" className="scroll-mt-20 border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
              <Compass className="h-4 w-4 text-emerald-600" />
              Roadmap
            </span>
            <h2 id="roadmap-heading" className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
              New Business Owner Roadmap
            </h2>
            <p className="mt-4 text-slate-600">
              Follow this path from your first sign-up to your first
              complete financial report.
            </p>
          </div>

          <ol className="relative mt-14 space-y-8 border-l border-slate-200 pl-8 sm:mx-auto sm:max-w-2xl">
            {roadmapSteps.map((step, index) => (
              <li key={step.title} className="relative">
                <span className="absolute -left-[calc(2rem+1px)] flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Popular Guides */}
      <section aria-labelledby="popular-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="popular-heading" className="text-3xl font-bold tracking-tight text-slate-900">
            Popular Guides
          </h2>
          <p className="mt-4 text-slate-600">
            The guides business owners come back to most.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {popularGuides.map((guide) => (
            <a
              key={guide.title}
              href="#"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <guide.icon className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {guide.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {guide.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                Read guide
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Guides by Business Type */}
      <section aria-labelledby="business-type-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="business-type-heading" className="text-3xl font-bold tracking-tight text-slate-900">
              Guides by Business Type
            </h2>
            <p className="mt-4 text-slate-600">
              Find guidance tailored to how your organization operates.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {businessTypeGroups.map((group) => (
              <article
                key={group.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <group.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-2">
                  {group.guides.map((guide) => (
                    <li key={guide}>
                      <a
                        href="#"
                        className="flex items-start gap-2 text-sm text-slate-600 hover:text-emerald-700"
                      >
                        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {guide}
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Free Resources */}
      <section aria-labelledby="resources-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="resources-heading" className="text-3xl font-bold tracking-tight text-slate-900">
            Free Resources
          </h2>
          <p className="mt-4 text-slate-600">
            Practical templates to help you get organized right away.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {freeResources.map((resource) => (
            <a
              key={resource.title}
              href="#"
              className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <resource.icon className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                {resource.title}
              </h3>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <Download className="h-3.5 w-3.5" />
                Download
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Expert Insights */}
      <section aria-labelledby="insights-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
              <Lightbulb className="h-4 w-4 text-emerald-600" />
              FinFlowTrack Insights
            </span>
            <h2 id="insights-heading" className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
              Perspectives on Where Accounting Is Headed
            </h2>
            <p className="mt-4 text-slate-600">
              Grounded takes on the trends shaping financial management for
              growing businesses.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {expertInsights.map((insight) => (
              <a
                key={insight.title}
                href="#"
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <insight.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {insight.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {insight.description}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="mx-auto max-w-4xl px-6 py-20">
        <h2 id="faq-heading" className="text-center text-3xl font-bold tracking-tight text-slate-900">
          Frequently Asked Questions
        </h2>
        <div className="mt-12 space-y-6">
          {faqs.map((faq) => (
            <article
              key={faq.question}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-base font-semibold text-slate-900">
                {faq.question}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {faq.answer}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section aria-labelledby="trust-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-10 text-center">
          <h2 id="trust-heading" className="sr-only">
            Trust and freshness
          </h2>
          <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" />
            Guides last reviewed and updated {LAST_UPDATED}
          </p>
          <p className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" />
            Written to reflect real FinFlowTrack features — see our{" "}
            <Link to="/security" className="font-medium text-emerald-700 hover:text-emerald-800">
              Security
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-medium text-emerald-700 hover:text-emerald-800">
              Privacy
            </Link>{" "}
            pages for details.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="final-cta-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-3xl bg-slate-900 px-8 py-16 text-center sm:px-16">
          <h2 id="final-cta-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to Simplify Your Business Finances?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Put these guides into practice inside FinFlowTrack. Start free,
            no credit card required.
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
