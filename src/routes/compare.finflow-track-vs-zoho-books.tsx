import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  Check,
  Minus,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  FileText,
  Receipt,
  BarChart3,
  Globe,
  Plug,
  Building2,
  Landmark,
  Package,
  Clock,
  ExternalLink,
} from "lucide-react";

const SITE_URL = "https://finflowtrack.com";
const PAGE_URL = `${SITE_URL}/compare/finflow-track-vs-zoho-books`;
const REVIEWED_DATE = "2026-08-14";
const REVIEWED_DATE_LABEL = "August 14, 2026";

export const Route = createFileRoute("/compare/finflow-track-vs-zoho-books")({
  component: ComparePage,
  head: () => {
    const title = "FinFlow Track vs Zoho Books: Which Is Better?";
    const description =
      "Compare FinFlow Track vs Zoho Books on pricing, accounting, invoicing, expenses, inventory, multi-currency, automation and reporting.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: PAGE_URL },
        {
          property: "og:image",
          content:
            "https://storage.googleapis.com/gpt-engineer-file-uploads/KejLjbxTBUejhiLW6UCHkKwwaTT2/social-images/social-1784143006384-favicon.webp",
        },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: PAGE_URL }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Compare", item: `${SITE_URL}/compare` },
              {
                "@type": "ListItem",
                position: 3,
                name: "FinFlow Track vs Zoho Books",
                item: PAGE_URL,
              },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: title,
            description,
            url: PAGE_URL,
            datePublished: REVIEWED_DATE,
            dateModified: REVIEWED_DATE,
            isPartOf: { "@type": "WebSite", name: "FinFlow Track", url: SITE_URL },
            publisher: { "@type": "Organization", name: "FinFlow Track", url: SITE_URL },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          }),
        },
      ],
    };
  },
});

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type Availability = "yes" | "no" | "partial";

function StatusMark({ status, label }: { status: Availability; label?: string }) {
  if (status === "yes") {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 text-sm">
        <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
        <span className="sr-only">Available</span>
        {label && <span>{label}</span>}
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <span aria-hidden="true">◐</span>
        <span>{label ?? "Plan dependent"}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
      <Minus className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">Not currently available</span>
      {label && <span>{label}</span>}
    </span>
  );
}

const atAGlanceRows: {
  category: string;
  finflow: { status: Availability; label?: string };
  zoho: { status: Availability; label?: string };
}[] = [
  {
    category: "Free plan (ongoing, not a trial)",
    finflow: { status: "yes", label: "1 company, 2 users, no revenue cap" },
    zoho: { status: "partial", label: "1 user + 1 accountant, revenue under $50K/year" },
  },
  {
    category: "Entry paid plan",
    finflow: { status: "yes", label: "$19/month (Professional)" },
    zoho: { status: "yes", label: "$20/month, or $15/mo billed annually (Standard)" },
  },
  {
    category: "Invoicing & estimates",
    finflow: { status: "yes", label: "Unlimited, every plan" },
    zoho: { status: "partial", label: "Unlimited creation, but capped invoices/year by plan" },
  },
  {
    category: "Expense tracking",
    finflow: { status: "yes" },
    zoho: { status: "yes" },
  },
  {
    category: "Full accounting (chart of accounts, journals, balance sheet)",
    finflow: { status: "partial", label: "Professional plan and above" },
    zoho: { status: "yes", label: "Included on every plan, including Free" },
  },
  {
    category: "Bank reconciliation",
    finflow: { status: "partial", label: "Professional plan and above; CSV import" },
    zoho: { status: "yes", label: "Free plan (manual); live bank feeds on Standard+" },
  },
  {
    category: "Recurring invoices",
    finflow: { status: "partial", label: "Professional plan and above" },
    zoho: { status: "yes", label: "Included on Free" },
  },
  {
    category: "Cash-flow forecasting",
    finflow: { status: "no" },
    zoho: { status: "partial", label: "Premium plan and above" },
  },
  {
    category: "Multi-currency",
    finflow: { status: "yes", label: "50+ currencies, every plan including Free" },
    zoho: { status: "partial", label: "Professional plan and above" },
  },
  {
    category: "Inventory management",
    finflow: { status: "partial", label: "Professional plan and above" },
    zoho: { status: "partial", label: "Basic on Professional+; advanced on Elite+" },
  },
  {
    category: "AI Bookkeeper / receipt scanning",
    finflow: { status: "partial", label: "Professional plan and above" },
    zoho: { status: "yes", label: "Receipt autoscan included from Free (50 scans/month)" },
  },
  {
    category: "Purchase orders",
    finflow: { status: "partial", label: "Professional plan and above" },
    zoho: { status: "partial", label: "Professional plan and above" },
  },
  {
    category: "Projects / time tracking",
    finflow: { status: "no" },
    zoho: { status: "partial", label: "Professional plan and above" },
  },
  {
    category: "Multiple companies",
    finflow: { status: "yes", label: "Plan-dependent limits, one account" },
    zoho: { status: "yes", label: "Multiple organizations; each typically billed separately" },
  },
  {
    category: "Custom user roles",
    finflow: { status: "no" },
    zoho: { status: "partial", label: "Professional plan and above" },
  },
  {
    category: "Third-party integrations",
    finflow: { status: "no", label: "In development" },
    zoho: { status: "yes", label: "Broad Zoho ecosystem plus 20+ external tools" },
  },
  {
    category: "Best for",
    finflow: {
      status: "yes",
      label: "Simple, predictable pricing with multi-currency at every tier",
    },
    zoho: {
      status: "yes",
      label: "Businesses that will grow into deeper accounting and inventory needs",
    },
  },
];

