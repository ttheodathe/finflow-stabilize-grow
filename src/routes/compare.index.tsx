import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, Check, Minus, Users, Building2, Package, Globe, Wallet } from "lucide-react";

const SITE_URL = "https://finflowtrack.com";
const PAGE_URL = `${SITE_URL}/compare`;
const REVIEWED_DATE = "2026-08-14";
const REVIEWED_DATE_LABEL = "August 14, 2026";

export const Route = createFileRoute("/compare/")({
  component: CompareHubPage,
  head: () => {
    const title = "Accounting Software Comparisons: FinFlow Track vs QuickBooks, Xero, Wave & More";
    const description =
      "Compare FinFlow Track with leading accounting software including QuickBooks, Xero, Wave, Zoho Books and more.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
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
              { "@type": "ListItem", position: 2, name: "Compare", item: PAGE_URL },
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

type CardStatus = "live" | "soon";

const comparisonCards: {
  name: string;
  description: string;
  bestFor: string;
  keyDifference: string;
  status: CardStatus;
  href?: string;
}[] = [
  {
    name: "QuickBooks",
    description: "The best-known small-business accounting platform in the US, with a large accountant network.",
    bestFor: "Businesses whose accountant already works in QuickBooks",
    keyDifference: "QuickBooks has a much larger ecosystem; FinFlow Track includes multi-currency at every tier.",
    status: "live",
    href: "/compare/finflow-track-vs-quickbooks",
  },
  {
    name: "Xero",
    description: "An established accounting platform with live bank feeds and a large app marketplace.",
    bestFor: "Businesses that want live bank feed connections and auto-reconciliation",
    keyDifference: "Xero gates multi-currency and project tracking to its top-tier plan; FinFlow Track includes multi-currency on every plan.",
    status: "live",
    href: "/compare/finflow-track-vs-xero",
  },
  {
    name: "Wave",
    description: "A free-to-start platform with built-in payment processing, currently limited to the US and Canada.",
    bestFor: "US/Canada freelancers who want integrated online invoice payments",
    keyDifference: "Wave restricts new signups to the US and Canada and locks your base currency to USD or CAD.",
    status: "live",
    href: "/compare/finflow-track-vs-wave",
  },
  {
    name: "Zoho Books",
    description: "A mature accounting platform with six pricing tiers and deep inventory tools.",
    bestFor: "Businesses that will grow into deeper accounting, inventory, or Zoho-ecosystem needs",
    keyDifference: "Zoho Books' free plan is revenue-capped at $50K/year; FinFlow Track's free plan has no revenue cap.",
    status: "live",
    href: "/compare/finflow-track-vs-zoho-books",
  },
  {
    name: "FreshBooks",
    description: "Invoicing-first software popular with service-based freelancers and small teams.",
    bestFor: "Service businesses that bill primarily by time and project",
    keyDifference: "Comparison in progress.",
    status: "soon",
  },
  {
    name: "Sage",
    description: "A long-established accounting brand spanning small-business and enterprise products.",
    bestFor: "Businesses wanting a legacy accounting brand with broad product tiers",
    keyDifference: "Comparison in progress.",
    status: "soon",
  },
  {
    name: "Odoo",
    description: "An open-source business suite covering accounting alongside CRM, inventory, and more.",
    bestFor: "Businesses wanting accounting bundled with broader operations software",
    keyDifference: "Comparison in progress.",
    status: "soon",
  },
  {
    name: "Excel",
    description: "General-purpose spreadsheet software many small businesses start with before adopting dedicated accounting software.",
    bestFor: "Very early-stage businesses tracking a handful of transactions manually",
    keyDifference: "Comparison in progress.",
    status: "soon",
  },
  {
    name: "Google Sheets",
    description: "Free, collaborative spreadsheet software commonly used as an early, manual bookkeeping stand-in.",
    bestFor: "Solo founders wanting free, flexible manual tracking before adopting dedicated software",
    keyDifference: "Comparison in progress.",
    status: "soon",
  },
];

type Availability = "yes" | "no" | "partial";

function StatusMark({ status, label }: { status: Availability; label?: string }) {
  if (status === "yes") {
    return (
      <span className="inline-flex items-center justify-center gap-1.5 text-sm">
        <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
        <span className="sr-only">Included</span>
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
      <span className="sr-only">Not included</span>
      {label && <span>{label}</span>}
    </span>
  );
}

const matrixRows: {
  category: string;
  finflow: { status: Availability; label?: string };
  quickbooks: { status: Availability; label?: string };
  xero: { status: Availability; label?: string };
  wave: { status: Availability; label?: string };
  zoho: { status: Availability; label?: string };
}[] = [
  {
    category: "Free plan",
    finflow: { status: "yes", label: "No revenue cap" },
    quickbooks: { status: "no", label: "Free trial only" },
    xero: { status: "no", label: "Free trial only" },
    wave: { status: "yes", label: "Starter plan" },
    zoho: { status: "partial", label: "Revenue under $50K/yr" },
  },
  {
    category: "Invoicing",
    finflow: { status: "yes" },
    quickbooks: { status: "yes" },
    xero: { status: "partial", label: "Capped on entry plan" },
    wave: { status: "yes" },
    zoho: { status: "partial", label: "Capped by plan" },
  },
  {
    category: "Expense tracking",
    finflow: { status: "yes" },
    quickbooks: { status: "yes" },
    xero: { status: "yes" },
    wave: { status: "yes" },
    zoho: { status: "yes" },
  },
  {
    category: "Full financial reports",
    finflow: { status: "partial", label: "Professional plan+" },
    quickbooks: { status: "yes" },
    xero: { status: "yes" },
    wave: { status: "yes" },
    zoho: { status: "yes", label: "Included on Free" },
  },
  {
    category: "Multi-currency",
    finflow: { status: "yes", label: "Every plan, incl. Free" },
    quickbooks: { status: "partial", label: "Plan dependent" },
    xero: { status: "partial", label: "Top-tier plan only" },
    wave: { status: "partial", label: "USD/CAD base currency only" },
    zoho: { status: "partial", label: "Professional plan+" },
  },
  {
    category: "Inventory",
    finflow: { status: "partial", label: "Professional plan+" },
    quickbooks: { status: "partial", label: "Plan dependent" },
    xero: { status: "partial", label: "Paid add-on" },
    wave: { status: "no" },
    zoho: { status: "partial", label: "Professional plan+" },
  },
  {
    category: "Bank reconciliation",
    finflow: { status: "partial", label: "Professional plan+, CSV import" },
    quickbooks: { status: "yes", label: "Live feeds" },
    xero: { status: "yes", label: "Live feeds, auto-reconcile" },
    wave: { status: "partial", label: "Pro plan for live feeds" },
    zoho: { status: "yes", label: "Free; live feeds on Standard+" },
  },
  {
    category: "AI / automation",
    finflow: { status: "partial", label: "Professional plan+" },
    quickbooks: { status: "partial", label: "Plan dependent" },
    xero: { status: "yes", label: "JAX, rolling out by plan" },
    wave: { status: "partial", label: "Pro plan for auto-categorization" },
    zoho: { status: "yes", label: "Receipt autoscan from Free" },
  },
  {
    category: "Multiple companies",
    finflow: { status: "yes", label: "Plan-dependent limits" },
    quickbooks: { status: "partial", label: "Separate subscription each" },
    xero: { status: "partial", label: "Separate subscription each" },
    wave: { status: "yes", label: "One login, billed per business" },
    zoho: { status: "yes", label: "Separate org, typically billed each" },
  },
  {
    category: "Integrations",
    finflow: { status: "no", label: "In development" },
    quickbooks: { status: "yes", label: "Large marketplace" },
    xero: { status: "yes", label: "1,000+ apps" },
    wave: { status: "partial", label: "Small native set + Zapier" },
    zoho: { status: "yes", label: "Zoho ecosystem + 20+ tools" },
  },
];

const useCases: {
  title: string;
  icon: typeof Users;
  items: { name: string; href?: string }[];
}[] = [
  {
    title: "Best for Freelancers",
    icon: Users,
    items: [
      { name: "Wave", href: "/compare/finflow-track-vs-wave" },
      { name: "FreshBooks" },
      { name: "FinFlow Track", href: "/pricing" },
    ],
  },
  {
    title: "Best for Small Businesses",
    icon: Building2,
    items: [
      { name: "FinFlow Track", href: "/pricing" },
      { name: "Xero", href: "/compare/finflow-track-vs-xero" },
      { name: "Zoho Books", href: "/compare/finflow-track-vs-zoho-books" },
    ],
  },
  {
    title: "Best for Inventory-Heavy Businesses",
    icon: Package,
    items: [
      { name: "Zoho Books", href: "/compare/finflow-track-vs-zoho-books" },
      { name: "Odoo" },
    ],
  },
  {
    title: "Best Free Accounting Software",
    icon: Wallet,
    items: [
      { name: "FinFlow Track", href: "/pricing" },
      { name: "Wave", href: "/compare/finflow-track-vs-wave" },
    ],
  },
  {
    title: "Best Multi-Currency Software",
    icon: Globe,
    items: [
      { name: "FinFlow Track", href: "/pricing" },
      { name: "Xero", href: "/compare/finflow-track-vs-xero" },
    ],
  },
];

const popularComparisons = [
  { name: "FinFlow Track vs QuickBooks", href: "/compare/finflow-track-vs-quickbooks" },
  { name: "FinFlow Track vs Xero", href: "/compare/finflow-track-vs-xero" },
  { name: "FinFlow Track vs Wave", href: "/compare/finflow-track-vs-wave" },
  { name: "FinFlow Track vs Zoho Books", href: "/compare/finflow-track-vs-zoho-books" },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "Which accounting software is best for small businesses?",
    a: "It depends on your revenue, team size, and which features you need unlocked at which price. FinFlow Track, Xero, and Zoho Books are all reasonable starting points for a small business — see the use-case breakdown above and the individual comparison pages for the specifics that matter to your situation.",
  },
  {
    q: "Which software has the best free plan?",
    a: "FinFlow Track's Free plan has no revenue cap and includes multi-currency support. Wave's Starter plan is free with unlimited invoicing and built-in payment processing, but new signups are limited to the US and Canada. Zoho Books' Free plan includes full accounting and bank reconciliation but is capped to businesses earning under $50,000/year. QuickBooks and Xero don't currently offer an ongoing free plan, only free trials.",
  },
  {
    q: "Which supports multiple currencies?",
    a: "FinFlow Track includes multi-currency support (50+ currencies) on every plan, including Free. Xero and Zoho Books support multi-currency on their higher-tier plans only. Wave supports foreign-currency invoicing but locks your business's base currency to USD or CAD.",
  },
  {
    q: "What is a QuickBooks alternative?",
    a: "A QuickBooks alternative is accounting software that covers similar core workflows — invoicing, expense tracking, bookkeeping, and reporting — without requiring a QuickBooks subscription. FinFlow Track, Xero, Wave, and Zoho Books are all commonly evaluated as QuickBooks alternatives, each with different trade-offs on pricing, multi-currency, and automation. See our full comparison for specifics.",
  },
  {
    q: "What is a Xero alternative?",
    a: "A Xero alternative is accounting software offering comparable invoicing, bank reconciliation, and reporting capabilities. FinFlow Track is one option, particularly for businesses that want multi-currency support without upgrading to Xero's top-tier plan. See our full FinFlow Track vs Xero comparison for a feature-by-feature breakdown.",
  },
  {
    q: "What is a Wave alternative?",
    a: "A Wave alternative is accounting software with a comparable free tier and invoicing capabilities. FinFlow Track is a common alternative for businesses outside the US and Canada, since Wave currently restricts new signups to those two markets.",
  },
  {
    q: "What is a Zoho Books alternative?",
    a: "A Zoho Books alternative offers comparable accounting, invoicing, and reporting functionality. FinFlow Track is one option, particularly for businesses that have outgrown Zoho Books' free-plan revenue cap or that want multi-currency support without paying for Zoho's Professional plan.",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CompareHubPage() {
  return (
    <div className="bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="border-b">
        <div className="container mx-auto max-w-5xl px-6 py-16 lg:py-20">
          <span className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            Accounting Software Comparisons
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight lg:text-5xl">
            Compare FinFlow Track With Leading Accounting Software
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Every business has different accounting needs — pricing, invoicing, bookkeeping,
            reporting, inventory, automation, multi-currency support, and integrations all matter
            differently depending on your size, revenue, and workflow. Use this hub to compare
            FinFlow Track against the accounting software you're already considering, feature by
            feature.
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
        </div>
      </section>

      {/* COMPARISON GRID */}
      <section className="container mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold">Browse Comparisons</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Four detailed comparisons are live today, with more on the way.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {comparisonCards.map((card) => (
            <div
              key={card.name}
              className="flex flex-col rounded-2xl border bg-background p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">FinFlow Track vs {card.name}</h3>
                {card.status === "soon" && (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{card.description}</p>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="font-medium text-foreground">Best for: </span>
                  <span className="text-muted-foreground">{card.bestFor}</span>
                </p>
                <p>
                  <span className="font-medium text-foreground">Key difference: </span>
                  <span className="text-muted-foreground">{card.keyDifference}</span>
                </p>
              </div>
              <div className="mt-6">
                {card.status === "live" && card.href ? (
                  <Link
                    to={card.href}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Read Comparison
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    Read Comparison
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURE MATRIX */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-3xl font-bold">Feature Comparison Matrix</h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            A high-level snapshot across all five platforms. See each individual comparison page
            for plan-by-plan detail, pricing, and sourcing.
          </p>

          <div className="mt-8 overflow-x-auto rounded-2xl border bg-background">
            <table className="min-w-full">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-4 py-4 text-left text-sm font-semibold">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-4 text-center text-sm font-semibold">
                    FinFlow Track
                  </th>
                  <th scope="col" className="px-4 py-4 text-center text-sm font-semibold">
                    QuickBooks
                  </th>
                  <th scope="col" className="px-4 py-4 text-center text-sm font-semibold">
                    Xero
                  </th>
                  <th scope="col" className="px-4 py-4 text-center text-sm font-semibold">
                    Wave
                  </th>
                  <th scope="col" className="px-4 py-4 text-center text-sm font-semibold">
                    Zoho Books
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row) => (
                  <tr key={row.category} className="border-t">
                    <th
                      scope="row"
                      className="px-4 py-4 text-left text-sm font-medium text-foreground"
                    >
                      {row.category}
                    </th>
                    <td className="px-4 py-4 text-center">
                      <StatusMark status={row.finflow.status} label={row.finflow.label} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusMark status={row.quickbooks.status} label={row.quickbooks.label} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusMark status={row.xero.status} label={row.xero.label} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusMark status={row.wave.status} label={row.wave.label} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusMark status={row.zoho.status} label={row.zoho.label} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            "Plan dependent" or partial markers indicate the feature varies by plan, region, or
            has usage limits — see the individual comparison pages for exact plan requirements and
            sourcing, and confirm current details on each provider's official site before deciding.
          </p>
        </div>
      </section>

      {/* COMPARE BY USE CASE */}
      <section className="container mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold">Compare by Use Case</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          A starting point based on what matters most to your business right now.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <div key={useCase.title} className="rounded-2xl border bg-background p-6">
              <div className="flex items-center gap-3">
                <useCase.icon className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">{useCase.title}</h3>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {useCase.items.map((item) => (
                  <li key={item.name}>
                    {item.href ? (
                      <Link to={item.href} className="text-primary hover:underline">
                        {item.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{item.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* POPULAR COMPARISONS */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-bold">Popular Comparisons</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {popularComparisons.map((comparison) => (
              <Link
                key={comparison.href}
                to={comparison.href}
                className="flex items-center justify-between rounded-xl border bg-background px-6 py-4 transition hover:shadow-md"
              >
                <span className="font-medium">{comparison.name}</span>
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* METHODOLOGY */}
      <section className="container mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-3xl font-bold">How We Compare Accounting Software</h2>
        <p className="mt-4 text-muted-foreground leading-7">
          Every comparison on FinFlow Track is written by our team using our own product's actual,
          plan-gated functionality alongside each competitor's official documentation and pricing
          pages. We consider pricing, free-plan limitations, core accounting functionality,
          invoicing, expenses, reports, inventory, multi-currency support, automation,
          integrations, usability, and target audience. As the maker of FinFlow Track, we are not
          an independent reviewer — we aim to describe competitors fairly, including features they
          offer that we currently don't, rather than only listing our own strengths. We do not
          conduct hands-on testing of competitor products; all competitor claims are sourced from
          public documentation and linked on each comparison page. Where we can't verify a detail
          confidently, we say so rather than guessing. Individual comparison pages are reviewed and
          dated — check each page for when it was last checked.
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

      <SiteFooter />
    </div>
  );
}
