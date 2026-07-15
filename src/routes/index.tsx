import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
  Zap,
  PieChart,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import heroImage from "@/assets/hero-dashboard.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinFlow Track — 100% Free Accounting Software for Small Businesses" },
      {
        name: "description",
        content:
          "Modern, free accounting software for freelancers, small businesses, startups, NGOs, and African SMEs. Invoicing, expenses, multi-currency, AI bookkeeping. Free forever.",
      },
      { property: "og:title", content: "FinFlow Track — 100% Free Accounting Software" },
      {
        property: "og:description",
        content: "Beautiful, modern accounting for small businesses worldwide. Free forever.",
      },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: FileText,
    title: "Smart Invoicing",
    desc: "Create, send, and track beautiful invoices in seconds. PDF export, recurring billing, and online payments built in.",
  },
  {
    icon: Receipt,
    title: "Expense Tracking",
    desc: "Snap a receipt, our AI extracts the vendor, date, and amount automatically. Categorize and reconcile effortlessly.",
  },
  {
    icon: Building2,
    title: "Multi-Company",
    desc: "Run unlimited companies from one account. Perfect for agencies, accountants, and entrepreneurs juggling brands.",
  },
  {
    icon: Globe2,
    title: "Multi-Currency",
    desc: "Trade globally with live exchange rates. Native support for USD, EUR, GBP, RWF, KES, UGX, NGN and more.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Reports",
    desc: "P&L, balance sheet, cash flow, tax reports — generated instantly. Export to PDF, Excel, or CSV.",
  },
  {
    icon: Sparkles,
    title: "AI Bookkeeper",
    desc: "Ask: \u201cHow much profit did I make?\u201d or \u201cForecast next month.\u201d Get instant answers from your data.",
  },
];

const audience = [
  "Freelancers",
  "Small Businesses",
  "Startups",
  "NGOs",
  "Agencies",
  "Consultants",
  "Online Sellers",
  "African SMEs",
];

