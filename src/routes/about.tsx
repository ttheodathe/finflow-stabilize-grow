import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Bot,
  Building2,
  Cloud,
  CreditCard,
  Eye,
  FileText,
  Globe2,
  Handshake,
  KeyRound,
  Landmark,
  Lock,
  Mail,
  MapPin,
  Package,
  RefreshCw,
  Repeat,
  ScrollText,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Truck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About FinFlowTrack | Cloud Accounting Software Built by 2005CLG Ltd" },
      {
        name: "description",
        content:
          "Learn about FinFlowTrack, a cloud accounting platform developed by 2005CLG Ltd, a legally registered company in Rwanda, helping businesses worldwide simplify accounting, invoicing, reporting, inventory, and financial management.",
      },
      {
        property: "og:title",
        content: "About FinFlowTrack | Cloud Accounting Software Built by 2005CLG Ltd",
      },
      {
        property: "og:description",
        content:
          "Learn about FinFlowTrack, a cloud accounting platform developed by 2005CLG Ltd, a legally registered company in Rwanda, helping businesses worldwide simplify accounting, invoicing, reporting, inventory, and financial management.",
      },
    ],
  }),
});

const audiences = [
  "Freelancers",
  "Startups",
  "SMEs",
  "Agencies",
  "NGOs",
  "Accountants",
  "Growing businesses",
];

const coreValues = [
  {
    icon: Eye,
    title: "Transparency",
    desc: "Clear pricing, clear communication, and no hidden fees. What you see is what you get.",
  },
  {
    icon: Shield,
    title: "Security",
    desc: "Every account and every transaction is treated as something worth protecting properly.",
  },
  {
    icon: Sparkles,
    title: "Innovation",
    desc: "We build with modern tools, including AI-assisted workflows, to keep bookkeeping fast.",
  },
  {
    icon: Handshake,
    title: "Customer Success",
    desc: "We build for the people actually using the software — not just for a feature checklist.",
  },
  {
    icon: Lock,
    title: "Privacy",
    desc: "Financial data is sensitive. We treat it that way, by default, for every customer.",
  },
  {
    icon: RefreshCw,
    title: "Reliability",
    desc: "Software that's available when you need it, with steady, predictable improvements.",
  },
];

const trustReasons = [
  { icon: CreditCard, title: "Transparent pricing", desc: "Clear plans, published upfront." },
  { icon: BadgeCheck, title: "No hidden fees", desc: "No surprise charges buried in the fine print." },
  { icon: KeyRound, title: "Secure authentication", desc: "Modern, secure sign-in for every account." },
  { icon: Users, title: "Role-based permissions", desc: "Control exactly what each team member can access." },
  { icon: ScrollText, title: "Audit logs", desc: "Track changes across your financial records." },
  { icon: Lock, title: "Encrypted communication", desc: "Data in transit is protected end to end." },
  { icon: Cloud, title: "Cloud infrastructure", desc: "Access your books from anywhere, on any device." },
  { icon: RefreshCw, title: "Continuous updates", desc: "The product keeps improving, release after release." },
  { icon: Handshake, title: "Reliable support", desc: "A team that actually responds when you need help." },
];

const securityPoints = [
  { icon: Lock, title: "HTTPS encryption", desc: "All traffic between your browser and FinFlowTrack is encrypted." },
  { icon: Users, title: "Role-based access", desc: "Team permissions are scoped to what each role actually needs." },
  { icon: KeyRound, title: "Secure authentication", desc: "Account access is protected with modern authentication practices." },
  { icon: Cloud, title: "Automatic backups", desc: "Your data is backed up as part of normal cloud operations." },
  { icon: ScrollText, title: "Audit logs", desc: "Key actions across your account are recorded and reviewable." },
  { icon: ShieldCheck, title: "GDPR-conscious privacy", desc: "Privacy practices designed with data protection principles in mind." },
  { icon: Eye, title: "Continuous monitoring", desc: "We monitor the platform on an ongoing basis to catch issues early." },
];

const products = [
  { icon: FileText, title: "Invoicing" },
  { icon: BarChart3, title: "Accounting" },
  { icon: Users, title: "CRM" },
  { icon: Package, title: "Inventory" },
  { icon: Target, title: "Projects" },
  { icon: Wallet, title: "Expenses" },
  { icon: Banknote, title: "Payroll" },
  { icon: ScrollText, title: "Reports" },
  { icon: Bot, title: "AI Bookkeeper" },
  { icon: Building2, title: "Multi-company" },
  { icon: Repeat, title: "Subscriptions" },
];

