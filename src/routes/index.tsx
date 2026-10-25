import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/SiteFooter";
import {
  ArrowRight,
  Check,
  FileText,
  Receipt,
  Wallet,
  BarChart3,
  Globe2,
  Sparkles,
  Users,
  ShieldCheck,
  Building2,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanKey } from "@/lib/paddle/config";

const SITE_URL = "https://www.finflowtrack.com/";
const PAGE_TITLE = "FinFlow Track — Accounting & Cash Flow Software for Small Businesses";
const PAGE_DESC =
  "Know your numbers, control your cash flow and grow your business. Invoicing, expenses, multi-currency bookkeeping and financial reports for freelancers, SMEs and NGOs. Start on the Free plan.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESC },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESC },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESC },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "FinFlow Track",
          url: SITE_URL,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          description: PAGE_DESC,
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            description: "Free plan available; paid plans from $19/month",
          },
        }),
      },
    ],
  }),
  component: LandingPage,
});

/* ---------- Content (all claims verified against the codebase) ---------- */

const faqs = [
  {
    q: "Is there a free plan?",
    a: "Yes. You can sign up and start on the Free plan without a credit card. Paid plans add more companies, team members and features. See the pricing page for the current limits.",
  },
  {
    q: "Can I invoice in different currencies?",
    a: "Yes. You can invoice in the currency your customer uses, and exchange rates are locked when a transaction is recorded.",
  },
  {
    q: "Can I manage more than one business?",
    a: "Yes, on plans that include multiple companies. Each company has its own separate books, and you switch between them from one login.",
  },
  {
    q: "How is my financial data protected?",
    a: "Each company's records are kept separate and access is controlled by membership and role. Details are on our Security and Privacy pages.",
  },
  {
    q: "Does the AI Bookkeeper replace my accountant?",
    a: "No. It answers questions using the invoices and expenses in your account, and you should check important figures against your reports. It is available on the Professional and Business plans.",
  },
  {
    q: "Can I export my data?",
    a: "Yes. Reports can be exported to CSV and invoices to PDF.",
  },
];

const features = [
  {
    icon: FileText,
    title: "Invoicing",
    desc: "Create invoices, export them as PDF, email them to customers and share a secure online invoice link. Recurring invoices on paid plans.",
  },
  {
    icon: Receipt,
    title: "Expenses & bills",
    desc: "Track expenses and supplier bills by vendor and category, and reconcile against bank statement imports.",
  },
  {
    icon: BarChart3,
    title: "Financial reports",
    desc: "Profit & loss, balance sheet, cash flow, and receivables/payables aging, with CSV export and saved report filters.",
  },
  {
    icon: Globe2,
    title: "Multi-currency",
    desc: "Invoice in the currency your customer uses. Exchange rates are locked when a transaction is recorded.",
  },
  {
    icon: Building2,
    title: "Multiple companies",
    desc: "Switch between companies from one login, each with its own separate books. Company limits depend on your plan.",
  },
  {
    icon: Users,
    title: "Teams & roles",
    desc: "Invite your accountant or staff and control what each person can see and do.",
  },
];

const steps = [
  {
    title: "Create your account",
    desc: "Sign up with your email. No credit card is needed for the Free plan.",
  },
  {
    title: "Set up your company",
    desc: "Add your business name and choose your base currency during onboarding.",
  },
  {
    title: "Record and review",
    desc: "Create invoices, log expenses, and open reports to see where you stand.",
  },
];

const pricingOrder: PlanKey[] = ["free", "pro", "business", "enterprise"];

function planPrice(key: PlanKey) {
  const p = PLANS[key];
  if (p.priceMonthly === null) return "Custom";
  return `$${p.priceMonthly}`;
}

