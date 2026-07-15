import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Receipt,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

export const Route = createFileRoute("/help")({
  component: HelpCenterPage,
  head: () => ({
    meta: [
      {
        title: "FinFlowTrack Help Center | Accounting Software Guides & Support",
      },
      {
        name: "description",
        content:
          "Learn how to use FinFlowTrack accounting software with guides for invoices, expenses, inventory, subscriptions, teams, and business management.",
      },
      {
        property: "og:title",
        content: "FinFlowTrack Help Center | Accounting Software Guides & Support",
      },
      {
        property: "og:description",
        content:
          "Learn how to use FinFlowTrack accounting software with guides for invoices, expenses, inventory, subscriptions, teams, and business management.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: "https://www.finflowtrack.com/help",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://www.finflowtrack.com/help",
      },
    ],
  }),
});

const popularSearches = [
  "Create a company",
  "Invite team members",
  "Upgrade subscription",
  "Create invoice",
  "Manage inventory",
  "Reset password",
];

interface HelpCategory {
  id: string;
  title: string;
  icon: typeof HelpCircle;
  description: string;
  articles: string[];
}

const helpCategories: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    description: "Set up your account and get oriented in FinFlowTrack.",
    articles: [
      "Create your FinFlowTrack account",
      "Complete your profile",
      "Create your first company",
      "Understand your dashboard",
    ],
  },
  {
    id: "account-security",
    title: "Account & Security",
    icon: ShieldCheck,
    description: "Keep your account safe and up to date.",
    articles: [
      "Reset your password",
      "Change your email address",
      "Enable account protection",
      "Manage active sessions",
    ],
  },
  {
    id: "companies-teams",
    title: "Companies & Teams",
    icon: Building2,
    description: "Manage workspaces and collaborate with your team.",
    articles: [
      "How to create a company",
      "Company limits by subscription plan",
      "Invite employees",
      "Manage user roles",
      "Remove team members",
    ],
  },
  {
    id: "billing-subscriptions",
    title: "Billing & Subscriptions",
    icon: CreditCard,
    description: "Understand plans, billing cycles, and payments.",
    articles: [
      "Understanding plans",
      "Upgrade your plan",
      "Change your billing cycle",
      "Cancel your subscription",
      "Resolve payment issues",
    ],
  },
  {
    id: "invoicing",
    title: "Invoicing",
    icon: Receipt,
    description: "Create, send, and track invoices with ease.",
    articles: [
      "Create your first invoice",
      "Add customers",
      "Invoice status explained",
      "Download invoices",
      "Track payments",
    ],
  },
  {
    id: "expenses",
    title: "Expenses",
    icon: Wallet,
    description: "Record and organize business spending.",
    articles: [
      "Record expenses",
      "Categorize expenses",
      "Upload receipts",
      "Generate expense reports",
    ],
  },
  {
    id: "inventory",
    title: "Inventory Management",
    icon: Boxes,
    description: "Track products, stock, and warehouses.",
    articles: [
      "Add products",
      "Manage stock levels",
      "Create warehouses",
      "Record stock adjustments",
      "Set up low-stock alerts",
    ],
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    icon: BarChart3,
    description: "Understand your business through your numbers.",
    articles: [
      "Generate financial reports",
      "Understand dashboard metrics",
      "Export reports",
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: Wrench,
    description: "Fix common issues quickly.",
    articles: [
      "Login problems",
      "Data not loading",
      "Browser compatibility issues",
      "Account errors",
    ],
  },
];

const onboardingSteps = [
  { title: "Create your account", description: "Sign up with your email in under a minute." },
  { title: "Create your company workspace", description: "Set up the business you want to manage." },
  { title: "Add customers", description: "Build your customer list for invoicing and sales." },
  { title: "Add products or services", description: "Define what you sell so it's ready for invoices." },
  { title: "Create your first invoice", description: "Bill a customer and track its payment status." },
  { title: "Record expenses", description: "Log business spending as it happens." },
  { title: "Invite your team", description: "Bring in teammates with the right roles and permissions." },
  { title: "View your reports", description: "See income, expenses, and business health at a glance." },
];

const documentationSections = [
  { title: "Account Setup", icon: UserCog },
  { title: "Dashboard", icon: LayoutDashboard },
  { title: "Companies", icon: Building2 },
  { title: "Users & Permissions", icon: Users },
  { title: "Customers", icon: Users },
  { title: "Suppliers", icon: Building2 },
  { title: "Products", icon: Boxes },
  { title: "Inventory", icon: Boxes },
  { title: "Invoices", icon: Receipt },
  { title: "Expenses", icon: Wallet },
  { title: "Reports", icon: BarChart3 },
  { title: "Settings", icon: Settings },
  { title: "Billing", icon: CreditCard },
];