const roadmap = [
  { icon: Bot, title: "AI", desc: "Deeper AI-assisted bookkeeping and financial insights." },
  { icon: Zap, title: "Mobile Apps", desc: "Manage your business finances on the go." },
  { icon: Globe2, title: "Public API", desc: "Connect FinFlowTrack to the rest of your stack." },
  { icon: Landmark, title: "Bank Integrations", desc: "Direct connections to streamline reconciliation." },
  { icon: RefreshCw, title: "Automation", desc: "Automate recurring, repetitive financial workflows." },
  { icon: BarChart3, title: "Advanced Reporting", desc: "Deeper, more customizable financial reporting." },
];

const timeline = [
  {
    year: "2026",
    items: ["Company established", "FinFlowTrack released", "Cloud platform launched"],
  },
  {
    year: "Future",
    items: ["Global expansion", "Marketplace", "Mobile apps"],
  },
];

const trustMetrics = [
  { icon: Globe2, label: "Global Businesses Supported" },
  { icon: Banknote, label: "Multi-Currency Ready" },
  { icon: Cloud, label: "Cloud Based" },
  { icon: Zap, label: "99.9% Uptime Target" },
  { icon: Sparkles, label: "Modern Infrastructure" },
  { icon: Lock, label: "Privacy Focused" },
];

const legalDetails = [
  { label: "Company Name", value: "2005CLG Ltd" },
  { label: "TIN", value: "156004232" },
  { label: "Country", value: "Republic of Rwanda" },
  { label: "Registered By", value: "Rwanda Development Board (RDB)" },
  { label: "Business Type", value: "Private Company Limited by Shares" },
  { label: "Industry", value: "Financial Technology, Cloud Software, Accounting Software" },
];