const freePlanRows: {
  feature: string;
  finflow: { status: Availability; label?: string };
  zoho: { status: Availability; label?: string };
}[] = [
  {
    feature: "Who qualifies",
    finflow: { status: "yes", label: "Anyone — no revenue limit" },
    zoho: { status: "partial", label: "Annual revenue under $50,000 (US)" },
  },
  {
    feature: "Users",
    finflow: { status: "yes", label: "Up to 2" },
    zoho: { status: "partial", label: "1 user + 1 accountant" },
  },
  {
    feature: "Invoicing / estimates",
    finflow: { status: "yes", label: "Unlimited" },
    zoho: { status: "partial", label: "Up to 1,000 invoices/year" },
  },
  {
    feature: "Expenses",
    finflow: { status: "yes" },
    zoho: { status: "partial", label: "Up to 1,000 expenses/year" },
  },
  {
    feature: "Recurring invoices",
    finflow: { status: "no", label: "Requires Professional" },
    zoho: { status: "yes" },
  },
  {
    feature: "Bank reconciliation",
    finflow: { status: "no", label: "Requires Professional" },
    zoho: { status: "yes", label: "Manual; live feeds require Standard" },
  },
  {
    feature: "Full financial reports (P&L, Balance Sheet)",
    finflow: { status: "no", label: "Basic reports only; full reports require Professional" },
    zoho: { status: "yes", label: "Included, with 50+ report types" },
  },
  {
    feature: "Online invoice payments",
    finflow: { status: "no" },
    zoho: { status: "yes" },
  },
  {
    feature: "Receipt / document AI scanning",
    finflow: { status: "no", label: "Requires Professional" },
    zoho: { status: "yes", label: "50 autoscans/month" },
  },
  {
    feature: "Multi-currency (base currency)",
    finflow: { status: "yes", label: "50+ currencies" },
    zoho: { status: "no", label: "Requires Professional" },
  },
  {
    feature: "Inventory",
    finflow: { status: "no", label: "Requires Professional" },
    zoho: { status: "no", label: "Requires Professional" },
  },
  {
    feature: "Support",
    finflow: { status: "yes", label: "Standard support" },
    zoho: { status: "partial", label: "Email only" },
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "Is FinFlow Track better than Zoho Books?",
    a: "Neither is universally better — the two products make different trade-offs. FinFlow Track keeps its Free plan open to any business (no revenue cap) and includes multi-currency support from day one, but reserves full accounting, bank reconciliation, inventory, and AI bookkeeping for its Professional plan and above. Zoho Books' Free plan is more feature-rich in several ways — it includes full accounting, bank reconciliation, recurring invoices, and online payments — but is capped to businesses earning under $50,000/year and a single user. Which is better depends on your revenue, team size, and whether you need multi-currency support before you're ready to pay.",
  },
  {
    q: "Is FinFlow Track cheaper than Zoho Books?",
    a: `FinFlow Track's paid tiers start at $19/month (Professional) and $49/month (Business). Zoho Books spans a wider range — $20/month (or $15/month billed annually) for Standard up to $275/month for Ultimate, as of ${REVIEWED_DATE_LABEL} — plus optional add-ons for extra users, document autoscans, and other capabilities. For a business that only needs core invoicing, expenses, and multi-currency, FinFlow Track's entry-level paid plan is typically less expensive than Zoho Books' comparable tier. For a business that needs Zoho's deeper inventory or advanced-reporting features, its higher tiers reflect that added functionality.`,
  },
  {
    q: "Is FinFlow Track a good Zoho Books alternative?",
    a: "It can be, particularly for businesses that want multi-currency support without upgrading to a mid-tier plan, or that want a free plan with no revenue ceiling. Businesses that need Zoho's more mature inventory management, its native Zoho ecosystem integrations (CRM, Expense, Inventory), or advanced automation should weigh those specifically against FinFlow Track's current, smaller feature set before switching.",
  },
  {
    q: "Does Zoho Books have a free plan?",
    a: "Yes. Zoho Books' Free plan is available indefinitely as long as your business's annual revenue stays under $50,000 (US market), for 1 user plus 1 accountant, with usage capped at 1,000 invoices and 1,000 expenses per year. It's more feature-rich than many free accounting plans — including full financial reports, bank reconciliation, recurring invoices, and online payments — but the revenue cap means growing businesses will eventually need to upgrade.",
  },
  {
    q: "Does FinFlow Track have a free plan?",
    a: "Yes. FinFlow Track's Free plan has no revenue restriction and includes invoicing, expense tracking, customer management, multi-currency support, and basic reports for one company and up to two team members. Full accounting reports, bank reconciliation, inventory, and AI bookkeeping require the Professional plan.",
  },
  {
    q: "Which is better for small businesses?",
    a: "A small business earning under $50,000/year that wants full accounting and bank reconciliation for free may prefer Zoho Books' Free plan. A business already past that revenue threshold, or one that specifically needs multi-currency support without paying for a mid-tier plan, may find FinFlow Track's pricing structure more straightforward. Businesses with complex inventory or multi-department needs are likely to eventually need Zoho Books' higher tiers.",
  },
  {
    q: "Which supports multi-currency?",
    a: "Both do, but differently. FinFlow Track includes multi-currency support (50+ currencies) as a base-currency and invoice-level feature on every plan, including Free. Zoho Books supports multi-currency transactions and reporting starting on its Professional plan ($50/month, or $40/month billed annually) — it isn't available on the Free or Standard plans.",
  },
  {
    q: "Which has better inventory management?",
    a: "It depends on how advanced your needs are. FinFlow Track offers inventory (products, services, multiple warehouses, stock movements) starting on its Professional plan at $19/month. Zoho Books offers basic inventory tracking (sales/purchase orders, price lists) starting on its Professional plan at $50/month, with advanced capabilities — composite items, serial and batch tracking, bin locations, and direct integrations with Etsy, eBay, Amazon, and Shopify — reserved for its Elite plan at $150/month. For straightforward inventory needs, FinFlow Track is more affordable; for complex, multi-warehouse retail or e-commerce inventory, Zoho Books' higher tiers currently offer more depth.",
  },
  {
    q: "Can I switch from Zoho Books to FinFlow Track?",
    a: "FinFlow Track does not currently offer a direct, automated Zoho Books import. You can export supported records from Zoho Books and re-create customers, invoices, bills, and opening balances in FinFlow Track as part of onboarding. See the switching section above for a general migration approach.",
  },
  {
    q: "Does FinFlow Track support AI bookkeeping?",
    a: "Yes, on the Professional plan and above. FinFlow Track's AI Bookkeeper is a conversational assistant that answers questions about your live business data — such as revenue for a period or which invoices are overdue — and its AI document scanning extracts structured data (vendor, amount, date, category) from uploaded receipts to speed up expense entry. Both are unavailable on the Free plan.",
  },
];