/* ---------- Page ---------- */

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow-elevated"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="pb-20 md:pb-0">
        <Hero />
        <HowItWorks />
        <Features />
        <AiSection />
        <Trust />
        <Pricing />
        <Faq />
        <CTA />
      </main>
      <MobileStickyCta />
      <SiteFooter />
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const navLink =
    "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-glow">
            <Wallet className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight">FinFlow Track</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          <Link to="/features" className={navLink}>
            Features
          </Link>
          <a href="#ai" className={navLink}>
            AI
          </a>
          <Link to="/pricing" className={navLink}>
            Pricing
          </Link>
          <a href="#how-it-works" className={navLink}>
            How it works
          </a>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {signedIn ? (
            <Button asChild size="sm" className="bg-gradient-hero shadow-glow hover:opacity-95">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" search={{ mode: "login" }}>
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-hero shadow-glow hover:opacity-95">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started free
                </Link>
              </Button>
            </>
          )}
        </div>
        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div id="mobile-nav" className="border-t border-border bg-background px-6 py-4 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-3">
            <Link to="/features" onClick={() => setOpen(false)} className="text-sm font-medium">
              Features
            </Link>
            <a href="#ai" onClick={() => setOpen(false)} className="text-sm font-medium">
              AI
            </a>
            <Link to="/pricing" onClick={() => setOpen(false)} className="text-sm font-medium">
              Pricing
            </Link>
            <a href="#how-it-works" onClick={() => setOpen(false)} className="text-sm font-medium">
              How it works
            </a>
            <div className="mt-2 flex flex-col gap-2">
              {signedIn ? (
                <Button asChild size="sm" className="bg-gradient-hero">
                  <Link to="/dashboard">Go to dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/auth" search={{ mode: "login" }}>
                      Sign in
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="bg-gradient-hero">
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Get started free
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-subtle">
      <div className="mx-auto max-w-7xl px-6 pb-16 pt-16 md:pb-24 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 border-border/60 bg-card/80 px-3 py-1.5 text-xs font-medium"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Accounting for freelancers, SMEs and NGOs
          </Badge>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
            Know your numbers. <span className="gradient-text">Control your cash flow.</span> Grow
            your business.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">
            Invoicing, expenses and financial reports in one place, so you always know who owes you,
            what you owe and where your business stands.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-hero shadow-glow hover:opacity-95">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free plan available · No credit card needed to sign up ·{" "}
            <Link to="/auth" search={{ mode: "login" }} className="underline underline-offset-2">
              Already have an account? Sign in
            </Link>
          </p>
        </div>

        <ReportsPreview />
      </div>
    </section>
  );
}

/**
 * Illustrative preview built from real report names in the app.
 * Figures are labelled as sample data. Replace with a real screenshot
 * (e.g. /public/screenshots/reports.webp) when one is available.
 */