function AboutPage() {
  return (
    <div className="bg-background">
      <SiteHeader />

      {/* 1. HERO */}
      <section className="relative overflow-hidden border-b bg-gradient-subtle">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-secondary/10 blur-3xl" />
        </div>
        <div className="container mx-auto max-w-5xl px-6 py-24 text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5 border-border/60 bg-card/80 px-3 py-1.5 backdrop-blur">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            About FinFlowTrack
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Modern cloud accounting software <br className="hidden md:inline" />
            for <span className="gradient-text">growing businesses</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            FinFlowTrack is developed and operated by 2005CLG Ltd, a registered company based in
            Kigali, Rwanda, building practical financial software for businesses around the world.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-hero shadow-glow hover:opacity-95">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start Free <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 2. COMPANY OVERVIEW */}
      <section className="border-b py-24">
        <div className="container mx-auto max-w-5xl px-6">
          <Badge variant="secondary" className="mb-4">
            Who we are
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Company overview</h2>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <p className="text-base leading-relaxed text-muted-foreground">
              FinFlowTrack exists to make accounting and financial management simpler for
              businesses that don't have a large finance department behind them. Bookkeeping,
              invoicing, and reporting shouldn't require a specialist just to get started — they
              should be accessible to whoever is actually running the business.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              The platform is built global-first, with native multi-currency support, cloud
              accounting that works from anywhere, and AI-powered workflows that reduce the manual
              work of categorizing transactions and preparing reports.
            </p>
          </div>
          <div className="mt-10">
            <div className="text-sm font-semibold text-muted-foreground">Who we serve</div>
            <div className="mt-4 flex flex-wrap gap-3">
              {audiences.map((a) => (
                <div
                  key={a}
                  className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium shadow-soft"
                >
                  {a}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. FOUNDER SECTION */}
      <section className="border-b bg-muted/20 py-24">
        <div className="container mx-auto max-w-5xl px-6">
          <Badge variant="secondary" className="mb-4">
            Leadership
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Founder</h2>
          <Card className="mt-8 overflow-hidden border-border/60 shadow-elevated">
            <CardContent className="p-8 md:p-10">
              <div className="flex flex-col items-start gap-8 md:flex-row">
                <div className="flex h-28 w-28 flex-none items-center justify-center rounded-2xl bg-gradient-hero text-3xl font-bold text-primary-foreground shadow-glow">
                  TT
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Theodathe TUYIZERE</h3>
                  <p className="mt-1 text-sm font-medium text-primary">Chief Executive Officer</p>
                  <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
                    Theodathe leads FinFlowTrack with a focus on finance, technology, and building
                    practical software that entrepreneurs can actually rely on day to day. His
                    work centers on closing the gap between complex financial processes and the
                    real, everyday needs of small and growing businesses.
                  </p>
                  <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed">
                    "FinFlowTrack was created to simplify accounting and financial management for
                    businesses of every size."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. LEGAL COMPANY INFORMATION */}
      <section className="border-b py-24">
        <div className="container mx-auto max-w-5xl px-6">
          <Badge variant="secondary" className="mb-4">
            Legal information
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Registered company details</h2>
          <Card className="mt-8 border-border/60 shadow-elevated">
            <CardContent className="p-8 md:p-10">
              <div className="flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary w-fit">
                <ShieldCheck className="h-4 w-4" />
                Legally Registered Business
              </div>
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                {legalDetails.map((d) => (
                  <div key={d.label}>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {d.label}
                    </div>
                    <div className="mt-1 text-base font-medium">{d.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 5 & 6. MISSION & VISION */}
      <section className="border-b bg-muted/20 py-24">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border-border/60">
              <CardContent className="p-8">
                <Target className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-2xl font-bold tracking-tight">Our Mission</h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  To simplify accounting and financial management so that any business — regardless
                  of size or location — can understand and control its own finances without
                  needing specialized expertise just to get started.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-8">
                <Sparkles className="h-8 w-8 text-secondary" />
                <h3 className="mt-4 text-2xl font-bold tracking-tight">Our Vision</h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  A world where every freelancer, startup, and small business has access to the
                  same quality of financial tools as larger, well-resourced companies — cloud-based,
                  global-first, and built for how businesses actually operate today.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 7. CORE VALUES */}
      <section className="border-b py-24">
        <div className="container mx-auto max-w-6xl px-6">
          <Badge variant="secondary" className="mb-4">
            What we stand for
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Our core values</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {coreValues.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
                  <v.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. WHY BUSINESSES TRUST FINFLOWTRACK */}
      <section className="border-b bg-muted/20 py-24">
        <div className="container mx-auto max-w-6xl px-6">
          <Badge variant="secondary" className="mb-4">
            Trust
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Why businesses trust FinFlowTrack
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trustReasons.map((r) => (
              <div key={r.title} className="rounded-2xl border border-border bg-card p-6">
                <r.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold">{r.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. SECURITY & PRIVACY */}
      <section className="border-b py-24">
        <div className="container mx-auto max-w-6xl px-6">
          <Badge variant="secondary" className="mb-4">
            Security & privacy
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            How we protect your data
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Security and privacy are built into how FinFlowTrack operates, not treated as an
            afterthought.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {securityPoints.map((s) => (
              <div key={s.title} className="rounded-2xl border border-border bg-card p-6">
                <s.icon className="h-6 w-6 text-secondary" />
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. WHAT WE BUILD */}
      <section className="border-b bg-muted/20 py-24">
        <div className="container mx-auto max-w-6xl px-6">
          <Badge variant="secondary" className="mb-4">
            Product
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">What we build</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <div
                key={p.title}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4"
              >
                <p.icon className="h-5 w-5 flex-none text-primary" />
                <span className="text-sm font-medium">{p.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. ROADMAP */}
      <section className="border-b py-24">
        <div className="container mx-auto max-w-5xl px-6">
          <Badge variant="secondary" className="mb-4">
            What's next
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Our roadmap</h2>
          <div className="mt-10 space-y-6">
            {roadmap.map((r, i) => (
              <div key={r.title} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-hero shadow-glow">
                    <r.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  {i < roadmap.length - 1 && <div className="mt-2 h-full w-px flex-1 bg-border" />}
                </div>
                <div className="pb-8">
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. COMPANY TIMELINE */}
      <section className="border-b bg-muted/20 py-24">
        <div className="container mx-auto max-w-5xl px-6">
          <Badge variant="secondary" className="mb-4">
            Timeline
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Company timeline</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {timeline.map((t) => (
              <Card key={t.year} className="border-border/60">
                <CardContent className="p-7">
                  <div className="text-2xl font-bold text-primary">{t.year}</div>
                  <ul className="mt-4 space-y-2">
                    {t.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <div className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-secondary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 13. TRUST METRICS */}
      <section className="border-b py-24">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {trustMetrics.map((m) => (
              <div key={m.label} className="text-center">
                <m.icon className="mx-auto h-6 w-6 text-primary" />
                <div className="mt-3 text-sm font-medium text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 14. CONTACT INFORMATION */}
      <section className="border-b bg-muted/20 py-24">
        <div className="container mx-auto max-w-3xl px-6">
          <Badge variant="secondary" className="mb-4">
            Contact
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Get in touch</h2>
          <Card className="mt-8 border-border/60">
            <CardContent className="space-y-4 p-8">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 flex-none text-primary" />
                <span className="text-sm">2005CLG Ltd</span>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 flex-none text-primary" />
                <span className="text-sm">Kigali, Rwanda</span>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 flex-none text-primary" />
                <a href="mailto:support@finflowtrack.com" className="text-sm hover:text-primary">
                  support@finflowtrack.com
                </a>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Globe2 className="h-5 w-5 flex-none text-primary" />
                <a
                  href="https://finflowtrack.com"
                  className="text-sm hover:text-primary"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://finflowtrack.com
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 15. FINAL CTA */}
      <section className="px-6 py-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-hero p-12 text-center shadow-glow md:p-20">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-secondary/30 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground md:text-5xl">
              Join businesses building healthier financial workflows
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary" className="bg-card text-foreground hover:bg-card/90">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start Free <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20"
              >
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