const pricing = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Everything you need to run your business",
    features: [
      "Unlimited invoices & customers",
      "Expense tracking",
      "Multi-currency",
      "1 company",
      "Basic reports",
      "Ad-supported",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Business",
    price: "$15",
    period: "per month",
    tagline: "For growing teams that need more power",
    features: [
      "Everything in Free",
      "Unlimited companies",
      "AI Bookkeeper & Receipt scanner",
      "Advanced reports & forecasting",
      "Up to 5 team members",
      "No ads, priority support",
    ],
    cta: "Start 14-Day Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$49",
    period: "per month",
    tagline: "For agencies and larger organizations",
    features: [
      "Everything in Business",
      "Unlimited team members",
      "API access & integrations",
      "Custom roles & audit logs",
      "Dedicated account manager",
      "SLA & onboarding",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const stats = [
  { value: "100K+", label: "Businesses served" },
  { value: "190+", label: "Countries" },
  { value: "30+", label: "Currencies" },
  { value: "4.9/5", label: "Average rating" },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <LogoCloud />
        <Features />
        <AiSection />
        <Audience />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-glow">
            <Wallet className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight">Free Accounting</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#ai"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            AI
          </a>
          <a
            href="pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
          <a
            href="audience"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Who it's for
          </a>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
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
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <a href="#features" onClick={() => setOpen(false)} className="text-sm font-medium">
              Features
            </a>
            <a href="#ai" onClick={() => setOpen(false)} className="text-sm font-medium">
              AI
            </a>
            <a href="#pricing" onClick={() => setOpen(false)} className="text-sm font-medium">
              Pricing
            </a>
            <a href="#audience" onClick={() => setOpen(false)} className="text-sm font-medium">
              Who it's for
            </a>
            <div className="mt-2 flex flex-col gap-2">
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
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-secondary/10 blur-3xl" />
      </div>
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 border-border/60 bg-card/80 px-3 py-1.5 text-xs font-medium backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            AI-powered bookkeeping is here
          </Badge>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            100% free accounting <br className="hidden md:inline" />
            for <span className="gradient-text">small businesses</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">
            Invoicing, expenses, multi-currency, and AI bookkeeping — built for freelancers,
            startups, NGOs, and SMEs worldwide. No credit card, no limits, free forever.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-hero shadow-glow hover:opacity-95">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free — no card required <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ mode: "login" }}>
                Sign in
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Join 100,000+ businesses · GDPR-ready · Bank-grade security
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-6xl">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-hero opacity-20 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elevated">
            <img
              src={heroImage}
              alt="FINFLOW TRACK dashboard showing revenue charts, expenses, and KPIs"
              width={1536}
              height={1024}
              className="w-full"
            />
          </div>
          <div className="absolute -left-4 top-1/3 hidden rounded-xl border border-border/60 bg-card/90 p-4 shadow-elevated backdrop-blur-xl md:block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/15">
                <Zap className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">This month</div>
                <div className="text-base font-bold">+ $24,580</div>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 bottom-12 hidden rounded-xl border border-border/60 bg-card/90 p-4 shadow-elevated backdrop-blur-xl md:block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <PieChart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cash flow</div>
                <div className="text-base font-bold">Healthy</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LogoCloud() {
  return (
    <section className="border-y border-border bg-card/30 py-10">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Trusted by businesses in 190+ countries
        </p>
        <div className="mt-6 grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold tracking-tight md:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground md:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Features
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Everything you need to run the books
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One platform for invoicing, expenses, banking, and reporting. Built modern, built fast.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated"
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
    <section id="ai" className="relative overflow-hidden bg-gradient-subtle py-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/2 h-[400px] w-[600px] -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> AI Bookkeeper
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Ask your books anything. <br />
            Get answers in seconds.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Skip the spreadsheet detective work. Our AI understands your financial data and answers
            in plain language — so you can make decisions, not reports.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "How much profit did I make this quarter?",
              "Which customers are overdue?",
              "Forecast next month's revenue",
              "Auto-categorize my last 200 transactions",
            ].map((q) => (
              <li key={q} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 flex-none text-secondary" />
                <span className="text-foreground/90">{q}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-hero">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="text-sm font-semibold">AI Bookkeeper</div>
            </div>
            <div className="space-y-4 pt-5">
              <div className="ml-auto max-w-xs rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                What was my profit last month?
              </div>
              <div className="max-w-sm rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm">
                You made <span className="font-semibold text-secondary">$12,480 profit</span> in
                October — up 18% from September. Revenue: $34,200. Expenses: $21,720.
              </div>
              <div className="ml-auto max-w-xs rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                Show overdue invoices
              </div>
              <div className="max-w-sm rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm">
                3 overdue invoices totaling <span className="font-semibold">$4,820</span>. Want me
                to send reminders?
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Audience() {
  return (
    <section id="audience" className="py-24">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <Badge variant="secondary" className="mb-4">
          Built for everyone
        </Badge>
        <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
          From solo freelancer to growing NGO
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Free Accounting scales with you — whether you're invoicing your first client or running a
          multi-country operation.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {audience.map((a) => (
            <div
              key={a}
              className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium shadow-soft transition-all hover:border-primary/40 hover:shadow-elevated"
            >
              {a}
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Bank-grade security",
              desc: "Encrypted at rest and in transit. GDPR-ready, with SOC 2 on the roadmap.",
            },
            {
              icon: Users,
              title: "Built for teams",
              desc: "Invite your accountant, partner, or staff. Roles and permissions included.",
            },
            {
              icon: CreditCard,
              title: "Get paid faster",
              desc: "Online payments via card and mobile money. Average customer pays 8 days sooner.",
            },
          ].map((b) => (
            <div key={b.title} className="rounded-2xl border border-border bg-card p-7 text-left">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/15">
                <b.icon className="h-5 w-5 text-secondary" />
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
    <section id="pricing" className="bg-gradient-subtle py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Simple, honest pricing</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free. Upgrade when you need more. Cancel anytime.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-3">
          {pricing.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-8 ${
                p.highlighted ? "border-primary bg-card shadow-elevated" : "border-border bg-card"
              }`}
            >
              {p.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-hero px-3 py-1 text-xs font-semibold text-primary-foreground shadow-glow">
                  Most popular
                </div>
              )}
              <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {p.name}
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-5xl font-bold tracking-tight">{p.price}</span>
                <span className="text-sm text-muted-foreground">/ {p.period}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
              <Button
                asChild
                className={`mt-6 w-full ${p.highlighted ? "bg-gradient-hero shadow-glow hover:opacity-95" : ""}`}
                variant={p.highlighted ? "default" : "outline"}
              >
                <Link to="/auth" search={{ mode: "signup" }}>
                  {p.cta}
                </Link>
              </Button>
              <ul className="mt-7 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-secondary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="px-6 py-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-hero p-12 text-center shadow-glow md:p-20">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-secondary/30 blur-3xl" />
        </div>
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground md:text-5xl">
            Run your books in minutes, not hours
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90">
            Join 100,000+ businesses using Free Accounting. No credit card, no limits, free forever.
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
      </div>
    </section>
  );
}

function Footer() {
  const footerLinks = [
    {
      title: "Product",
      links: [
        { label: "Features", to: "/features" },
        { label: "Pricing", to: "/pricing" },
        { label: "AI Bookkeeper", to: "/ai-bookkeeper" },
        { label: "Integrations", to: "/integrations" },
        { label: "Changelog", to: "/changelog" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", to: "/about" },
        { label: "Blog", to: "/blog" },
        { label: "Careers", to: "/careers" },
        { label: "Press", to: "/press" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Help center", to: "/help" },
        { label: "Guides", to: "/guides" },
        { label: "Contact", to: "/contact" },
        { label: "Privacy", to: "/privacy" },
        { label: "Terms", to: "/terms" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero">
                <Wallet className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold tracking-tight">Finflow Tracck</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              100% free accounting software for small businesses worldwide. Built modern, built for
              you.
            </p>
          </div>
          {footerLinks.map((c) => (
            <div key={c.title}>
              <div className="text-sm font-semibold">{c.title}</div>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} FINFLOW TRACK. All rights reserved.</div>
          <div>Made for freelancers, startups, NGOs, and SMEs worldwide.</div>
        </div>
      </div>
    </footer>
  );
}