function ReportsPreview() {
  const rows = [
    { label: "Current", w: "w-4/5" },
    { label: "1–30 days overdue", w: "w-2/5" },
    { label: "31–60 days overdue", w: "w-1/4" },
    { label: "60+ days overdue", w: "w-[12%]" },
  ];
  return (
    <figure className="mx-auto mt-14 max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div
          className="flex flex-wrap gap-1 border-b border-border bg-muted/40 p-2 text-xs font-medium"
          aria-hidden="true"
        >
          {["Profit & Loss", "Balance Sheet", "Cash Flow", "AR Aging", "AP Aging"].map((t) => (
            <span
              key={t}
              className={`rounded-md px-3 py-1.5 ${
                t === "AR Aging" ? "bg-card shadow-soft" : "text-muted-foreground"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="p-6">
          <div className="text-sm font-semibold">Receivables aging</div>
          <div className="mt-4 space-y-3">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center gap-3 text-xs">
                <span className="w-36 flex-none text-muted-foreground">{r.label}</span>
                <div className="h-3 flex-1 rounded-full bg-muted">
                  <div className={`h-3 rounded-full bg-gradient-hero ${r.w}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted-foreground">
        Illustration of the AR Aging report using sample data, not real customer figures.
      </figcaption>
    </figure>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4">
            Getting started
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Up and running in three steps
          </h2>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-7">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-hero text-sm font-bold text-primary-foreground">
                {i + 1}
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="scroll-mt-20 bg-gradient-subtle py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Features
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need to run the books
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One platform for invoicing, expenses, banking imports and reporting.{" "}
            <Link to="/features" className="font-medium text-primary underline underline-offset-2">
              See all features
            </Link>
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-7 transition-colors hover:border-primary/40"
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
                <f.icon className="h-6 w-6 text-primary-foreground" strokeWidth={2.2} />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AiSection() {
  return (
    <section id="ai" className="scroll-mt-20 py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> AI Bookkeeper
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ask questions about your books in plain language
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            The AI Bookkeeper answers questions using your own invoices and expenses. It is
            available on the {PLANS.pro.name} and {PLANS.business.name} plans. Always check
            important figures against your reports.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "How much did I spend on software this quarter?",
              "Which customers have overdue invoices?",
              "What were my biggest expenses last month?",
            ].map((q) => (
              <li key={q} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 flex-none text-secondary" aria-hidden="true" />
                <span className="text-foreground/90">{q}</span>
              </li>
            ))}
          </ul>
        </div>
        <figure>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-hero">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="text-sm font-semibold">AI Bookkeeper</div>
            </div>
            <div className="space-y-4 pt-5">
              <div className="ml-auto max-w-xs rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                Which customers have overdue invoices?
              </div>
              <div className="max-w-sm rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm">
                The assistant lists your overdue invoices by customer, based on the records in your
                account.
              </div>
            </div>
          </div>
          <figcaption className="mt-3 text-center text-xs text-muted-foreground">
            Example interaction. Real answers depend on your own data.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Trust() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Separate books per company",
      desc: "Each company's records are kept separate, and access is controlled by membership and role.",
    },
    {
      icon: Users,
      title: "Role-based permissions",
      desc: "Decide who on your team can view or change financial records.",
    },
    {
      icon: FileText,
      title: "Your data, your records",
      desc: "Export reports to CSV and invoices to PDF whenever you need them.",
    },
  ];
  return (
    <section className="bg-gradient-subtle py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Built to protect your financial data
          </h2>
          <p className="mt-4 text-muted-foreground">
            Read how we handle security on our{" "}
            <Link to="/security" className="font-medium text-primary underline underline-offset-2">
              Security
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-medium text-primary underline underline-offset-2">
              Privacy
            </Link>{" "}
            pages.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((b) => (
            <div key={b.title} className="rounded-2xl border border-border bg-card p-7">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/15">
                <b.icon className="h-5 w-5 text-secondary" aria-hidden="true" />
              </div>
              <h3 className="font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Start free. Upgrade when you need more.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Compare every plan in detail on the{" "}
            <Link to="/pricing" className="font-medium text-primary underline underline-offset-2">
              pricing page
            </Link>
            .
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
          {pricingOrder.map((key) => {
            const p = PLANS[key];
            const highlighted = key === "pro";
            return (
              <div
                key={key}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  highlighted ? "border-primary bg-card shadow-elevated" : "border-border bg-card"
                }`}
              >
                {highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-hero px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </div>
                )}
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {p.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold tracking-tight">{planPrice(key)}</span>
                  {p.priceMonthly !== null && (
                    <span className="text-sm text-muted-foreground">/ month</span>
                  )}
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {p.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className="mt-0.5 h-4 w-4 flex-none text-secondary"
                        aria-hidden="true"
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={`mt-7 w-full ${highlighted ? "bg-gradient-hero hover:opacity-95" : ""}`}
                  variant={highlighted ? "default" : "outline"}
                >
                  {key === "free" ? (
                    <Link to="/auth" search={{ mode: "signup", plan: "free" }}>
                      Start free
                    </Link>
                  ) : key === "enterprise" ? (
                    <Link to="/contact">Contact us</Link>
                  ) : (
                    <Link to="/pricing">View {p.name} plan</Link>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-gradient-subtle py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-10 space-y-3">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-border bg-card px-5 py-4 open:shadow-soft"
            >
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Always-visible signup button on phones. Pure CSS, no JavaScript. */
function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
      <Button asChild size="lg" className="w-full bg-gradient-hero shadow-glow">
        <Link to="/auth" search={{ mode: "signup" }}>
          Start free <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function CTA() {
  return (
    <section className="px-6 pb-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-hero p-12 text-center shadow-glow md:p-16">
        <h2 className="text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl">
          See where your business stands today
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90">
          Create a free account, add your company and send your first invoice.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="bg-card text-foreground hover:bg-card/90"
          >
            <Link to="/auth" search={{ mode: "signup" }}>
              Get started free <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20"
          >
            <Link to="/auth" search={{ mode: "login" }}>
              Sign in
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