const faqs = [
  {
    question: "What is FinFlowTrack?",
    answer:
      "FinFlowTrack is an accounting and business management platform that helps businesses manage invoices, expenses, inventory, financial records, and team collaboration in one place.",
  },
  {
    question: "Is FinFlowTrack free?",
    answer:
      "FinFlowTrack offers a free plan to get started, along with paid plans that unlock additional features, higher limits, and more company workspaces.",
  },
  {
    question: "Can I manage multiple businesses?",
    answer:
      "Yes. You can create multiple company workspaces depending on your subscription plan, and each company's records stay separate from the others.",
  },
  {
    question: "Can I invite employees?",
    answer:
      "Yes. You can invite team members to your company workspace and assign them roles that control what they can see and do, subject to your subscription's team limits.",
  },
  {
    question: "Is FinFlowTrack an accounting replacement?",
    answer:
      "FinFlowTrack helps you manage day-to-day financial records, but it doesn't replace a qualified accountant or tax advisor. We recommend professional advice for tax and compliance matters.",
  },
  {
    question: "Is my financial data secure?",
    answer:
      "We apply account protections like secure authentication and role-based access controls. You can read more on our Security page and Privacy Policy.",
  },
];

function HelpCenterPage() {
  const [query, setQuery] = useState("");

  const filteredCategories = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return helpCategories;

    return helpCategories
      .map((category) => {
        const categoryMatches = category.title.toLowerCase().includes(trimmed);
        const matchingArticles = category.articles.filter((article) =>
          article.toLowerCase().includes(trimmed)
        );
        if (categoryMatches) return category;
        if (matchingArticles.length > 0) {
          return { ...category, articles: matchingArticles };
        }
        return null;
      })
      .filter((category): category is HelpCategory => category !== null);
  }, [query]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <header className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
              <LifeBuoy className="h-4 w-4 text-emerald-600" />
              Help Center
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Welcome to the FinFlowTrack Help Center
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Find answers, learn how to use accounting features, manage your
              business, and get the most from FinFlowTrack.
            </p>

            <div className="mt-10">
              <label htmlFor="help-search" className="sr-only">
                Search articles, guides, and troubleshooting
              </label>
              <div className="relative mx-auto max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="help-search"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search articles, guides, and troubleshooting..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Popular:
              </span>
              {popularSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  {term}
                </button>
              ))}
            </div>
          </header>
        </div>
      </section>

      {/* Help Categories */}
      <section aria-labelledby="categories-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="categories-heading" className="text-3xl font-bold tracking-tight text-slate-900">
            Browse by Category
          </h2>
          <p className="mt-4 text-slate-600">
            Explore guides organized around how you actually use
            FinFlowTrack.
          </p>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
            <p className="text-sm text-slate-600">
              No articles match "{query}" yet. Try a different search term or{" "}
              <a
                href="mailto:support@finflowtrack.com"
                className="font-medium text-emerald-700 hover:text-emerald-800"
              >
                contact support
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map((category) => (
              <article
                key={category.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <category.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {category.title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">
                  {category.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {category.articles.map((article) => (
                    <li key={article}>
                      <a
                        href="#"
                        className="flex items-start gap-2 text-sm text-slate-600 hover:text-emerald-700"
                      >
                        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {article}
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Getting Started Guide */}
      <section aria-labelledby="onboarding-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Beginner Guide
            </span>
            <h2 id="onboarding-heading" className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
              Start Using FinFlowTrack in 10 Minutes
            </h2>
            <p className="mt-4 text-slate-600">
              Follow these steps to get your business up and running from
              day one.
            </p>
          </div>
          <ol className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {onboardingSteps.map((step, index) => (
              <li
                key={step.title}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <div>
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

      {/* Product Documentation */}
      <section aria-labelledby="docs-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="docs-heading" className="text-3xl font-bold tracking-tight text-slate-900">
            Product Documentation
          </h2>
          <p className="mt-4 text-slate-600">
            Deeper reference material for every part of FinFlowTrack.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {documentationSections.map((doc) => (
            <a
              key={doc.title}
              href="#"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <doc.icon className="h-4 w-4 shrink-0 text-emerald-600" />
              {doc.title}
            </a>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-20">
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
        </div>
      </section>

      {/* Trust Section */}
      <section aria-labelledby="trust-heading" className="mx-auto max-w-6xl px-6 py-20">
        <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <h2 id="trust-heading" className="text-xl font-bold tracking-tight text-slate-900">
            About FinFlowTrack
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            FinFlowTrack is built to help freelancers, startups, and growing
            businesses manage financial operations with simple, accessible
            accounting tools.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/about"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              About
            </Link>
            <Link
              to="/security"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Security
            </Link>
            <Link
              to="/privacy"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Terms
            </Link>
          </div>
        </article>
      </section>

      {/* Contact Support */}
      <section aria-labelledby="contact-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <article className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
              <Mail className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 id="contact-heading" className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
              Still Need Help?
            </h2>
            <p className="mt-3 text-slate-600">
              Can't find what you're looking for? Our support team is ready
              to help.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="mailto:support@finflowtrack.com"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Mail className="h-4 w-4" />
                Contact Support
              </a>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                More Contact Options
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="final-cta-heading" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl bg-slate-900 px-8 py-16 text-center sm:px-16">
          <h2 id="final-cta-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            We're Here Whenever You Need Us
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            From your first invoice to your hundredth report, FinFlowTrack's
            support team and documentation are built to keep your business
            moving.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="mailto:support@finflowtrack.com"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              Email Support
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
