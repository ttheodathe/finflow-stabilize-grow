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
  ExternalLink,
} from "lucide-react";

const SITE_URL = "https://finflowtrack.com";
const PAGE_URL = `${SITE_URL}/compare/finflow-track-vs-quickbooks`;
const REVIEWED_DATE = "2026-08-13";
const REVIEWED_DATE_LABEL = "August 13, 2026";

export const Route = createFileRoute("/compare/finflow-track-vs-quickbooks")({
  component: ComparePage,
  head: () => {
    const title = "FinFlow Track vs QuickBooks: Which Is Better?";
    const description =
      "Compare FinFlow Track vs QuickBooks on pricing, invoicing, expenses, reporting, multi-currency and ease of use to find the right fit for your business.";

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
                name: "FinFlow Track vs QuickBooks",
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
  quickbooks: { status: Availability; label?: string };
}[] = [
  {
    category: "Primary audience",
    finflow: { status: "yes", label: "Freelancers, startups, SMEs" },
    quickbooks: { status: "yes", label: "Small businesses, accountants" },
  },
  {
    category: "Free plan (ongoing, not a trial)",
    finflow: { status: "yes", label: "Yes — Free plan" },
    quickbooks: { status: "no", label: "No permanent free plan" },
  },
  {
    category: "Invoicing",
    finflow: { status: "yes" },
    quickbooks: { status: "yes" },
  },
  {
    category: "Expense tracking",
    finflow: { status: "yes" },
    quickbooks: { status: "yes" },
  },
  {
    category: "AI receipt / document scanning",
    finflow: { status: "yes" },
    quickbooks: { status: "partial", label: "Varies by plan" },
  },
  {
    category: "Profit & Loss / Balance Sheet",
    finflow: { status: "yes" },
    quickbooks: { status: "yes" },
  },
  {
    category: "Multi-currency",
    finflow: { status: "yes", label: "50+ currencies" },
    quickbooks: { status: "partial", label: "Higher tiers only — verify" },
  },
  {
    category: "Conversational AI bookkeeper",
    finflow: { status: "yes" },
    quickbooks: { status: "partial", label: "AI features vary — verify" },
  },
  {
    category: "Payroll",
    finflow: { status: "partial", label: "Business plan and above" },
    quickbooks: { status: "partial", label: "Separate add-on — verify" },
  },
  {
    category: "Multi-company support",
    finflow: { status: "yes", label: "Plan-dependent limits" },
    quickbooks: { status: "partial", label: "Separate subscription per company" },
  },
  {
    category: "Third-party app marketplace",
    finflow: { status: "no", label: "In development" },
    quickbooks: { status: "yes", label: "Large established marketplace" },
  },
  {
    category: "Best suited for",
    finflow: {
      status: "yes",
      label: "Businesses wanting a simpler, free-to-start tool",
    },
    quickbooks: {
      status: "yes",
      label: "Businesses needing a mature ecosystem",
    },
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "Is FinFlow Track better than QuickBooks?",
    a: "Neither product is universally better — they're built for different priorities. FinFlow Track focuses on a simple, free-to-start experience with invoicing, expenses, and multi-currency support. QuickBooks offers a more mature accounting ecosystem with a larger third-party app marketplace and deep accountant familiarity. The right choice depends on your business's workflow complexity, budget, and existing tools.",
  },
  {
    q: "Is FinFlow Track cheaper than QuickBooks?",
    a: "FinFlow Track has a permanently free plan and paid tiers starting at $19/month. QuickBooks Online does not currently offer a permanent free plan; its paid tiers and promotional pricing change periodically, so you should check QuickBooks' official pricing page for current rates in your market before comparing costs directly.",
  },
  {
    q: "Is FinFlow Track a good QuickBooks alternative?",
    a: "It can be, particularly for freelancers, startups, and small businesses that want invoicing, expense tracking, and financial reporting without committing to a paid subscription from day one. Businesses with more complex accounting needs, existing QuickBooks integrations, or a bookkeeper already trained on QuickBooks may find switching costs outweigh the benefits.",
  },
  {
    q: "Can FinFlow Track replace QuickBooks?",
    a: "For core workflows — invoicing, expense tracking, financial reporting, and multi-currency bookkeeping — FinFlow Track can replace QuickBooks for many small businesses. If your business relies on QuickBooks' third-party app marketplace or specific accounting workflows not yet available in FinFlow Track, review the feature-by-feature comparison above before switching.",
  },
  {
    q: "Is FinFlow Track good for freelancers?",
    a: "Yes. Freelancers can use the Free plan for invoicing, expense tracking, and basic reporting for a single company, and upgrade later if they need inventory, purchase orders, or additional team members.",
  },
  {
    q: "Does FinFlow Track support multiple currencies?",
    a: "Yes. FinFlow Track supports more than 50 ISO currencies at the invoice and company level, with currency-aware formatting and reporting.",
  },
  {
    q: "Does FinFlow Track include invoicing?",
    a: "Yes, invoicing is included on every plan, including the Free plan. Recurring invoices, credit notes, estimates, and payment tracking are also available.",
  },
  {
    q: "Can I move my data from QuickBooks to FinFlow Track?",
    a: "FinFlow Track does not currently offer a direct, one-click QuickBooks import. You can manually recreate customers, invoices, and expense records, or export data from QuickBooks and enter it into FinFlow Track as part of onboarding. See the switching section above for a general migration approach.",
  },
  {
    q: "Which is better for a small business?",
    a: "It depends on the business. A solo freelancer or early-stage small business that wants to start free and keep things simple may prefer FinFlow Track. A business that already depends on QuickBooks' integrations, has an accountant trained on QuickBooks, or needs a long-established ecosystem may be better served staying with QuickBooks.",
  },
  {
    q: "Is FinFlow Track free?",
    a: "FinFlow Track offers a permanently free plan (not a time-limited trial) that includes basic accounting, invoicing, expense tracking, customer management, and basic reports for one company and up to two team members. Paid plans unlock additional companies, users, and features.",
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
    title: "How to Create Professional Invoices",
    slug: "how-to-create-professional-invoices",
  },
  {
    title: "Tracking Business Expenses: A Practical Guide",
    slug: "tracking-business-expenses-guide",
  },
  {
    title: "Managing Business Cash Flow",
    slug: "managing-business-cash-flow",
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
                FinFlow Track vs QuickBooks
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
            FinFlow Track vs QuickBooks: Which Is Better for Small Businesses?
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Both FinFlow Track and QuickBooks can help a business manage invoicing, expenses, and
            financial reporting — but the two products are built around different priorities.
            FinFlow Track is a newer, free-to-start platform focused on simplicity and
            multi-currency support. QuickBooks is a long-established accounting platform with a
            broad ecosystem of integrations and accountant familiarity. This guide compares both
            objectively, feature by feature, so you can decide which fits your business.
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
              Product features, pricing, and availability can change. We recommend checking each
              provider's official documentation before making a purchasing decision.
            </span>
          </div>
        </div>
      </section>

      {/* QUICK ANSWER */}
      <section className="container mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold">FinFlow Track vs QuickBooks: Quick Answer</h2>
        <div className="mt-6 space-y-4 text-lg leading-8 text-muted-foreground">
          <p>
            <strong className="text-foreground">FinFlow Track</strong> is designed for freelancers,
            startups, and small businesses that want a straightforward way to manage invoicing,
            expenses, multi-currency transactions, and financial reporting — with a permanently free
            starting plan and paid tiers that add companies, users, inventory, payroll, and
            AI-assisted bookkeeping as a business grows.
          </p>
          <p>
            <strong className="text-foreground">QuickBooks</strong> offers a mature accounting
            ecosystem built over more than two decades, with a large marketplace of third-party
            integrations, broad accountant and bookkeeper familiarity, and accounting workflows
            developed for a wide range of business sizes and industries.
          </p>
          <p>
            FinFlow Track may be the better fit if you want to start free, need native
            multi-currency support, or prefer a simpler day-to-day interface. QuickBooks may be the
            better fit if your business already depends on its integration ecosystem, your
            accountant works in QuickBooks specifically, or you need accounting workflows that are
            more established than what a newer platform currently offers.
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
                    QuickBooks
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
                      <StatusMark status={row.quickbooks.status} label={row.quickbooks.label} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            "Plan dependent" or "verify" indicates the feature varies by plan or changes frequently
            — confirm current details on each provider's official site before deciding.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section className="container mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold">FinFlow Track vs QuickBooks Pricing</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Pricing shown in USD, billed monthly. FinFlow Track pricing below reflects our current
          published plans as of {REVIEWED_DATE_LABEL}. QuickBooks pricing changes frequently by
          market, tier, and promotion — figures are intentionally omitted here; use the official
          link to see current rates before purchasing.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* FinFlow Track pricing card */}
          <div className="rounded-2xl border p-8">
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
              Market: Global · Currency: USD · Billing: Monthly · Date checked:{" "}
              {REVIEWED_DATE_LABEL}. Annual billing and promotional pricing, where offered, may
              differ — see{" "}
              <Link to="/pricing" className="underline hover:text-foreground">
                the pricing page
              </Link>{" "}
              for current details.
            </p>
          </div>

          {/* QuickBooks pricing card */}
          <div className="rounded-2xl border p-8">
            <h3 className="text-xl font-bold">QuickBooks</h3>
            <p className="mt-6 text-sm text-muted-foreground leading-7">
              QuickBooks Online is sold across several subscription tiers (for example, entry-level
              self-employed plans up through Simple Start, Essentials, Plus, and Advanced), with
              pricing that varies by market, currency, and ongoing promotions. Intuit has changed
              QuickBooks Online pricing more than once in 2026, and offers such as introductory
              discounts or free trials are frequently time-limited and cannot always be combined.
            </p>
            <p className="mt-4 text-sm text-muted-foreground leading-7">
              Payroll, payment processing, and bookkeeping services are typically billed as separate
              add-ons rather than included in the base subscription price.
            </p>
            <a
              href="https://quickbooks.intuit.com/pricing/"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              View official QuickBooks pricing
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="mt-4 text-xs text-muted-foreground">
              Date checked: {REVIEWED_DATE_LABEL}. Verify current pricing, currency, and promotional
              terms on QuickBooks' official pricing page before purchasing.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURE COMPARISON */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-bold">Feature-by-Feature Comparison</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            The sections below compare specific workflows in more detail. FinFlow Track claims
            reflect what is actually implemented in the product; QuickBooks claims are limited to
            what Intuit publishes officially, with links where useful.
          </p>

          <div className="mt-12 space-y-14">
            <FeatureBlock icon={Wallet} title="Accounting and Bookkeeping">
              <p>
                <strong>FinFlow Track</strong> provides core double-entry-style bookkeeping modules
                including a chart of accounts, journals, a general ledger, and a trial balance,
                alongside day-to-day workflows like invoicing and expense tracking. It is a
                self-service financial record-keeping and reporting tool rather than a licensed
                accounting or tax-filing service.
              </p>
              <p>
                <strong>QuickBooks</strong> is a long-established accounting platform used by
                businesses and professional bookkeepers, with accounting workflows (chart of
                accounts, journal entries, reconciliation) that have been refined over many product
                generations. Many accountants and bookkeepers already know how to work in QuickBooks
                specifically, which can simplify hiring outside help.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={FileText} title="Invoicing">
              <p>
                <strong>FinFlow Track</strong> includes invoice creation and customization,
                recurring invoices, credit notes, estimates that convert to invoices, payment
                tracking, and customer management — available starting on the Free plan.
              </p>
              <p>
                <strong>QuickBooks</strong> also supports invoice creation, customization, and
                payment tracking, with recurring invoices and estimates available depending on plan
                tier. Confirm exactly which invoicing features are included at each QuickBooks tier
                on Intuit's official plan comparison page, since availability varies by subscription
                level.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={Receipt} title="Expense Tracking">
              <p>
                <strong>FinFlow Track</strong> supports manual expense entry and categorization,
                plus AI-assisted receipt and document scanning that automatically extracts vendor,
                amount, currency, date, and category from an uploaded receipt or document image to
                pre-fill an expense record for review.
              </p>
              <p>
                <strong>QuickBooks</strong> supports expense recording, categorization, and receipt
                capture, with automation features that vary by plan and region. Verify current
                receipt-capture and automation capabilities on QuickBooks' official feature pages
                for your plan.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={BarChart3} title="Cash-Flow Management">
              <p>
                <strong>FinFlow Track</strong> surfaces cash-flow visibility on the main dashboard,
                drawing on recorded income and expense transactions. It does not currently include a
                dedicated, standalone cash-flow forecasting report — cash-flow-style questions (for
                example, "forecast next month's revenue") can be asked conversationally through the
                AI Bookkeeper, which analyzes existing recorded data rather than producing a formal
                projection model.
              </p>
              <p>
                <strong>QuickBooks</strong> offers cash-flow reporting and, on some plans, cash-flow
                planning tools. Coverage varies by plan and region — verify current cash-flow
                features against your specific QuickBooks subscription.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={BarChart3} title="Financial Reporting">
              <p>
                <strong>FinFlow Track</strong> currently provides Profit &amp; Loss and Balance
                Sheet reports, along with a Trial Balance, General Ledger, and Journals view under
                its accounting module. Report depth (for example, more advanced or itemized
                reporting) is plan-dependent, per FinFlow Track's published pricing tiers.
              </p>
              <p>
                <strong>QuickBooks</strong> offers a broader library of standard and customizable
                financial reports across its plans, reflecting its longer product history. Exact
                report types available depend on your QuickBooks plan — check Intuit's official plan
                comparison for specifics.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={Globe} title="Multi-Currency">
              <p>
                <strong>FinFlow Track</strong> supports more than 50 ISO currencies, with a default
                currency set per company and currency selection available at the invoice level, so
                businesses that invoice or transact internationally can record and report
                transactions in the relevant currency.
              </p>
              <p>
                <strong>QuickBooks</strong> offers multi-currency functionality on some plans and
                markets, typically not on entry-level tiers. Because availability differs by plan
                and region, confirm whether multi-currency is included on the specific QuickBooks
                plan and market you're evaluating before relying on it.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={Sparkles} title="AI Bookkeeping and Automation">
              <p>
                <strong>FinFlow Track's AI Bookkeeper</strong> is a conversational assistant that
                answers questions about your live business data — for example, revenue for a period,
                top customers, which expense category is highest, or which invoices are overdue — by
                querying your existing records. It does not autonomously post transactions or fully
                automate bookkeeping on its own; it answers questions and surfaces insight.
                Separately, FinFlow Track uses AI to extract structured data from uploaded receipts
                and documents to speed up expense entry.
              </p>
              <p>
                <strong>QuickBooks</strong> has introduced its own AI-assisted features (such as
                transaction categorization suggestions and reporting assistance) that vary by plan
                and continue to evolve. Refer to Intuit's official product pages for the current
                scope of QuickBooks' AI capabilities on your plan.
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
                as future connections rather than currently available ones. Its Business plan
                includes API access for custom connections.
              </p>
              <p>
                <strong>QuickBooks</strong> has an established third-party app marketplace; Intuit
                states that QuickBooks Online can connect to a large number of external
                applications. This is a genuine, verifiable advantage for businesses that depend on
                pre-built integrations today.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={Building2} title="Multiple Companies and Users">
              <p>
                <strong>FinFlow Track</strong> supports multiple companies and team members within a
                single account, with limits that scale by plan — from 1 company / 2 users on the
                Free plan up to unlimited companies and users on Enterprise, per its published
                pricing tiers.
              </p>
              <p>
                <strong>QuickBooks</strong> generally requires a separate subscription per company
                file rather than a single account managing multiple companies under shared plan
                limits (QuickBooks Online Accountant and certain Enterprise configurations offer
                different structures for accounting firms). Verify current multi-company options for
                your specific QuickBooks product line.
              </p>
            </FeatureBlock>
          </div>
        </div>
      </section>

      {/* EASE OF USE */}
      <section className="container mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold">Which Is Easier to Use?</h2>
        <div className="mt-6 space-y-4 text-lg leading-8 text-muted-foreground">
          <p>
            Ease of use is subjective and depends on prior experience. Businesses that have never
            used accounting software, or that found QuickBooks' broader menu structure overwhelming,
            may find FinFlow Track's smaller, more focused feature set faster to learn — its core
            workflows (dashboard, invoices, expenses, reports) are organized around a small number
            of modules.
          </p>
          <p>
            Businesses that already know QuickBooks, or whose bookkeeper is trained specifically on
            it, may find QuickBooks faster to use in practice simply because of that familiarity,
            even though the platform itself covers a larger surface area of features.
          </p>
          <p>
            If you're evaluating either product, the free tier of FinFlow Track or a QuickBooks
            trial are reasonable ways to test onboarding and day-to-day navigation for your specific
            workflows before committing.
          </p>
        </div>
      </section>

      {/* SECURITY */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-bold">Security and Privacy</h2>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div className="rounded-xl border bg-background p-6">
              <ShieldCheck className="mb-4 h-8 w-8 text-primary" />
              <h3 className="font-semibold">FinFlow Track</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                FinFlow Track uses encrypted (HTTPS) communication, authenticated user sessions, and
                role-based permissions to control what each team member can access. Data is stored
                on managed cloud infrastructure with row-level access controls. FinFlow Track does
                not claim regulatory certifications it has not obtained — see the{" "}
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
              <h3 className="font-semibold">QuickBooks</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Intuit publishes its own security and privacy documentation for QuickBooks, covering
                topics such as encrypted connections, read-only bank-feed access, and account
                protection features. Review Intuit's{" "}
                <a
                  href="https://quickbooks.intuit.com/global/security/"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline hover:text-foreground"
                >
                  official security information
                </a>{" "}
                and{" "}
                <a
                  href="https://www.intuit.com/privacy/"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline hover:text-foreground"
                >
                  Intuit privacy policy
                </a>{" "}
                for current, authoritative details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SUPPORT */}
      <section className="container mx-auto max-w-5xl px-6 py-16">
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
            <h3 className="font-semibold text-foreground">QuickBooks</h3>
            <p className="mt-3 text-sm">
              QuickBooks offers support options that vary by plan and region, including phone and
              chat support on eligible plans. We don't have verified data on QuickBooks' current
              response times or support quality — check Intuit's official support documentation for
              what's included with your specific plan.
            </p>
          </div>
        </div>
      </section>

      {/* STRENGTHS */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border bg-background p-8">
              <h2 className="text-2xl font-bold">FinFlow Track Strengths</h2>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                {[
                  "Permanently free starting plan, not a time-limited trial",
                  "Native multi-currency support across 50+ currencies",
                  "Conversational AI Bookkeeper for quick answers about your own data",
                  "AI-assisted receipt and document scanning for faster expense entry",
                  "Simpler, more focused feature set for small teams getting started",
                  "Transparent, predictable per-plan pricing",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-background p-8">
              <h2 className="text-2xl font-bold">QuickBooks Strengths</h2>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                {[
                  "Large, established third-party app marketplace",
                  "Widespread familiarity among accountants and bookkeepers",
                  "Long product history with mature accounting workflows",
                  "Bank feed connections from a large number of financial institutions",
                  "Broad plan range covering solo users through larger organizations",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* LIMITATIONS */}
      <section className="container mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border p-8">
            <h2 className="text-2xl font-bold">FinFlow Track Limitations</h2>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {[
                "Newer product with a smaller track record than QuickBooks",
                "Third-party integration marketplace is still in development",
                "No dedicated standalone cash-flow forecasting report yet",
                "No direct, one-click QuickBooks data import at this time",
                "Fewer accountants are currently trained specifically on it, compared to QuickBooks",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border p-8">
            <h2 className="text-2xl font-bold">QuickBooks Limitations</h2>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {[
                "No permanent free plan; pricing and promotions change frequently",
                "Payroll, payments, and bookkeeping services are typically billed as separate add-ons",
                "Feature availability is split across multiple plan tiers, which can make comparison shopping harder",
                "Managing multiple companies generally requires a separate subscription per company",
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
          QuickBooks limitations above are based on generally published plan structures and add-on
          pricing patterns; confirm current details for your market on QuickBooks' official pricing
          page, since terms change over time.
        </p>
      </section>

      {/* WHO SHOULD CHOOSE */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">Who Should Choose FinFlow Track?</h2>
              </div>
              <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Freelancers and consultants</strong> who want
                  free invoicing and expense tracking without a subscription commitment.
                </li>
                <li>
                  <strong className="text-foreground">Startups and small businesses</strong> that
                  want to start on a free plan and upgrade as they add companies, users, or
                  inventory.
                </li>
                <li>
                  <strong className="text-foreground">
                    Businesses that invoice or transact internationally
                  </strong>{" "}
                  and need native multi-currency support without an add-on.
                </li>
                <li>
                  <strong className="text-foreground">Small teams managing several entities</strong>{" "}
                  who want multiple companies inside one account rather than separate subscriptions.
                </li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">Who Should Choose QuickBooks?</h2>
              </div>
              <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">
                    Businesses that already depend on QuickBooks' app ecosystem
                  </strong>{" "}
                  for payroll, payments, e-commerce, or industry-specific tools.
                </li>
                <li>
                  <strong className="text-foreground">
                    Businesses whose accountant or bookkeeper works in QuickBooks
                  </strong>{" "}
                  specifically, where switching platforms adds friction.
                </li>
                <li>
                  <strong className="text-foreground">
                    Established businesses with more complex accounting needs
                  </strong>{" "}
                  that benefit from QuickBooks' longer track record and deeper feature set.
                </li>
                <li>
                  <strong className="text-foreground">
                    Businesses that prefer a widely-known platform
                  </strong>{" "}
                  when hiring bookkeepers or accountants who need no additional training.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SWITCHING */}
      <section className="container mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-3xl font-bold">Switching from QuickBooks to FinFlow Track</h2>
        <p className="mt-4 text-muted-foreground">
          FinFlow Track does not currently offer a direct, automated QuickBooks import. A general
          migration approach looks like this:
        </p>
        <ol className="mt-8 space-y-5">
          {[
            "Review your existing QuickBooks data — customers, invoices, expenses, and chart of accounts.",
            "Export the records QuickBooks allows you to export (check current export options in your QuickBooks plan).",
            "Review customer and invoice information for accuracy before re-entering it.",
            "Review expense data and categorization so it maps cleanly to FinFlow Track's expense categories.",
            "Create and configure your company in FinFlow Track, including currency and tax settings.",
            "Manually enter or bulk-upload supported records into FinFlow Track — there is currently no one-click QuickBooks importer.",
            "Verify financial totals (revenue, expenses, balances) match between the two systems before relying on FinFlow Track alone.",
            "Test day-to-day workflows — invoicing, expense entry, reporting — with a small set of real transactions.",
            "Once verified, begin using FinFlow Track as your system of record and retire QuickBooks for new entries.",
          ].map((step, i) => (
            <li key={step} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* METHODOLOGY */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-3xl font-bold">How We Compare Accounting Software</h2>
          <p className="mt-4 text-muted-foreground leading-7">
            This comparison was written by the FinFlow Track team using our own product's actual
            implemented functionality and Intuit's official QuickBooks documentation and pricing
            pages, checked on {REVIEWED_DATE_LABEL}. We consider pricing, core accounting
            functionality, invoicing, expenses, reporting, multi-currency support, automation,
            integrations, usability, and target audience. As the maker of FinFlow Track, we are not
            an independent reviewer — we've aimed to describe QuickBooks fairly and to flag our own
            product's limitations rather than only its strengths. We did not conduct hands-on
            testing of QuickBooks for this comparison; all QuickBooks claims are sourced from
            Intuit's public documentation and linked where relevant. Where we couldn't verify a
            detail confidently, we've said so and pointed you to the official source instead of
            guessing.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto max-w-4xl px-6 py-16">
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
      </section>

      {/* FINAL VERDICT */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-bold">FinFlow Track vs QuickBooks: Final Verdict</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-background p-6">
              <h3 className="font-semibold">Choose FinFlow Track if:</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>· Its current feature set matches your requirements</li>
                <li>· You value a simpler, more focused interface</li>
                <li>· You want to start on a permanently free plan</li>
                <li>· You need native multi-currency support without an add-on</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-background p-6">
              <h3 className="font-semibold">Choose QuickBooks if:</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>· You require specific QuickBooks-only capabilities</li>
                <li>· You depend on its third-party integration ecosystem</li>
                <li>· Your accountant or team already works extensively in QuickBooks</li>
                <li>
                  · Your business needs its more mature, long-established accounting workflows
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground">
            The best accounting platform is the one that matches your business's actual financial
            workflows, reporting needs, budget, and growth plans.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="container mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-4xl font-bold">Start Free with FinFlow Track</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Explore FinFlow Track and see whether its accounting, invoicing, and financial
            management workflow fits your business.
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
          We're building out comparisons against other accounting tools. Check back soon for:
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {[
            "FinFlow Track vs Xero",
            "FinFlow Track vs Wave",
            "FinFlow Track vs Zoho Books",
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
