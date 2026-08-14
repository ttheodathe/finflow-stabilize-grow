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
const PAGE_URL = `${SITE_URL}/compare/finflow-track-vs-xero`;
const REVIEWED_DATE = "2026-08-14";
const REVIEWED_DATE_LABEL = "August 14, 2026";

export const Route = createFileRoute("/compare/finflow-track-vs-xero")({
  component: ComparePage,
  head: () => {
    const title = "FinFlow Track vs Xero: Which Is Better?";
    const description =
      "Compare FinFlow Track vs Xero on pricing, accounting, invoicing, expenses, reporting, multi-currency features and ease of use.";

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
                name: "FinFlow Track vs Xero",
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
  xero: { status: Availability; label?: string };
}[] = [
  {
    category: "Primary audience",
    finflow: { status: "yes", label: "Freelancers, startups, SMEs" },
    xero: { status: "yes", label: "Small to medium businesses, accountants" },
  },
  {
    category: "Free plan (ongoing, not a trial)",
    finflow: { status: "yes", label: "Yes — Free plan" },
    xero: { status: "no", label: "No permanent free plan" },
  },
  {
    category: "Invoicing",
    finflow: { status: "yes", label: "Unlimited on every plan" },
    xero: { status: "partial", label: "20/month on Early; unlimited on Growing+" },
  },
  {
    category: "Bills",
    finflow: { status: "yes" },
    xero: { status: "partial", label: "5/month on Early; unlimited on Growing+" },
  },
  {
    category: "Expense tracking",
    finflow: { status: "yes" },
    xero: { status: "partial", label: "Expense claims on Established plan" },
  },
  {
    category: "AI receipt / document scanning",
    finflow: { status: "yes" },
    xero: { status: "yes", label: "Smart Document Capture, all plans" },
  },
  {
    category: "Bank reconciliation",
    finflow: { status: "yes", label: "Manual, via CSV statement import" },
    xero: { status: "yes", label: "Live bank feeds; auto-reconcile on Growing+" },
  },
  {
    category: "Profit & Loss / Balance Sheet",
    finflow: { status: "yes" },
    xero: { status: "yes" },
  },
  {
    category: "Cash-flow forecasting",
    finflow: { status: "no", label: "No dedicated forecast report yet" },
    xero: { status: "yes", label: "30–180 days, depending on plan" },
  },
  {
    category: "Multi-currency",
    finflow: { status: "yes", label: "50+ currencies, every plan" },
    xero: { status: "partial", label: "160+ currencies, Established plan only (US)" },
  },
  {
    category: "Conversational / agentic AI",
    finflow: { status: "yes", label: "AI Bookkeeper (Q&A over your data)" },
    xero: { status: "yes", label: "JAX agentic AI, rolling out by plan" },
  },
  {
    category: "Inventory",
    finflow: { status: "yes", label: "Multi-warehouse, included" },
    xero: { status: "partial", label: "Inventory Plus, paid add-on" },
  },
  {
    category: "Projects / time tracking",
    finflow: { status: "no" },
    xero: { status: "partial", label: "Established plan only" },
  },
  {
    category: "Payroll",
    finflow: { status: "partial", label: "Business plan and above" },
    xero: { status: "partial", label: "Xero Payroll (Gusto), paid add-on, all plans" },
  },
  {
    category: "Multi-company support",
    finflow: { status: "yes", label: "Plan-dependent limits, one account" },
    xero: { status: "partial", label: "Separate subscription per organization" },
  },
  {
    category: "Third-party app marketplace",
    finflow: { status: "no", label: "In development" },
    xero: { status: "yes", label: "1,000+ apps in the Xero App Store" },
  },
  {
    category: "Best suited for",
    finflow: {
      status: "yes",
      label: "Businesses wanting a simpler, free-to-start tool",
    },
    xero: {
      status: "yes",
      label: "Businesses needing a mature accounting ecosystem",
    },
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "Is FinFlow Track better than Xero?",
    a: "Neither product is universally better — they're built for different priorities. FinFlow Track focuses on a simple, free-to-start experience with invoicing, expenses, inventory, and multi-currency support included on every plan. Xero offers a more mature accounting ecosystem, live bank feeds, and a large third-party app marketplace, but reserves features like multi-currency and project tracking for its highest-priced Established plan. The right choice depends on your workflow complexity, budget, and existing tools.",
  },
  {
    q: "Is FinFlow Track cheaper than Xero?",
    a: `FinFlow Track has a permanently free plan and paid tiers starting at $19/month. Xero's US list prices are $25/month (Early), $55/month (Growing), and $90/month (Established) as of ${REVIEWED_DATE_LABEL}, before add-ons like payroll or inventory; Xero periodically runs promotional introductory pricing for new customers, so its promotional cost can be lower for the first few months before reverting to the standard rate. Check Xero's official pricing page for current promotions before comparing costs directly.`,
  },
  {
    q: "Is FinFlow Track a good Xero alternative?",
    a: "It can be, particularly for freelancers, startups, and small businesses that want invoicing, expense tracking, inventory, and multi-currency support without paying extra to unlock those features on a higher-priced plan. Businesses that depend on Xero's live bank feeds, its established app marketplace, or an accountant already trained on Xero may find switching costs outweigh the benefits.",
  },
  {
    q: "Can FinFlow Track replace Xero?",
    a: "For core workflows — invoicing, expense tracking, inventory, financial reporting, and multi-currency bookkeeping — FinFlow Track can replace Xero for many small businesses. If your business relies on Xero's live bank feed connections, its project/time-tracking tools, or its third-party app ecosystem, review the feature-by-feature comparison above before switching.",
  },
  {
    q: "Is FinFlow Track good for freelancers?",
    a: "Yes. Freelancers can use the Free plan for invoicing, expense tracking, and basic reporting for a single company, and upgrade later if they need additional companies, users, or AI-assisted bookkeeping.",
  },
  {
    q: "Does FinFlow Track support multiple currencies?",
    a: "Yes. FinFlow Track supports more than 50 ISO currencies at the invoice and company level on every plan, including Free.",
  },
  {
    q: "Does Xero support multiple currencies?",
    a: "Yes, but only on Xero's Established plan in the US — its highest-priced tier. Xero states its multi-currency feature covers over 160 currencies with regularly updated exchange rates, letting you invoice, bill, and reconcile in foreign currencies. Businesses on Xero's Early or Growing plans would need to upgrade to Established to use it.",
  },
  {
    q: "Which is better for a small business?",
    a: "It depends on the business. A solo freelancer or early-stage small business that wants to start free, get multi-currency and inventory without an upsell, and keep things simple may prefer FinFlow Track. A business that already depends on Xero's live bank feeds and app ecosystem, has an accountant trained on Xero, or needs its more established reconciliation and reporting workflows may be better served staying with Xero.",
  },
  {
    q: "Can I switch from Xero to FinFlow Track?",
    a: "FinFlow Track does not currently offer a direct, automated Xero import. You can export supported records from Xero and re-create customers, invoices, bills, and balances in FinFlow Track as part of onboarding. See the switching section above for a general migration approach.",
  },
  {
    q: "Does FinFlow Track have a free plan?",
    a: "Yes. FinFlow Track offers a permanently free plan (not a time-limited trial) that includes basic accounting, invoicing, expense tracking, customer management, and basic reports for one company and up to two team members. Xero does not currently offer a permanent free plan, though it periodically offers a free trial period or an introductory discounted rate for new customers.",
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
    title: "Managing Business Cash Flow",
    slug: "managing-business-cash-flow",
  },
  {
    title: "Inventory Management Basics",
    slug: "inventory-management-basics",
  },
  {
    title: "Tracking Business Expenses: A Practical Guide",
    slug: "tracking-business-expenses-guide",
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
                FinFlow Track vs Xero
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
            FinFlow Track vs Xero: Which Is Better for Small Businesses?
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Both FinFlow Track and Xero help a business manage invoicing, expenses, and financial
            reporting — but the two products are built around different priorities. FinFlow Track
            is a newer, free-to-start platform that includes multi-currency support and inventory
            on every plan. Xero is an established accounting platform with live bank feeds and a
            large app marketplace, though several of its more advanced capabilities — including
            multi-currency and project tracking — are reserved for its highest-priced plan. This
            guide compares both objectively, feature by feature, so you can decide which fits your
            business.
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
              Product features, pricing, and availability can change. Pricing shown is for the U.S.
              market and was checked in August 2026 — we recommend confirming current details on
              Xero's official site before making a purchasing decision.
            </span>
          </div>
        </div>
      </section>

      {/* QUICK ANSWER */}
      <section className="container mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold">FinFlow Track vs Xero: Quick Answer</h2>
        <div className="mt-6 space-y-4 text-lg leading-8 text-muted-foreground">
          <p>
            <strong className="text-foreground">FinFlow Track</strong> is designed for freelancers,
            startups, and small businesses that want a straightforward way to manage invoicing,
            expenses, inventory, and multi-currency transactions — with a permanently free starting
            plan and paid tiers that add companies, users, payroll, and AI-assisted bookkeeping as a
            business grows.
          </p>
          <p>
            <strong className="text-foreground">Xero</strong> is a long-established accounting
            platform used by businesses and accountants worldwide, offering live bank feed
            connections, a large third-party app marketplace, and increasingly agentic AI
            capabilities through its JAX assistant — with more advanced tools like multi-currency,
            project tracking, and expense claims gated to its top-tier Established plan.
          </p>
          <p>
            FinFlow Track may be the better fit if you want to start free, need multi-currency or
            inventory support without paying for a top-tier plan, or prefer a simpler day-to-day
            interface. Xero may be the better fit if your business needs live bank feed connections,
            already depends on its integration ecosystem, or your accountant works in Xero
            specifically.
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
                    Xero
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
                      <StatusMark status={row.xero.status} label={row.xero.label} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            "Plan dependent" or partial markers indicate the feature varies by plan or changes
            frequently — confirm current details on Xero's official site before deciding.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section className="container mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold">FinFlow Track vs Xero Pricing</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Pricing shown in USD, billed monthly, for the U.S. market, checked on{" "}
          {REVIEWED_DATE_LABEL}. Xero pricing varies by market and changes periodically — Xero has
          publicly stated its U.S. subscription prices are increasing from October 1, 2026, and it
          frequently runs limited-time promotional pricing for new customers. Compare Xero's
          standard list price against FinFlow Track's price, not a temporary promotional rate, when
          evaluating long-term cost.
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
              {REVIEWED_DATE_LABEL}. Annual billing, where offered, may differ — see{" "}
              <Link to="/pricing" className="underline hover:text-foreground">
                the pricing page
              </Link>{" "}
              for current details. Multi-currency and inventory are included on every FinFlow Track
              plan, including Free.
            </p>
          </div>

          {/* Xero pricing card */}
          <div className="rounded-2xl border p-8">
            <h3 className="text-xl font-bold">Xero (U.S.)</h3>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center justify-between border-b pb-3">
                <span>Early</span>
                <span className="font-semibold">$25/month</span>
              </li>
              <li className="flex items-center justify-between border-b pb-3">
                <span>Growing</span>
                <span className="font-semibold">$55/month</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Established</span>
                <span className="font-semibold">$90/month</span>
              </li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground leading-7">
              Figures above are Xero's standard U.S. list prices. Xero is currently advertising a
              limited-time introductory discount for new U.S. customers (as well as a one-month-free
              offer), so the first few months may cost less before reverting to the standard price
              shown above. The Early plan is capped at 20 invoices and 5 bills per month; Growing
              and Established include unlimited invoicing and bills. Payroll (via Gusto) and
              Inventory Plus are billed as separate add-ons on top of the base subscription.
            </p>
            <a
              href="https://www.xero.com/us/pricing-plans/"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              View official Xero pricing
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="mt-4 text-xs text-muted-foreground">
              Date checked: {REVIEWED_DATE_LABEL}. Verify current pricing, currency, and promotional
              terms on Xero's official pricing page before purchasing — Xero reserves the right to
              change pricing at any time, and prices differ outside the U.S.
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
            reflect what is actually implemented in the product; Xero claims are limited to what
            Xero publishes officially, with links where useful.
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
                <strong>Xero</strong> is a long-established accounting platform used by businesses
                and professional bookkeepers worldwide, with accounting workflows (chart of
                accounts, journal entries, bank reconciliation) refined over more than a decade.
                Many accountants and bookkeepers already know how to work in Xero specifically,
                which can simplify hiring outside help.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={FileText} title="Invoicing">
              <p>
                <strong>FinFlow Track</strong> includes unlimited invoice creation and
                customization, recurring invoices, credit notes, estimates that convert to
                invoices, payment tracking, and customer management — available starting on the
                Free plan.
              </p>
              <p>
                <strong>Xero</strong> supports invoice and quote creation, customization, and online
                invoice payment acceptance on every plan, but its entry-level Early plan caps you at
                sending 20 invoices and approving 5 bills per month; Growing and Established remove
                that cap and add unlimited invoicing and bills.
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
                <strong>Xero</strong> includes AI-assisted "Smart Document Capture" for pulling
                bills and receipts into the platform on every plan, but dedicated employee expense
                claims and mileage tracking are only included on the Established plan — Early and
                Growing customers don't get that specific expense-claims workflow.
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
                <strong>Xero</strong> includes a built-in cash-flow forecasting tool on every plan,
                with the forecast window scaling by tier: 30 days on Early, 60 days on Growing, and
                180 days on Established. This is a genuine, verifiable advantage over FinFlow
                Track's current dashboard-only cash-flow view.
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
                <strong>Xero</strong> offers real-time reports on every plan, with customizable
                performance dashboards, financial health scorecards, and KPI/ratio analysis added on
                Growing and Established. Xero's reporting depth reflects its longer product history.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={Globe} title="Multi-Currency">
              <p>
                <strong>FinFlow Track</strong> supports more than 50 ISO currencies on every plan,
                including Free, with a default currency set per company and currency selection
                available at the invoice level, so businesses that invoice or transact
                internationally can record and report transactions in the relevant currency from
                day one.
              </p>
              <p>
                <strong>Xero</strong> supports more than 160 currencies with automatically updated
                exchange rates, letting you send invoices, receive bills, and reconcile transactions
                in foreign currency, with realized gains and losses tracked over time — but in the
                U.S., multi-currency is only available on Xero's top-tier Established plan ($90/month
                list price). Businesses on Xero's Early or Growing plans that need to transact in a
                foreign currency would need to upgrade to Established first.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={Sparkles} title="AI and Automation">
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
                <strong>Xero's AI assistant, JAX ("Just Ask Xero"),</strong> is positioned as an
                agentic financial assistant that Xero says can help with tasks such as bookkeeping,
                document handling, and matching bank transactions during reconciliation, and can
                surface proactive insights drawn from your data. Xero has said JAX capabilities are
                rolling out progressively rather than being uniformly available from day one, so
                confirm what's live on your specific plan and region on Xero's official AI pages.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={Landmark} title="Bank Connections and Reconciliation">
              <p>
                <strong>FinFlow Track</strong> supports bank account tracking, transfers between
                accounts, and reconciliation against imported bank statement data. As currently
                implemented, statement data is brought in via CSV file upload rather than a live,
                automatic connection to your bank — reconciliation itself (matching transactions
                against recorded entries) is a manual, in-app workflow.
              </p>
              <p>
                <strong>Xero</strong> supports live bank feed connections that pull transactions
                directly from many financial institutions, plus AI-assisted auto-reconciliation on
                its Growing and Established plans that can suggest transaction matches
                automatically. This is a genuine advantage for businesses that want less manual data
                entry — verify supported banks and feed availability for your institution on Xero's
                official site before relying on it.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={Receipt} title="Bills and Business Payments">
              <p>
                <strong>FinFlow Track</strong> supports bill entry, vendor management, purchase
                orders, and bill payment tracking. Recurring, auto-scheduled bill generation is not
                currently available — each bill is entered individually.
              </p>
              <p>
                <strong>Xero</strong> supports bill entry and tracking on every plan (capped at 5
                bills/month on Early, unlimited on Growing and Established), with automated bill
                entry via document capture, and optional online bill payments — domestic ACH is
                included, while cross-border and international bill payments carry additional
                payment fees on top of the subscription.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={Package} title="Inventory">
              <p>
                <strong>FinFlow Track</strong> includes an inventory module covering products,
                services, multiple warehouses, and stock movement tracking, included as part of the
                core product rather than a separate add-on.
              </p>
              <p>
                <strong>Xero</strong> offers inventory through "Inventory Plus," an optional paid
                add-on available on Growing and Established plans (not available on Early). This is
                a difference worth weighing directly against the cost of FinFlow Track's included
                inventory functionality if inventory matters to your business.
              </p>
            </FeatureBlock>

            <FeatureBlock icon={Clock} title="Projects and Time Tracking">
              <p>
                <strong>FinFlow Track</strong> does not currently include a dedicated
                projects/time-tracking module for job costing or project profitability.
              </p>
              <p>
                <strong>Xero</strong> includes project tracking — quoting, invoicing, and time/cost
                tracking for job profitability — but only on its Established plan. Businesses on
                Early or Growing don't get this workflow without upgrading.
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
                <strong>Xero</strong> states its App Store connects to more than 1,000 third-party
                applications spanning payments, payroll, inventory, CRM, and industry-specific
                tools. This is a genuine, verifiable advantage for businesses that depend on
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
                <strong>Xero</strong> prices per organization rather than per user — every plan
                includes unlimited users on that one organization, but managing a second business
                generally requires a separate Xero subscription per organization rather than one
                account covering multiple companies under shared plan limits. Xero's accountant and
                bookkeeper partner tools offer different structures for firms managing many clients.
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
            used accounting software, or that want fewer plan tiers to reason about before a
            feature is available, may find FinFlow Track's smaller, more focused feature set faster
            to learn — its core workflows (dashboard, invoices, expenses, reports, inventory) are
            organized around a small number of modules and largely available regardless of plan.
          </p>
          <p>
            Businesses that already know Xero, or whose bookkeeper is trained specifically on it,
            may find Xero faster to use in practice simply because of that familiarity, even though
            navigating which features are available on which plan tier adds its own complexity.
          </p>
          <p>
            If you're evaluating either product, the free tier of FinFlow Track or Xero's free
            trial/introductory offer are reasonable ways to test onboarding and day-to-day
            navigation for your specific workflows before committing.
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
              <h3 className="font-semibold">Xero</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Xero states that it encrypts data both in transit and at rest, supports
                multi-factor authentication, and protects its environment with firewalls, intrusion
                protection systems, and network segregation, and that it complies with the Payment
                Card Industry Data Security Standard (PCI DSS) as a Level 2 merchant. Review Xero's{" "}
                <a
                  href="https://www.xero.com/us/security/"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline hover:text-foreground"
                >
                  official security information
                </a>{" "}
                and{" "}
                <a
                  href="https://www.xero.com/us/legal/privacy/"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline hover:text-foreground"
                >
                  Xero privacy notice
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
            <h3 className="font-semibold text-foreground">Xero</h3>
            <p className="mt-3 text-sm">
              Xero states it offers free, unlimited online support to subscribers via its Xero
              Central help portal, 24 hours a day, 7 days a week, with cases raised through support
              articles and responses delivered by email or a scheduled callback. Xero does not
              currently offer inbound phone support — any phone number claiming to be official Xero
              phone support is not affiliated with Xero, per its own guidance.
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
                  "Native multi-currency support across 50+ currencies on every plan",
                  "Inventory management included rather than a paid add-on",
                  "Conversational AI Bookkeeper for quick answers about your own data",
                  "AI-assisted receipt and document scanning for faster expense entry",
                  "Simpler, more focused feature set for small teams getting started",
                  "Transparent, predictable per-plan pricing without feature upsells",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-background p-8">
              <h2 className="text-2xl font-bold">Xero Strengths</h2>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                {[
                  "Live bank feed connections with AI-assisted auto-reconciliation",
                  "App Store with 1,000+ third-party integrations",
                  "Built-in cash-flow forecasting on every plan (up to 180 days)",
                  "Widespread familiarity among accountants and bookkeepers",
                  "Long product history with mature accounting workflows",
                  "Unlimited users included on every organization's subscription",
                  "Emerging agentic AI assistant (JAX) for bookkeeping and reconciliation",
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
                "Newer product with a smaller track record than Xero",
                "Third-party integration marketplace is still in development",
                "No live bank feed connections yet — bank data comes in via CSV import",
                "No dedicated standalone cash-flow forecasting report yet",
                "No projects/time-tracking module for job costing",
                "No direct, one-click Xero data import at this time",
                "Fewer accountants are currently trained specifically on it, compared to Xero",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border p-8">
            <h2 className="text-2xl font-bold">Xero Limitations</h2>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {[
                "No permanent free plan; standard pricing is higher than FinFlow Track at every tier",
                "Multi-currency, project tracking, and expense claims are gated to the top-tier Established plan",
                "Entry-level Early plan caps invoices (20/month) and bills (5/month)",
                "Payroll and inventory are billed as separate add-ons on top of the base subscription",
                "Managing multiple companies generally requires a separate subscription per organization",
                "No inbound phone support; support is handled via help articles, email, and scheduled callbacks",
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
          Xero limitations above are based on its published U.S. plan structure and add-on pricing
          as of {REVIEWED_DATE_LABEL}; confirm current details for your market on Xero's official
          pricing page, since terms — and which features sit on which plan — change over time.
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
                  want to start on a free plan and upgrade as they add companies, users, or payroll.
                </li>
                <li>
                  <strong className="text-foreground">
                    Businesses that invoice or transact internationally
                  </strong>{" "}
                  and need multi-currency support without paying for a top-tier plan.
                </li>
                <li>
                  <strong className="text-foreground">
                    Businesses that carry physical inventory
                  </strong>{" "}
                  and want stock tracking included rather than a separate paid add-on.
                </li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">Who Should Choose Xero?</h2>
              </div>
              <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">
                    Businesses that want live bank feed connections
                  </strong>{" "}
                  and AI-assisted auto-reconciliation rather than manual statement import.
                </li>
                <li>
                  <strong className="text-foreground">
                    Businesses that already depend on Xero's app ecosystem
                  </strong>{" "}
                  for payroll, payments, e-commerce, or industry-specific tools.
                </li>
                <li>
                  <strong className="text-foreground">
                    Businesses whose accountant or bookkeeper works in Xero
                  </strong>{" "}
                  specifically, where switching platforms adds friction.
                </li>
                <li>
                  <strong className="text-foreground">
                    Businesses that need project/time tracking or built-in cash-flow forecasting
                  </strong>{" "}
                  and are willing to pay for Xero's Established plan to get them.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SWITCHING */}
      <section className="container mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-3xl font-bold">Switching from Xero to FinFlow Track</h2>
        <p className="mt-4 text-muted-foreground">
          FinFlow Track does not currently offer a direct, automated Xero import. A general
          migration approach looks like this:
        </p>
        <ol className="mt-8 space-y-5">
          {[
            "Review your existing Xero data — contacts, invoices, bills, and chart of accounts.",
            "Export the records Xero allows you to export (check current export options in your Xero plan).",
            "Review customer and invoice information for accuracy before re-entering it.",
            "Review expense and bill data so it maps cleanly to FinFlow Track's categories and vendors.",
            "Create and configure your company in FinFlow Track, including currency, tax, and inventory settings.",
            "Manually enter or bulk-upload supported records into FinFlow Track — there is currently no one-click Xero importer.",
            "Verify financial totals (revenue, expenses, balances) match between the two systems before relying on FinFlow Track alone.",
            "Test day-to-day workflows — invoicing, expense entry, bank statement import, reporting — with a small set of real transactions.",
            "Once verified, begin using FinFlow Track as your system of record and retire Xero for new entries.",
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
            implemented functionality and Xero's official documentation and pricing pages, checked
            on {REVIEWED_DATE_LABEL}. We consider pricing, core accounting functionality,
            invoicing, expenses, reporting, cash flow, multi-currency support, automation, bank
            connections, inventory, integrations, usability, and target audience. As the maker of
            FinFlow Track, we are not an independent reviewer — we've aimed to describe Xero fairly
            and to flag our own product's limitations rather than only its strengths. We did not
            conduct hands-on testing of Xero for this comparison; all Xero claims are sourced from
            Xero's public documentation and linked where relevant. Where we couldn't verify a detail
            confidently, we've said so and pointed you to the official source instead of guessing.
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
          <h2 className="text-3xl font-bold">FinFlow Track vs Xero: Final Verdict</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-background p-6">
              <h3 className="font-semibold">Choose FinFlow Track if:</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>· Its current feature set matches your requirements</li>
                <li>· You value a simpler, more focused interface</li>
                <li>· You want to start on a permanently free plan</li>
                <li>
                  · You need multi-currency or inventory without upgrading to a top-tier plan
                </li>
              </ul>
            </div>
            <div className="rounded-xl border bg-background p-6">
              <h3 className="font-semibold">Choose Xero if:</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>· You need live bank feed connections and auto-reconciliation</li>
                <li>· You depend on its third-party integration ecosystem</li>
                <li>· Your accountant or team already works extensively in Xero</li>
                <li>
                  · You need built-in cash-flow forecasting or project/time tracking and are
                  willing to pay for Xero's higher-tier plans
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
          We're building out comparisons against other accounting tools.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/compare/finflow-track-vs-quickbooks"
            className="rounded-full border px-4 py-2 text-sm text-foreground transition hover:bg-muted"
          >
            FinFlow Track vs QuickBooks
          </Link>
          {[
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
