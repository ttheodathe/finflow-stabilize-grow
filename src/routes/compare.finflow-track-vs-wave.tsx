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
  CreditCard,
  MapPin,
  ExternalLink,
} from "lucide-react";

const SITE_URL = "https://www.finflowtrack.com";
const PAGE_URL = `${SITE_URL}/compare/finflow-track-vs-wave`;
const REVIEWED_DATE = "2026-11-16";
const REVIEWED_DATE_LABEL = "November 16, 2026";

export const Route = createFileRoute("/compare/finflow-track-vs-wave")({
  component: ComparePage,
  head: () => {
    const title = "FinFlow Track vs Wave: Expenses, Features & Pricing Compared";
    const description =
      "Compare FinFlow Track vs Wave for expense tracking, accounting reports, invoicing, bank feeds, multi-currency, pricing, and availability.";

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
                name: "FinFlow Track vs Wave",
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
  wave: { status: Availability; label?: string };
}[] = [
  {
    category: "Free plan (ongoing, not a trial)",
    finflow: { status: "yes", label: "Basic accounting, invoicing, expenses, customers, basic reports" },
    wave: { status: "yes", label: "Starter plan, unlimited invoicing" },
  },
  {
    category: "Paid plan starting price",
    finflow: { status: "yes", label: "$19/month (Professional)" },
    wave: { status: "yes", label: "$19 USD/month; $25 CAD/month (Pro)" },
  },
  {
    category: "International availability",
    finflow: { status: "yes", label: "Global" },
    wave: { status: "no", label: "New signups limited to US & Canada" },
  },
  {
    category: "Invoicing",
    finflow: { status: "yes", label: "Invoice creation; limits depend on plan" },
    wave: { status: "yes", label: "Unlimited, every plan" },
  },
  {
    category: "Estimates",
    finflow: { status: "no", label: "Not confirmed in current product scope" },
    wave: { status: "yes" },
  },
  {
    category: "Expense tracking",
    finflow: { status: "yes" },
    wave: { status: "yes" },
  },
  {
    category: "AI receipt scanning",
    finflow: { status: "no", label: "Not confirmed in current product scope" },
    wave: { status: "partial", label: "Pro or optional Starter add-on" },
  },
  {
    category: "Live bank feed connections",
    finflow: { status: "no", label: "No live bank-feed connection confirmed" },
    wave: { status: "partial", label: "Pro plan only (via Plaid)" },
  },
  {
    category: "Financial reports (P&L, balance sheet, cash flow)",
    finflow: { status: "yes", label: "Basic reports; check plan details" },
    wave: { status: "partial", label: "Expanded reporting on Pro" },
  },
  {
    category: "Multi-currency transactions",
    finflow: { status: "yes", label: "Multi-currency; rate locked when recorded" },
    wave: { status: "no", label: "Locked to USD or CAD at signup" },
  },
  {
    category: "Foreign-currency invoicing",
    finflow: { status: "yes" },
    wave: { status: "yes", label: "Supported, with conversion tracking" },
  },
  {
    category: "Conversational AI bookkeeper",
    finflow: { status: "partial", label: "Paid plans only" },
    wave: { status: "no" },
  },
  {
    category: "Online invoice payments",
    finflow: { status: "no", label: "No built-in payment gateway" },
    wave: { status: "partial", label: "Optional add-on; eligibility and fees apply" },
  },
  {
    category: "Multi-company support",
    finflow: { status: "yes", label: "Plan-dependent limits, one account" },
    wave: { status: "yes", label: "Multiple profiles per login; billed per business" },
  },
  {
    category: "Third-party integrations",
    finflow: { status: "no", label: "Not currently available" },
    wave: { status: "partial", label: "Pro-plan feature; check current app directory" },
  },
  {
    category: "Best for",
    finflow: {
      status: "yes",
      label: "Global businesses needing multi-currency transaction handling",
    },
    wave: {
      status: "yes",
      label: "US/Canada freelancers wanting integrated payments",
    },
  },
];

const freePlanRows: {
  feature: string;
  finflow: { status: Availability; label?: string };
  wave: { status: Availability; label?: string };
}[] = [
  {
    feature: "Invoicing",
    finflow: { status: "yes", label: "Invoice creation; plan limits may apply" },
    wave: { status: "yes", label: "Unlimited" },
  },
  {
    feature: "Estimates",
    finflow: { status: "no", label: "Not confirmed in current product scope" },
    wave: { status: "yes", label: "Unlimited" },
  },
  {
    feature: "Basic accounting",
    finflow: { status: "yes", label: "Basic accounting workflows" },
    wave: { status: "yes", label: "Unlimited" },
  },
  {
    feature: "Expense tracking",
    finflow: { status: "yes" },
    wave: { status: "yes", label: "Manual transaction entry" },
  },
  {
    feature: "Financial reports",
    finflow: { status: "yes", label: "Basic reports" },
    wave: { status: "partial", label: "Expanded reporting on Pro" },
  },
  {
    feature: "Customers",
    finflow: { status: "yes", label: "Customer management" },
    wave: { status: "yes", label: "Customer management" },
  },
  {
    feature: "Companies on this plan",
    finflow: { status: "partial", label: "Company limits depend on plan" },
    wave: { status: "yes", label: "Multiple business profiles per login" },
  },
  {
    feature: "Multi-currency transactions",
    finflow: { status: "partial", label: "Check plan availability; rate locked when recorded" },
    wave: { status: "no", label: "USD or CAD only" },
  },
  {
    feature: "AI Bookkeeper",
    finflow: { status: "partial", label: "Paid plans only" },
    wave: { status: "no", label: "No equivalent conversational AI bookkeeper published" },
  },
  {
    feature: "Live bank feed connections",
    finflow: { status: "no", label: "No live bank-feed connection confirmed" },
    wave: { status: "no", label: "Requires Pro" },
  },
  {
    feature: "Online invoice payments",
    finflow: { status: "no", label: "No built-in payment gateway" },
    wave: { status: "partial", label: "Optional add-on; eligibility and processing fees apply" },
  },
  {
    feature: "Team collaborators",
    finflow: { status: "partial", label: "User limits depend on plan" },
    wave: { status: "partial", label: "Free payroll-manager/tax-pro roles only" },
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "Is FinFlow Track better than Wave?",
    a: "Neither is universally better — they serve different needs. FinFlow Track offers a Free plan for basic accounting, invoice creation, expense tracking, customer management, and basic reports. It also supports multi-currency workflows, with exchange rates locked when transactions are recorded; AI Bookkeeper and recurring invoices are paid-plan features. Wave offers a free Starter plan with invoicing and bookkeeping records, while Pro adds bank transaction imports, automatic categorization, and unlimited receipt scanning. Wave is available to businesses in the US and Canada; its business currency is selected during setup and cannot be changed later.",
  },
  {
    q: "Is FinFlow Track cheaper than Wave?",
    a: `FinFlow Track Free is $0, Professional is $19/month, and Business is $49/month. Wave Starter is $0; Wave Pro is $19 USD/month or $190 USD/year, with Canadian pricing listed separately. Compare plan limits and applicable payment-processing or add-on fees.`,
  },
  {
    q: "Is FinFlow Track a good Wave alternative?",
    a: "It can be, particularly for businesses outside the US and Canada — Wave currently restricts new account signups to those two markets — or for businesses that need multi-currency transaction handling. Businesses that need Wave's optional online-payment feature or supported third-party integrations should compare those requirements with FinFlow Track's current feature set.",
  },
  {
    q: "Is Wave really free?",
    a: "Wave's Starter plan is free and includes unlimited invoices, estimates, bills, and bookkeeping records. Automatic bank imports and transaction categorization require Pro; receipt scanning is included on Pro or available as a separate Starter add-on. Online payments are optional and carry processing fees when enabled.",
  },
  {
    q: "What is included in Wave's free Starter plan?",
    a: "Wave's Starter plan includes unlimited estimates, invoices, bills, and bookkeeping records, mobile invoicing, and a cash-flow and customer dashboard. Automatic bank imports and categorization are Pro features. Receipt scanning is included on Pro or can be added separately to Starter. Online payments are optional and subject to eligibility and processing fees.",
  },
  {
    q: "Does FinFlow Track have a free plan?",
    a: "Yes. FinFlow Track's Free plan includes basic accounting, invoice creation, expense tracking, customer management, and basic reports. Check the current pricing page for company, user, and multi-currency plan availability.",
  },
  {
    q: "Does Wave support multiple currencies?",
    a: "Wave allows foreign-currency invoices, but the business's base currency is selected during setup and cannot be changed later. Wave currently offers USD and CAD as business-currency options.",
  },
  {
    q: "Does FinFlow Track support multiple currencies?",
    a: "Yes. FinFlow Track supports multi-currency workflows, with exchange rates locked when a transaction is recorded. Check current product and plan details for the currencies and workflows available to your account.",
  },
  {
    q: "Which is better for freelancers?",
    a: "For a freelancer based in the US or Canada who wants built-in online payment collection, Wave's free Starter plan is a strong, well-established option. For a freelancer based elsewhere, or one who bills clients in multiple currencies, FinFlow Track's Free plan is likely to fit better, since Wave doesn't currently support new signups outside the US and Canada.",
  },
  {
    q: "Which is better for small businesses?",
    a: "It depends on location and workflow. A US or Canadian business that wants integrated online invoice payments and bank-feed automation may prefer Wave. A business outside those markets, or one that needs multi-currency transaction handling, may find FinFlow Track a better fit. Compare the exact features and plan limits you need before choosing.",
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
    title: "Reducing Late Invoice Payments",
    slug: "reducing-late-invoice-payments",
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
                FinFlow Track vs Wave
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
            FinFlow Track vs Wave: Which Is Better for Small Businesses?
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Both FinFlow Track and Wave offer a free starting plan, but the included workflows differ. Wave is available to businesses in the US and Canada, offers a free Starter plan, and provides optional online payments subject to eligibility and fees. Its business currency is selected during setup and cannot be changed later. FinFlow Track is built for global use, with multi-currency support and exchange rates locked when transactions are recorded. This guide compares their invoicing, expenses, reports, pricing, and plan limits.
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
              Pricing, product features, and availability can change. Always verify current
              information with the provider before making a purchasing decision.
            </span>
          </div>
        </div>
      </section>

      {/* QUICK ANSWER */}
      <section className="container mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold">FinFlow Track vs Wave: Quick Answer</h2>
        <div className="mt-6 space-y-4 text-lg leading-8 text-muted-foreground">
          <p>
            <strong className="text-foreground">FinFlow Track</strong> offers basic accounting, invoicing, expense tracking, customer management, and basic reports on its Free plan. Paid plans add recurring invoices and the AI Bookkeeper, with company and team limits varying by plan.
          </p>
          <p>
            <strong className="text-foreground">Wave</strong> is an established accounting
            platform with a genuinely free Starter plan for unlimited invoicing and bookkeeping,
            plus an optional online-payments feature that can let eligible customers pay invoices electronically, subject to processing fees. As of {REVIEWED_DATE_LABEL}, new Wave signups are limited
            to businesses in the US and Canada, and a business's base currency is fixed to USD or
            CAD when the account is created.
          </p>
          <p>
            FinFlow Track may be the better fit if you're outside the US/Canada, need multi-currency transaction handling, or want the AI Bookkeeper on a paid plan. Wave may be the better fit if you're a US or Canadian business that wants an established free accounting and invoicing plan, with optional online payments and Pro bank-feed automation.
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
                    Wave
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
                      <StatusMark status={row.wave.status} label={row.wave.label} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            "Plan dependent" or partial markers indicate the feature varies by plan, region, or
            add-on — confirm current details on Wave's official site before deciding.
          </p>
        </div>
      </section>

      {/* FREE PLAN COMPARISON */}
      <section className="container mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold">FinFlow Track vs Wave Free Plans</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Both platforms genuinely offer a $0 plan — this isn't a case of one being "really" free
          and the other not. But free doesn't mean identical, and it doesn't mean unlimited in
          every dimension. The table below breaks down what you actually get without paying
          anything, checked on {REVIEWED_DATE_LABEL}.
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
                  Wave Starter
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
                    <StatusMark status={row.wave.status} label={row.wave.label} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 space-y-3 max-w-3xl text-muted-foreground leading-7">
          <p>
            <strong className="text-foreground">FinFlow Track Free</strong> includes basic accounting, invoice creation, expense tracking, customer management, and basic reports. The AI Bookkeeper and recurring invoices are paid-plan features; company and user limits vary by plan.
          </p>
          <p>
            <strong className="text-foreground">Wave Starter</strong> includes unlimited invoices, estimates, bills, and bookkeeping records. Online payments are optional and subject to eligibility and processing fees. Automatic bank feeds and categorization require Pro; receipt scanning is included on Pro or available as a paid Starter add-on. New signups are limited to the US and Canada.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-bold">FinFlow Track vs Wave Pricing</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Subscription price is only part of the cost. Payment-processing fees, add-ons, and
            regional pricing can matter more than the monthly plan fee, depending on how you use
            each platform. Figures below checked on {REVIEWED_DATE_LABEL}.
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
                  
              </ul>
              <p className="mt-6 text-xs text-muted-foreground">
                Market: Global · Currency: USD · Billing: Monthly · Date checked:{" "}
                {REVIEWED_DATE_LABEL}. Annual billing, where offered, may differ — see{" "}
                <Link to="/pricing" className="underline hover:text-foreground">
                  the pricing page
                </Link>{" "}
                for current details. FinFlow Track does not currently process customer payments on
                invoices, so no per-transaction processing fee applies on our side.
              </p>
            </div>

            {/* Wave pricing card */}
            <div className="rounded-2xl border bg-background p-8">
              <h3 className="text-xl font-bold">Wave (US/Canada)</h3>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center justify-between border-b pb-3">
                  <span>Starter</span>
                  <span className="font-semibold">$0/month</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Pro</span>
                  <span className="font-semibold">$19 USD/month or $190 USD/year; $25 CAD/month or $250 CAD/year</span>
                </li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground leading-7">
                Wave's Pro subscription is $19 USD/month or $190 USD/year, and $25 CAD/month or $250 CAD/year. Online payments are optional and carry transaction fees when enabled. Receipt scanning is included with Pro or available as a paid Starter add-on; payroll and Wave Advisors are separate paid services. Check the live pricing page for current rates, add-ons, and eligibility.
              </p>
              <a
                href="https://www.waveapps.com/pricing"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                View official Wave pricing
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="mt-4 text-xs text-muted-foreground">
                Date checked: {REVIEWED_DATE_LABEL}. Verify current pricing, promotional terms, and
                processing fees on Wave's official pricing page before subscribing — fees and terms
                change periodically and pricing differs in Canada.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border bg-background p-6 text-sm text-muted-foreground leading-7">
            <strong className="text-foreground">A note on total cost:</strong> A platform with a
            lower subscription price isn't automatically the lower-cost option once you account for
            payment-processing fees, required add-ons, and plan restrictions. If you plan to collect
            a meaningful volume of online invoice payments through Wave, factor its per-transaction
            fees into your comparison rather than comparing subscription prices alone.
          </div>
        </div>
      </section>

      {/* FEATURE COMPARISON */}
      <section className="container mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold">Feature-by-Feature Comparison</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          The sections below compare specific workflows in more detail. FinFlow Track claims reflect
          what is actually implemented in the product; Wave claims are limited to what Wave
          publishes officially, with links where useful.
        </p>

        <div className="mt-12 space-y-14">
          <FeatureBlock icon={Wallet} title="Accounting and Bookkeeping">
            <p>
              <strong>FinFlow Track</strong> provides core double-entry-style bookkeeping modules
              including core accounting records to support invoicing, expense tracking, and reporting,
              alongside day-to-day workflows like invoicing and expense tracking. It is a
              self-service financial record-keeping and reporting tool rather than a licensed
              accounting or tax-filing service.
            </p>
            <p>
              <strong>Wave</strong> uses proper double-entry accounting on every plan, including
              Starter, and lets you create unlimited bookkeeping records either by manually entering
              transactions or by connecting a bank account (bank connections require Pro). Wave also
              sells access to its own in-house bookkeepers ("Wave Advisors") as a separate paid
              service starting from roughly $149/month.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={FileText} title="Invoicing">
            <p>
              <strong>FinFlow Track</strong> supports invoice creation and delivery through PDF export, email, or a secure link, alongside customer management. Recurring invoices are available on paid plans.
            </p>
            <p>
              <strong>Wave</strong> also includes unlimited invoices and estimates on every plan,
              with logo and brand-color customization, and the option to accept online payments
              directly on an invoice. Pro adds fuller brand customization, removal of Wave's own
              branding from invoice footers, attachments, reusable message templates, and automated
              late-payment reminders (which, notably, require the online payments feature to be
              enabled).
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Receipt} title="Expense Tracking">
            <p>
              <strong>FinFlow Track</strong> supports expense tracking. This comparison does not claim automated receipt OCR or AI receipt scanning as a FinFlow Track feature.
            </p>
            <p>
              <strong>Wave</strong> supports manual expense entry on every plan. Automatic
              transaction categorization from a connected bank feed requires Pro. Unlimited
              OCR-based receipt scanning is included on Pro; on Starter, it's available as a separate
              add-on ($8 USD/month or $72 USD/year; Canadian pricing is $11 CAD/month or $96 CAD/year).
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Receipt} title="Receipt Management">
            <p>
              <strong>FinFlow Track</strong> does not currently advertise an AI receipt-scanning feature in its confirmed product scope. Do not assume receipt OCR is included.
            </p>
            <p>
              <strong>Wave</strong> supports receipt capture via its mobile app, desktop, or email,
              using OCR to turn a photographed receipt into a bookkeeping record. This is included
              on Pro; Starter users can add it as a standalone paid add-on rather than getting it
              free.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Landmark} title="Bank Connections and Transaction Import">
            <p>
              <strong>FinFlow Track</strong> does not currently advertise a live bank-feed connection. Do not assume automatic bank transaction imports from connected accounts.
            </p>
            <p>
              <strong>Wave</strong> requires the Pro plan for automatic bank feed connections and
              transaction imports, facilitated through Plaid; Starter users import transactions
              manually. Even on Pro, Wave notes that not every financial institution is supported and
              connectivity can't be guaranteed for every bank.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={BarChart3} title="Cash-Flow Management">
            <p>
              <strong>FinFlow Track</strong> provides cash-flow reporting. Its AI Bookkeeper is a paid-plan feature; it should not be described as a formal cash-flow forecasting tool.
            </p>
            <p>
              <strong>Wave</strong> provides a cash-flow dashboard. Its current plan comparison distinguishes Starter and Pro reporting access; check Wave's live pricing page for the exact report availability before relying on a specific statement or report.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={BarChart3} title="Financial Reporting">
            <p>
              <strong>FinFlow Track</strong> provides financial reports including profit and loss, balance sheet, cash flow, and aging reports for receivables and payables, with CSV export. Check the current plan details for report availability.
            </p>
            <p>
              <strong>Wave</strong> provides financial reports, with expanded reporting features included on Pro. Check Wave's live plan comparison for the current report set and plan eligibility.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Globe} title="Multi-Currency Support">
            <p>
              <strong>FinFlow Track</strong> supports multi-currency transactions. The exchange rate is locked when a transaction is recorded; this comparison does not claim a specific currency count or that every currency feature is available on every plan.
            </p>
            <p>
              <strong>Wave</strong> allows foreign-currency invoicing, but the business's base currency is selected during setup and cannot be changed later. Wave currently offers USD and CAD as business-currency options. Check Wave's official documentation for the latest details on foreign-currency transactions and conversion treatment.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Sparkles} title="AI and Automation">
            <p>
              <strong>FinFlow Track's AI Bookkeeper</strong> is available on paid plans. It is a separate feature from basic accounting and invoicing; this comparison does not claim AI receipt scanning or automatic transaction posting.
            </p>
            <p>
              <strong>Wave's</strong> automation centers on its Pro-plan bank-feed pipeline: once a
              bank account is connected, Wave auto-imports transactions and auto-merges/categorizes
              them based on your prior categorization patterns, plus automated late-payment
              reminders. Wave uses an automated support chatbot ("Mave") for help-center questions.
              Wave does not currently publish a conversational AI assistant for querying your
              financial data the way FinFlow Track's AI Bookkeeper does.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Users} title="Customer Management">
            <p>
              <strong>FinFlow Track</strong> includes customer management alongside its invoicing and accounting workflows.
            </p>
            <p>
              <strong>Wave</strong> similarly maintains customer records linked to invoices and
              estimates, with payment status visible from the dashboard, on every plan including
              Starter.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Building2} title="Multiple Companies and Users">
            <p>
              <strong>FinFlow Track</strong> supports multiple companies and team members, with limits that vary by plan. Check the current pricing page for the applicable company and user limits.
            </p>
            <p>
              <strong>Wave</strong> lets one login manage multiple separate business profiles, but each business is billed independently. Its free tier provides limited collaborator roles; broader team permissions are available on Pro. Check Wave's current plan comparison for exact role availability.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={Plug} title="Integrations">
            <p>
              <strong>FinFlow Track's</strong> integration marketplace is still in development. As of{" "}
              {REVIEWED_DATE_LABEL}, the product does not have a public catalog of live third-party
              integrations; planned categories (payments, banking, productivity, CRM, e-commerce, and
              automation) are listed on the{" "}
              <Link to="/integrations" className="underline hover:text-foreground">
                integrations page
              </Link>{" "}
              as future connections rather than currently available ones. Do not assume integrations or API access are included.
            </p>
            <p>
              <strong>Wave</strong> lists third-party integrations as a Pro-plan feature. Because supported connections can change, consult Wave's current integration directory before relying on a specific app or automation workflow.
            </p>
          </FeatureBlock>

          <FeatureBlock icon={CreditCard} title="Payments and Getting Paid">
            <p>
              <strong>FinFlow Track</strong> tracks invoice status (draft, sent, paid, overdue)
              manually — it does not currently include a built-in payment gateway that lets your
              customers pay an invoice online directly through FinFlow Track. Marking an invoice paid
              is a manual step once you've been paid through whatever method you and your customer
              use.
            </p>
            <p>
              <strong>Wave</strong> offers optional online payments for eligible US and Canadian businesses. Customers can pay an invoice through supported payment methods after the business applies and receives approval. Processing fees apply, and the fee structure differs between Starter and Pro. This is a meaningful difference: Wave offers optional online payments, while FinFlow Track currently provides invoicing without an integrated payment gateway.
            </p>
          </FeatureBlock>
        </div>
      </section>

      {/* MARKET AVAILABILITY */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-5xl px-6 py-16">
          <div className="flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold">Regional Availability</h2>
          </div>
          <div className="mt-6 space-y-4 text-lg leading-8 text-muted-foreground">
            <p>
              This is one of the most consequential differences between the two products for an
              international audience. Wave states that, as of its November 2020 policy change, new
              account signups are limited to businesses based in the United States and Canada; users
              outside those markets who signed up earlier can generally keep using their existing
              account, but Wave does not guarantee ongoing compliance or full functionality outside
              the US/Canada, and some capabilities (like sending invoices and reminders directly
              through Wave, rather than as a PDF or link) are affected. Wave's payroll and online
              payment-processing features are US/Canada-only, and — as covered above — a Wave
              business's base currency is limited to USD or CAD.
            </p>
            <p>
              FinFlow Track is built for a global audience: signup, the Free plan, and multi-currency
              support are available regardless of where your business is based.
            </p>
            <p className="text-sm">
              Sources: Wave's official Help Center article on{" "}
              <a
                href="https://support.waveapps.com/hc/en-us/articles/27277914806804"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline hover:text-foreground"
              >
                changes for users outside the US and Canada
              </a>
              , and Wave's{" "}
              <a
                href="https://support.waveapps.com/hc/en-us/articles/208621316"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline hover:text-foreground"
              >
                business currency documentation
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* EASE OF USE */}
      <section className="container mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold">Which Is Easier to Use?</h2>
        <div className="mt-6 space-y-4 text-lg leading-8 text-muted-foreground">
          <p>
            Ease of use is subjective and depends on prior experience. Wave has a long track record
            with non-accountants specifically, and its dashboard is generally regarded as approachable
            for someone with no bookkeeping background — invoice creation, in particular, is quick to
            set up on Starter.
          </p>
          <p>
            FinFlow Track's smaller, more focused feature set — invoices, expenses, reports,
            multi-currency organized around a focused set of financial-management modules — may feel
            faster to learn for someone who doesn't need Wave's payment-processing or add-on
            ecosystem and simply wants core bookkeeping without a US/Canada restriction.
          </p>
          <p>
            If you're evaluating either product, both offer a genuinely free plan, so testing
            onboarding and day-to-day navigation for your specific workflows before committing is
            realistic on both sides (subject to Wave's regional signup restriction).
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
              <h3 className="font-semibold">Wave</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Wave states that it encrypts data in transit and stores it on servers with physical
                and technical access controls, and that it is a PCI-DSS Level 1 certified service
                provider — the highest tier of that payment-card security standard — with third-party
                audits performed annually. Review Wave's{" "}
                <a
                  href="https://www.waveapps.com/legal/security-and-privacy"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline hover:text-foreground"
                >
                  official security information
                </a>{" "}
                and{" "}
                <a
                  href="https://www.waveapps.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline hover:text-foreground"
                >
                  Wave privacy policy
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
            <h3 className="font-semibold text-foreground">Wave</h3>
            <p className="mt-3 text-sm">
              Wave states that live-person chat and email support are available Monday to Friday,
              9 AM–4:45 PM Eastern. On the Pro plan this is included; on Starter, it requires an
              optional paid add-on. Wave also runs an automated chatbot ("Mave") in its help center
              for self-serve answers outside those hours.
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
                  "Available globally, with no regional signup restriction",
                   "Free starting plan for basic accounting, invoicing, expenses, customers, and basic reports",
                  "Multi-currency support with exchange rates locked when recorded",
                  "AI Bookkeeper available on paid plans",
                  "Multi-currency support for international workflows",
                  "Simpler, more focused feature set for small teams getting started",
                  "Transparent, predictable per-plan pricing without payment-processing lock-in",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-background p-8">
              <h2 className="text-2xl font-bold">Wave Strengths</h2>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                {[
                  "Free Starter plan with unlimited invoices, estimates, bills, and bookkeeping records",
                  "Optional online invoice payments, subject to approval and transaction fees",
                  "Expanded financial reporting on the Pro plan",
                  "Established accounting product with a longer operating history",
                  "Pro-plan access to third-party integrations; check Wave's current app directory",
                  "Automatic bank transaction imports and categorization on Pro",
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
                "Newer product with a smaller track record than Wave",
                "No built-in online payment collection on invoices yet",
                "Third-party integration marketplace is still in development",
                "No live bank-feed connection is currently confirmed",
                "No dedicated standalone cash-flow forecasting report yet",
                "No direct, one-click Wave data import at this time",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border p-8">
            <h2 className="text-2xl font-bold">Wave Limitations</h2>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {[
                "New signups currently limited to businesses in the US and Canada",
                "Business base currency is locked to USD or CAD and can't be changed later",
                "Automatic bank feeds and transaction categorization require Pro; receipt scanning is Pro or a paid Starter add-on",
                "Optional online payments carry per-transaction fees when enabled",
                "Payroll is a separate paid service with regional availability restrictions",
                "Some support options depend on the subscription plan; check current Wave support terms",
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
          Wave limitations above are based on its published US/Canada plan structure and policies as
          of {REVIEWED_DATE_LABEL}; confirm current details on Wave's official pricing and help
          pages, since terms — and regional availability — can change over time.
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
                  <strong className="text-foreground">
                    Businesses based outside the US and Canada
                  </strong>{" "}
                  that can't currently sign up for a new Wave account.
                </li>
                <li>
                  <strong className="text-foreground">
                    Businesses that invoice or transact internationally
                  </strong>{" "}
                  and need multi-currency transaction handling.
                </li>
                <li>
                  <strong className="text-foreground">Freelancers and startups</strong> who want
                  basic accounting, invoice creation, expenses, customer management, and basic reports on a Free plan.
                </li>
                <li>
                  <strong className="text-foreground">
                    Businesses that need multi-currency workflows
                  </strong>{" "}
                  and want exchange rates locked when transactions are recorded.
                </li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">Who Should Choose Wave?</h2>
              </div>
              <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">US or Canadian small businesses</strong> that
                  want an optional online-payment feature and meet Wave's eligibility requirements.
                </li>
                <li>
                  <strong className="text-foreground">Freelancers who don't need multi-currency</strong>{" "}
                  and want a well-established, widely reviewed free tool.
                </li>
                <li>
                  <strong className="text-foreground">
                    Businesses that need automated bank feeds and receipt scanning
                  </strong>{" "}
                  and are comfortable paying for the Pro plan to get them.
                </li>
                <li>
                  <strong className="text-foreground">
                    Sellers on platforms like Etsy or PayPal
                  </strong>{" "}
                  who should check Wave's current Pro-plan integration directory for supported connections.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SWITCHING */}
      <section className="container mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-3xl font-bold">Switching from Wave to FinFlow Track</h2>
        <p className="mt-4 text-muted-foreground">
          FinFlow Track does not currently offer a direct, automated Wave import. A general
          migration approach looks like this:
        </p>
        <ol className="mt-8 space-y-5">
          {[
            "Review your existing Wave records — customers, invoices, bills, and chart of accounts.",
            "Export the records Wave allows you to export (check current export options for your Wave plan).",
            "Review customer and invoice information for accuracy before re-entering it.",
            "Review expense and bill data so it maps cleanly to FinFlow Track's categories.",
            "Create and configure your company in FinFlow Track, including the relevant currency and accounting settings.",
            "Manually enter or bulk-upload supported records into FinFlow Track — there is currently no one-click Wave importer.",
            "Verify financial totals (revenue, expenses, balances) match between the two systems before relying on FinFlow Track alone.",
            "Test day-to-day workflows — invoicing, expense entry, reporting — with a small set of real transactions.",
            "Once verified, begin using FinFlow Track as your system of record and retire Wave for new entries.",
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
            implemented functionality and Wave's official documentation and pricing pages, checked
            on {REVIEWED_DATE_LABEL}. We consider pricing, free-plan limitations, core accounting
            functionality, invoicing, expenses, receipts, reporting, cash flow, multi-currency
            support, automation, payments, integrations, usability, target audience, and geographic
            availability. As the maker of FinFlow Track, we are not an independent reviewer — we've
            aimed to describe Wave fairly and to flag our own product's limitations rather than only
            its strengths. We did not conduct hands-on testing of Wave for this comparison; all Wave
            claims are sourced from Wave's public documentation and linked where relevant. Where we
            couldn't verify a detail confidently, we've said so and pointed you to the official
            source instead of guessing.
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
          <h2 className="text-3xl font-bold">FinFlow Track vs Wave: Final Verdict</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-background p-6">
              <h3 className="font-semibold">Choose FinFlow Track if:</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>· You're based outside the US and Canada</li>
                <li>· You need multi-currency transaction handling</li>
                <li>· You need multi-currency workflows and may want the AI Bookkeeper on a paid plan</li>
                <li>· You don't need built-in online payment processing on invoices</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-background p-6">
              <h3 className="font-semibold">Choose Wave if:</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>· You're a US or Canadian business</li>
                <li>· You want optional online invoice payments and meet Wave's eligibility requirements</li>
                <li>· You're comfortable selecting USD or CAD as your business currency at setup</li>
                <li>
                  · You want automated bank feeds and receipt scanning and are willing to pay for
                  Pro
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground">
            The cheapest accounting platform is not necessarily the lowest-cost option once
            payment-processing fees, plan restrictions, and the features you actually need are
            factored in. The best accounting platform is the one that matches your business's
            location, currency needs, financial workflows, and budget.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
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
          {[
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