const relatedBlogPosts = [
  {
    title: "What Is Accounting Software?",
    slug: "what-is-accounting-software",
  },
  {
    title: "The Complete Guide to Small Business Accounting",
    slug: "complete-guide-to-small-business-accounting",
  },
  {
    title: "Inventory Management Basics",
    slug: "inventory-management-basics",
  },
  {
    title: "Tracking Business Expenses: A Practical Guide",
    slug: "tracking-business-expenses-guide",
  },
  {
    title: "How to Create Professional Invoices",
    slug: "how-to-create-professional-invoices",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ComparePage() {
  return (
    <div className="bg-background">
      <SiteHeader />

      {/* Breadcrumb */}
      <div className="border-b">
        <div className="container mx-auto max-w-7xl px-6 py-4">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link to="/" className="hover:text-foreground">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-foreground" aria-current="page">
                FinFlow Track vs Zoho Books
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* HERO */}
      <section className="border-b">
        <div className="container mx-auto max-w-5xl px-6 py-16 lg:py-20">
          <span className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            Accounting Software Comparison
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight lg:text-5xl">
            FinFlow Track vs Zoho Books: Which Is Better for Small Businesses?
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Zoho Books is a mature accounting platform with six pricing tiers, deep inventory
            tools, and a broad app ecosystem. FinFlow Track is a newer, more focused platform built
            around a smaller number of plans, with multi-currency support included from the free
            tier. Neither is a simple "cheaper" or "more features" story — Zoho Books' free plan is
            actually more feature-rich in several respects, but capped by revenue, while FinFlow
            Track's free plan has no revenue ceiling but reserves accounting, inventory, and AI
            bookkeeping for its paid tier. This guide compares both feature by feature so you can
            see exactly where each one fits.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/signup"
              search={{ plan: "free" }}
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-primary-foreground"
            >
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link to="/pricing" className="rounded-lg border px-6 py-3 hover:bg-muted">
              View Pricing
            </Link>
          </div>

          {/* Trust / review info */}
          <div className="mt-10 flex flex-col gap-2 rounded-xl border bg-muted/40 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              <strong className="text-foreground">Comparison reviewed:</strong>{" "}
              {REVIEWED_DATE_LABEL}
            </span>
            <span className="max-w-xl">
              Product features, pricing, and availability can change. Verify current information
              with each provider before making a purchasing decision. Zoho Books pricing shown is
              for the U.S. market.
            </span>
          </div>
        </div>
      </section>

      {/* QUICK ANSWER */}
      <section className="container mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold">FinFlow Track vs Zoho Books: Quick Answer</h2>
        <div className="mt-6 space-y-4 text-lg leading-8 text-muted-foreground">
          <p>
            <strong className="text-foreground">FinFlow Track</strong> may be the better fit if you
            want a straightforward set of plans, need multi-currency support without paying for a
            mid-tier subscription, prefer predictable pricing as you grow, or your business hasn't
            outgrown its current, more focused invoicing, expense, and reporting workflows.
          </p>
          <p>
            <strong className="text-foreground">Zoho Books</strong> may be the better fit if you
            need its mature accounting ecosystem, extensive integrations (particularly with other
            Zoho apps), advanced inventory management, established multi-tier reporting, or a
            specific capability — like cash-flow forecasting, project time-billing, or marketplace
            integrations — that FinFlow Track doesn't currently offer.
          </p>
          <p>
            Neither is universally cheaper or more capable — it depends on your revenue, team size,
            and which specific features you need unlocked at which price point.
          </p>
        </div>
      </section>

      {/* AT A GLANCE */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-bold">At a Glance</h2>
          <p className="mt-3 text-muted-foreground">
            A high-level snapshot. See the feature-by-feature sections below for details.
          </p>

          <div className="mt-8 overflow-x-auto rounded-2xl border bg-background">
            <table className="min-w-full">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-5 py-4 text-left text-sm font-semibold">
                    Category
                  </th>
                  <th scope="col" className="px-5 py-4 text-center text-sm font-semibold">
                    FinFlow Track
                  </th>
                  <th scope="col" className="px-5 py-4 text-center text-sm font-semibold">
                    Zoho Books
                  </th>
                </tr>
              </thead>
              <tbody>
                {atAGlanceRows.map((row) => (
                  <tr key={row.category} className="border-t">
                    <th
                      scope="row"
                      className="px-5 py-4 text-left text-sm font-medium text-foreground"
                    >
                      {row.category}
                    </th>
                    <td className="px-5 py-4 text-center">
                      <StatusMark status={row.finflow.status} label={row.finflow.label} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusMark status={row.zoho.status} label={row.zoho.label} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            "Plan dependent" or partial markers indicate the feature varies by plan or has usage
            limits — confirm current details on Zoho's official site before deciding.
          </p>
        </div>
      </section>

      {/* FREE PLAN COMPARISON */}
      <section className="container mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold">FinFlow Track vs Zoho Books Free Plan</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Both platforms offer a genuinely free plan, but the trade-offs are different. FinFlow
          Track's Free plan has no revenue restriction but keeps several core capabilities on its
          paid tier. Zoho Books' Free plan unlocks more out of the gate — including full accounting
          and bank reconciliation — but is limited to businesses earning under $50,000/year with a
          single user. Checked on {REVIEWED_DATE_LABEL}.
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border bg-background">
          <table className="min-w-full">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="px-5 py-4 text-left text-sm font-semibold">
                  Feature
                </th>
                <th scope="col" className="px-5 py-4 text-center text-sm font-semibold">
                  FinFlow Track Free
                </th>
                <th scope="col" className="px-5 py-4 text-center text-sm font-semibold">
                  Zoho Books Free
                </th>
              </tr>
            </thead>
            <tbody>
              {freePlanRows.map((row) => (
                <tr key={row.feature} className="border-t">
                  <th scope="row" className="px-5 py-4 text-left text-sm font-medium text-foreground">
                    {row.feature}
                  </th>
                  <td className="px-5 py-4 text-center">
                    <StatusMark status={row.finflow.status} label={row.finflow.label} />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <StatusMark status={row.zoho.status} label={row.zoho.label} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 space-y-3 max-w-3xl text-muted-foreground leading-7">
          <p>
            <strong className="text-foreground">Worth calling out directly:</strong> Zoho Books'
            Free plan is more capable than FinFlow Track's in several respects — it includes full
            financial reports, bank reconciliation, recurring invoices, and online payment
            acceptance, none of which are on FinFlow Track's Free plan today. In exchange, it's
            capped to a single user and a business earning under $50,000/year — a business that
            outgrows either limit needs to upgrade.
          </p>
          <p>
            FinFlow Track's Free plan has no revenue cap and supports a second team member, and
            includes multi-currency support that Zoho Books doesn't unlock until its Professional
            plan — but full accounting, inventory, and AI-assisted bookkeeping require upgrading to
            Professional.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-bold">FinFlow Track vs Zoho Books Pricing</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Figures below checked on {REVIEWED_DATE_LABEL}. Zoho Books pricing shown is for the
            U.S. market — pricing and available plans vary by country. Prices are exclusive of
            local taxes.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {/* FinFlow Track pricing card */}
            <div className="rounded-2xl border bg-background p-8">
              <h3 className="text-xl font-bold">FinFlow Track</h3>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center justify-between border-b pb-3">
                  <span>Free</span>
                  <span className="font-semibold">$0/month</span>
                </li>
                <li className="flex items-center justify-between border-b pb-3">
                  <span>Professional</span>
                  <span className="font-semibold">$19/month</span>
                </li>
                <li className="flex items-center justify-between border-b pb-3">
                  <span>Business</span>
                  <span className="font-semibold">$49/month</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Enterprise</span>
                  <span className="font-semibold">Custom pricing</span>
                </li>
              </ul>
              <p className="mt-6 text-xs text-muted-foreground">
                Market: Global · Currency: USD · Billing: Monthly (annual billing available at a
                discount) · Date checked: {REVIEWED_DATE_LABEL}. See{" "}
                <Link to="/pricing" className="underline hover:text-foreground">
                  the pricing page
                </Link>{" "}
                for current details. Four plans total, with a flat feature set per tier and no
                separate add-on marketplace today.
              </p>
            </div>

            {/* Zoho Books pricing card */}
            <div className="rounded-2xl border bg-background p-8">
              <h3 className="text-xl font-bold">Zoho Books (U.S.)</h3>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center justify-between border-b pb-3">
                  <span>Free</span>
                  <span className="font-semibold">$0/month</span>
                </li>
                <li className="flex items-center justify-between border-b pb-3">
                  <span>Standard</span>
                  <span className="font-semibold">$20/month ($15 billed annually)</span>
                </li>
                <li className="flex items-center justify-between border-b pb-3">
                  <span>Professional</span>
                  <span className="font-semibold">$50/month ($40 billed annually)</span>
                </li>
                <li className="flex items-center justify-between border-b pb-3">
                  <span>Premium</span>
                  <span className="font-semibold">$70/month ($60 billed annually)</span>
                </li>
                <li className="flex items-center justify-between border-b pb-3">
                  <span>Elite</span>
                  <span className="font-semibold">$150/month ($120 billed annually)</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Ultimate</span>
                  <span className="font-semibold">$275/month ($240 billed annually)</span>
                </li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground leading-7">
                Six plans total, priced per organization (not per user). Each tier includes a set
                number of users (1 on Free up to 15 on Ultimate); extra users cost $3/month ($2.50
                billed annually) each. Optional add-ons — document autoscans, extra locations,
                expense-claim management, and Zoho's BillPay accounts-payable automation — are
                priced separately and mostly unavailable on the Free plan.
              </p>
              <a
                href="https://www.zoho.com/us/books/pricing/"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                View official Zoho Books pricing
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="mt-4 text-xs text-muted-foreground">
                Date checked: {REVIEWED_DATE_LABEL}. Verify current pricing, plan inclusions, and
                add-on costs on Zoho's official pricing page before subscribing — pricing differs
                outside the U.S. and add-on rates change periodically.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border bg-background p-6 text-sm text-muted-foreground leading-7">
            <strong className="text-foreground">A note on total cost:</strong> Compare what each
            plan actually unlocks, not just the sticker price. FinFlow Track's $19/month
            Professional plan and Zoho Books' $50/month Professional plan sit at different price
            points but both unlock multi-currency and inventory — Zoho's version of each is more
            mature, which is part of why it costs more. Factor in Zoho's per-user and add-on fees if
            you expect to need more than a plan's included user count or extra capabilities like
            document autoscans.
          </div>
        </div>
      </section>

      {/* FEATURE COMPARISON */}
      <section className="container mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold">Feature-by-Feature Comparison</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          The sections below compare specific workflows in more detail. FinFlow Track claims
          reflect what is actually implemented and plan-gated in the product; Zoho Books claims are
          limited to what Zoho publishes officially, with links where useful.
        </p>

        <div className="mt-12 space-y-14">
          <FeatureBlock icon={Wallet} title="Accounting and Bookkeeping">
            <p>
              <strong>FinFlow Track's</strong> Free plan includes invoicing, expense tracking, and
              basic reports. Full double-entry bookkeeping — chart of accounts, journal entries,
              general ledger, and trial balance — requires the Professional plan and above.
            </p>
            <p>
              <strong>Zoho Books</strong> includes full accounting on every plan, including Free:
              journals, a general ledger, and reports like Profit &amp; Loss and Balance Sheet are
              available from day one. Higher tiers add features like transaction period locking,
              custom journal templates, and fixed-asset management rather than gating core
              bookkeeping itself.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={FileText} title="Invoicing">
            <p>
              <strong>FinFlow Track</strong> includes unlimited invoice creation and customization,
              estimates, payment status tracking, and customer management on every plan, including
              Free. Recurring invoices and credit notes require the Professional plan.
            </p>
            <p>
              <strong>Zoho Books</strong> includes invoicing, quotes, and recurring invoices on
              every plan, including Free — but each plan caps the number of invoices you can create
              per year (1,000 on Free, up to 100,000 on Elite/Ultimate). Progress invoicing (billing
              a project in stages) requires the Standard plan and above.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Receipt} title="Expense Tracking">
            <p>
              <strong>FinFlow Track</strong> supports manual expense entry and categorization on
              every plan, including Free. AI-assisted receipt and document scanning — which
              extracts vendor, amount, currency, date, and category from an uploaded image —
              requires the Professional plan.
            </p>
            <p>
              <strong>Zoho Books</strong> supports manual expense entry on every plan and includes
              AI-assisted receipt "autoscanning" starting on the Free plan (50 scans/month), scaling
              up to 1,000 scans/month on Premium and above. Mileage tracking is also included from
              Free.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Landmark} title="Bank Connections and Reconciliation">
            <p>
              <strong>FinFlow Track</strong> supports bank account tracking and reconciliation
              starting on the Professional plan; statement data is imported via CSV file rather than
              a live, automatic bank connection on any plan.
            </p>
            <p>
              <strong>Zoho Books</strong> includes bank reconciliation on its Free plan, and adds
              automatic bank feed connections (importing transactions directly from your bank)
              starting on the Standard plan. This is a genuine advantage for businesses that want
              less manual data entry from day one.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={BarChart3} title="Cash-Flow Management">
            <p>
              <strong>FinFlow Track</strong> surfaces cash-flow visibility on the main dashboard,
              drawing on recorded income and expense transactions. It does not currently include a
              dedicated cash-flow forecasting report — cash-flow-style questions can be asked
              conversationally through the AI Bookkeeper (Professional plan and above), which
              analyzes existing recorded data rather than producing a formal projection.
            </p>
            <p>
              <strong>Zoho Books</strong> includes a dedicated cash-flow forecasting tool starting
              on its Premium plan ($70/month, or $60/month billed annually) alongside budgeting
              tools — a genuine capability FinFlow Track doesn't currently match at any price point.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={BarChart3} title="Financial Reporting">
            <p>
              <strong>FinFlow Track's</strong> Free plan includes basic reports; Profit &amp; Loss,
              Balance Sheet, Trial Balance, General Ledger, and Journals require the Professional
              plan and above.
            </p>
            <p>
              <strong>Zoho Books</strong> includes Profit &amp; Loss, Balance Sheet, and more than
              50 report types on every plan, including Free — the differences at higher tiers are
              mainly about how many reports you can schedule (5/month on Free, up to 200/month on
              Professional and above) and features like custom report building and dashboard
              customization.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Globe} title="Multi-Currency Support">
            <p>
              <strong>FinFlow Track</strong> supports more than 50 ISO currencies as the company's
              base currency on every plan, including Free, with currency selection also available
              at the invoice level.
            </p>
            <p>
              <strong>Zoho Books</strong> supports recording multi-currency transactions and
              reporting, but only starting on its Professional plan ($50/month, or $40/month billed
              annually) — it's not available on Free or Standard. For a business that needs to bill
              or transact in a foreign currency before it's ready to pay $50/month, this is a
              meaningful practical difference in FinFlow Track's favor.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Package} title="Inventory Management">
            <p>
              <strong>FinFlow Track</strong> includes an inventory module — products, services,
              multiple warehouses, and stock movement tracking — starting on the Professional plan
              at $19/month.
            </p>
            <p>
              <strong>Zoho Books</strong> adds basic inventory tracking (sales orders, purchase
              orders, price lists) starting on its Professional plan at $50/month. Its Elite plan
              ($150/month) adds significantly more advanced capabilities: composite items, serial
              and batch number tracking, bin locations, shipment tracking, and direct integrations
              with sales channels like Etsy, eBay, Amazon, and Shopify. For businesses with complex,
              multi-warehouse, or e-commerce-heavy inventory needs, Zoho Books' higher tiers
              currently offer meaningfully more depth than FinFlow Track — this is a genuine
              strength worth acknowledging directly.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Sparkles} title="AI and Automation">
            <p>
              <strong>FinFlow Track's AI Bookkeeper</strong> (Professional plan and above) is a
              conversational assistant that answers questions about your live business data — for
              example, revenue for a period, top customers, or which invoices are overdue — by
              querying your existing records. Separately, its document AI extracts structured data
              from uploaded receipts to speed up expense entry, also starting on Professional.
              Neither is available on the Free plan.
            </p>
            <p>
              <strong>Zoho Books</strong> includes AI-assisted receipt "autoscanning" starting on
              the Free plan. It also offers Zia, Zoho's broader AI layer, which can be configured
              within Zoho Books to support natural-language queries over your data and generate
              plain-language report summaries; the depth of Zia's functionality and which AI
              provider powers it are configurable in settings, and can depend on your broader Zoho
              setup. Confirm current Zia availability and requirements on Zoho's official AI
              documentation.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Clock} title="Projects and Time Tracking">
            <p>
              <strong>FinFlow Track</strong> does not currently include a dedicated
              projects/time-tracking module for job costing or project profitability.
            </p>
            <p>
              <strong>Zoho Books</strong> includes project tracking, timesheet billing, and project
              profitability reporting starting on its Professional plan ($50/month).
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Building2} title="Multiple Companies and User Roles">
            <p>
              <strong>FinFlow Track</strong> supports multiple companies and team members within a
              single account, with limits that scale by plan — from 1 company / 2 users on Free up
              to unlimited companies and users on Enterprise. Custom, granular user roles are not
              currently a distinct configurable feature.
            </p>
            <p>
              <strong>Zoho Books</strong> lets you run multiple businesses as separate
              organizations under one account, though each organization is typically set up (and
              billed) as its own subscription rather than sharing one plan's limits. Custom user
              roles — defining exactly what each team member can see and do — are available starting
              on the Professional plan.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Plug} title="Integrations">
            <p>
              <strong>FinFlow Track's</strong> integration marketplace is still in development. As
              of {REVIEWED_DATE_LABEL}, the product does not have a public catalog of live
              third-party integrations; planned categories (payments, banking, productivity, CRM,
              e-commerce, and automation) are listed on the{" "}
              <Link to="/integrations" className="underline hover:text-foreground">
                integrations page
              </Link>{" "}
              as future connections rather than currently available ones. Its Business plan includes
              API access for custom connections.
            </p>
            <p>
              <strong>Zoho Books</strong> connects natively to other Zoho applications (Zoho CRM,
              Zoho Inventory, Zoho Expense, Zoho Billing, and more), payment gateways (PayPal,
              Stripe, Square, and others), and general-purpose tools like Google Drive, Dropbox, and
              Slack, plus broader automation through Zapier. This is a genuine, verifiable advantage
              for businesses that already use other Zoho products or need pre-built connections
              today.
            </p>
          </FeatureBlock>
        </div>
      </section>

      {/* EASE OF USE */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-bold">Which Is Easier to Use?</h2>
          <div className="mt-6 space-y-4 text-lg leading-8 text-muted-foreground">
            <p>
              Ease of use is subjective and depends on prior experience. Zoho Books is widely
              reviewed as approachable for non-accountants, though its six-plan structure — and the
              fact that specific features (multi-currency, inventory, cash-flow forecasting, custom
              roles) sit behind different tiers — adds a layer of complexity when deciding which
              plan to buy.
            </p>
            <p>
              FinFlow Track's smaller set of plans and more focused feature list may be simpler to
              reason about: there are two clear price points to choose between if you need
              multi-currency or accounting features, rather than six.
            </p>
            <p>
              If you're evaluating either product, both offer a genuinely free plan (subject to
              Zoho Books' revenue cap), so testing onboarding and day-to-day navigation for your
              specific workflows before committing is realistic on both sides.
            </p>
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section className="container mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold">Security and Privacy</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border bg-background p-6">
            <ShieldCheck className="mb-4 h-8 w-8 text-primary" />
            <h3 className="font-semibold">FinFlow Track</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              FinFlow Track uses encrypted (HTTPS) communication, authenticated user sessions, and
              role-based permissions to control what each team member can access. Data is stored on
              managed cloud infrastructure with row-level access controls. FinFlow Track does not
              claim regulatory certifications it has not obtained — see the{" "}
              <Link to="/security" className="underline hover:text-foreground">
                security page
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline hover:text-foreground">
                privacy policy
              </Link>{" "}
              for full details.
            </p>
          </div>
          <div className="rounded-xl border bg-background p-6">
            <ShieldCheck className="mb-4 h-8 w-8 text-primary" />
            <h3 className="font-semibold">Zoho Books</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Zoho states that Zoho Books encrypts customer data both in transit and at rest (using
              256-bit AES for data at rest), supports two-factor authentication, and is included
              under Zoho's PCI DSS compliance and ISO 27001, ISO 27017, and ISO 27018 certifications,
              alongside SOC 2 Type II audits. Review Zoho's{" "}
              <a
                href="https://www.zoho.com/security.html"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline hover:text-foreground"
              >
                official security information
              </a>{" "}
              and{" "}
              <a
                href="https://www.zoho.com/privacy.html"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline hover:text-foreground"
              >
                Zoho privacy policy
              </a>{" "}
              for current, authoritative details.
            </p>
          </div>
        </div>
      </section>

      {/* SUPPORT */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-bold">Customer Support</h2>
          <div className="mt-6 grid gap-8 md:grid-cols-2 text-muted-foreground leading-7">
            <div>
              <h3 className="font-semibold text-foreground">FinFlow Track</h3>
              <p className="mt-3 text-sm">
                Support level scales with plan: standard support on Free, priority email support on
                Professional, priority support on Business, and dedicated support on Enterprise, per
                FinFlow Track's published pricing tiers. General help resources are available on the{" "}
                <Link to="/help" className="underline hover:text-foreground">
                  help center
                </Link>
                .
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Zoho Books</h3>
              <p className="mt-3 text-sm">
                Zoho states that email support is available on every plan, including Free, and that
                Standard plan and above add phone and live chat support. Zoho's US support line and
                email are staffed Monday to Friday, 9 AM to 9 PM Eastern.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* STRENGTHS */}
      <section className="container mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border p-8">
            <h2 className="text-2xl font-bold">FinFlow Track Strengths</h2>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {[
                "Free plan with no revenue restriction",
                "Native multi-currency support across 50+ currencies on every plan, including Free",
                "Simple, predictable four-plan structure",
                "Inventory available starting at a lower price point ($19/month) than Zoho Books",
                "AI Bookkeeper and AI receipt scanning included on Professional and above",
                "No separate add-on marketplace to navigate for core functionality",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border p-8">
            <h2 className="text-2xl font-bold">Zoho Books Strengths</h2>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {[
                "Full accounting, bank reconciliation, and recurring invoices included on its Free plan",
                "Advanced inventory management (serial/batch tracking, marketplace integrations) at Elite",
                "Built-in cash-flow forecasting and budgeting on Premium and above",
                "Broad Zoho ecosystem integrations plus 20+ external tools",
                "Project time tracking and profitability reporting",
                "ISO 27001/27017/27018 and SOC 2 Type II certifications",
                "Six pricing tiers that scale precisely with business complexity",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* LIMITATIONS */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border bg-background p-8">
              <h2 className="text-2xl font-bold">FinFlow Track Limitations</h2>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                {[
                  "Full accounting reports, bank reconciliation, and inventory are not available on Free",
                  "No live bank feed connections yet — bank data comes in via CSV import",
                  "No cash-flow forecasting, project time tracking, or custom user roles yet",
                  "Third-party integration marketplace is still in development",
                  "Inventory is less mature than Zoho Books' higher tiers (no serial/batch tracking or marketplace integrations)",
                  "No direct, one-click Zoho Books data import at this time",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-background p-8">
              <h2 className="text-2xl font-bold">Zoho Books Limitations</h2>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                {[
                  "Free plan is capped to businesses earning under $50,000/year and 1 user",
                  "Multi-currency isn't available until the Professional plan ($50/month)",
                  "Six pricing tiers, plus separate add-ons, take more effort to evaluate than a simple plan list",
                  "Extra users cost $3/month each beyond a plan's included seat count",
                  "Cash-flow forecasting requires Premium ($70/month) or above",
                  "Phone and live chat support require Standard plan or above — Free is email-only",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Zoho Books limitations above are based on its published U.S. plan structure and add-on
            pricing as of {REVIEWED_DATE_LABEL}; confirm current details for your market on Zoho's
            official pricing page, since terms — and which features sit on which plan — change over
            time.
          </p>
        </div>
      </section>

      {/* WHO SHOULD CHOOSE */}
      <section className="container mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold">Who Should Choose FinFlow Track?</h2>
            </div>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">
                  Businesses that need multi-currency support before they're ready to pay
                </strong>{" "}
                for a mid-tier accounting plan.
              </li>
              <li>
                <strong className="text-foreground">Growing businesses past $50,000/year in revenue</strong>{" "}
                that want a free plan without a revenue ceiling.
              </li>
              <li>
                <strong className="text-foreground">
                  Businesses that want simple, predictable pricing
                </strong>{" "}
                with a small number of plans to evaluate.
              </li>
              <li>
                <strong className="text-foreground">
                  Businesses with straightforward inventory needs
                </strong>{" "}
                that want it available at a lower price point than Zoho Books' Professional plan.
              </li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold">Who Should Choose Zoho Books?</h2>
            </div>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">
                  Very small businesses under $50,000/year in revenue
                </strong>{" "}
                that want full accounting and bank reconciliation for free.
              </li>
              <li>
                <strong className="text-foreground">
                  Businesses already using other Zoho applications
                </strong>{" "}
                (CRM, Inventory, Expense) that benefit from native integration.
              </li>
              <li>
                <strong className="text-foreground">
                  Retail or e-commerce businesses with complex inventory
                </strong>{" "}
                needing serial/batch tracking or marketplace integrations.
              </li>
              <li>
                <strong className="text-foreground">
                  Businesses that need cash-flow forecasting, project time-billing, or custom user
                  roles
                </strong>{" "}
                and are willing to pay for Zoho's higher-tier plans to get them.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* SWITCHING */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-3xl font-bold">Switching from Zoho Books to FinFlow Track</h2>
          <p className="mt-4 text-muted-foreground">
            FinFlow Track does not currently offer a direct, automated Zoho Books import. A general
            migration approach looks like this:
          </p>
          <ol className="mt-8 space-y-5">
            {[
              "Review your existing Zoho Books records — customers, vendors, invoices, bills, and chart of accounts.",
              "Export the records Zoho Books allows you to export (check current export options for your plan).",
              "Identify and review your customer and vendor lists for accuracy before re-entering them.",
              "Review invoice and expense history so it maps cleanly to FinFlow Track's categories.",
              "Create and configure your company in FinFlow Track, including currency, tax, and inventory settings.",
              "Manually enter or bulk-upload supported records into FinFlow Track — there is currently no one-click Zoho Books importer.",
              "Verify opening balances and financial totals match between the two systems before relying on FinFlow Track alone.",
              "Test day-to-day workflows — invoicing, expense entry, reporting — with a small set of real transactions.",
              "Reconcile any discrepancies before fully retiring Zoho Books for new entries.",
              "Once verified, begin using FinFlow Track as your system of record.",
            ].map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* METHODOLOGY */}
      <section className="container mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-3xl font-bold">How We Compare Accounting Software</h2>
        <p className="mt-4 text-muted-foreground leading-7">
          This comparison was written by the FinFlow Track team using our own product's actual,
          plan-gated functionality and Zoho's official documentation and pricing pages, checked on{" "}
          {REVIEWED_DATE_LABEL}. We consider pricing, free-plan limitations, core accounting
          functionality, invoicing, expenses, banking, reporting, cash flow, multi-currency
          support, inventory, automation, integrations, usability, and target audience. As the
          maker of FinFlow Track, we are not an independent reviewer — we've aimed to describe Zoho
          Books fairly, including features it offers that we currently don't, rather than only
          listing our own strengths. We did not conduct hands-on testing of Zoho Books for this
          comparison; all Zoho Books claims are sourced from Zoho's public documentation and linked
          where relevant. Where we couldn't verify a detail confidently, we've said so and pointed
          you to the official source instead of guessing.
        </p>
      </section>

      {/* FAQ */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-7">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL VERDICT */}
      <section className="container mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold">FinFlow Track vs Zoho Books: Final Verdict</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-background p-6">
            <h3 className="font-semibold">Choose FinFlow Track if:</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>· Its current feature set matches your requirements</li>
              <li>· You need multi-currency without paying for a mid-tier plan</li>
              <li>· You've outgrown Zoho Books' free-plan revenue cap</li>
              <li>· You prefer a simpler, smaller set of plans to evaluate</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-background p-6">
            <h3 className="font-semibold">Choose Zoho Books if:</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>· Your business earns under $50,000/year and wants full accounting for free</li>
              <li>· You need its mature, advanced inventory or ecosystem integrations</li>
              <li>· You need cash-flow forecasting, project billing, or custom user roles</li>
              <li>· Your requirements call for Zoho's more established accounting workflows</li>
            </ul>
          </div>
        </div>
        <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground">
          The right accounting platform depends on your business's revenue, team size, reporting
          requirements, budget, and the specific features you actually need — not just which plan
          costs less on paper.
        </p>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/40">
        <div className="container mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-4xl font-bold">Start Free with FinFlow Track</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Explore FinFlow Track and see whether its financial-management tools fit your business.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              search={{ plan: "free" }}
              className="inline-flex items-center rounded-lg bg-primary px-8 py-4 text-primary-foreground"
            >
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link to="/pricing" className="rounded-lg border px-8 py-4">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* RELATED COMPARISONS */}
      <section className="container mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold">More Comparisons</h2>
        <p className="mt-3 text-muted-foreground">
          We're building out comparisons against other accounting tools.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/compare/finflow-track-vs-quickbooks"
            className="rounded-full border px-4 py-2 text-sm text-foreground transition hover:bg-muted"
          >
            FinFlow Track vs QuickBooks
          </Link>
          <Link
            to="/compare/finflow-track-vs-xero"
            className="rounded-full border px-4 py-2 text-sm text-foreground transition hover:bg-muted"
          >
            FinFlow Track vs Xero
          </Link>
          <Link
            to="/compare/finflow-track-vs-wave"
            className="rounded-full border px-4 py-2 text-sm text-foreground transition hover:bg-muted"
          >
            FinFlow Track vs Wave
          </Link>
          {[
            "FinFlow Track vs FreshBooks",
            "FinFlow Track vs Excel",
            "FinFlow Track vs Google Sheets",
          ].map((label) => (
            <span
              key={label}
              className="rounded-full border px-4 py-2 text-sm text-muted-foreground"
            >
              {label} <span className="text-xs">(coming soon)</span>
            </span>
          ))}
        </div>
      </section>

      {/* RELATED READING */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold">Related Reading</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedBlogPosts.map((post) => (
              <Link
                key={post.slug}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="rounded-2xl border bg-background p-6 shadow-sm transition hover:shadow-md"
              >
                <h3 className="text-sm font-semibold">{post.title}</h3>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  Read article
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function FeatureBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-background p-8">
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6 text-primary" />
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground [&>p>strong]:text-foreground">
        {children}
      </div>
    </div>
  );
}
