import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bug,
  Building2,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileText,
  Lightbulb,
  Mail,
  MessagesSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/changelog")({
  component: ChangelogPage,
  head: () => ({
    meta: [
      {
        title: "FinFlowTrack Changelog | Product Updates & New Features",
      },
      {
        name: "description",
        content:
          "Stay updated with FinFlowTrack product releases, new accounting features, improvements, security updates, and platform enhancements.",
      },
      {
        property: "og:title",
        content: "FinFlowTrack Changelog | Product Updates & New Features",
      },
      {
        property: "og:description",
        content:
          "Stay updated with FinFlowTrack product releases, new accounting features, improvements, security updates, and platform enhancements.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: "https://www.finflowtrack.com/changelog",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://www.finflowtrack.com/changelog",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "FinFlowTrack Changelog",
          description:
            "Product releases, improvements, fixes, and updates for the FinFlowTrack accounting platform.",
          url: "https://www.finflowtrack.com/changelog",
        }),
      },
    ],
  }),
});

const LATEST_UPDATE = "July 2026";
const CURRENT_VERSION = "v1.0.0";
const LAST_UPDATED = "July 12, 2026";

type UpdateCategory = "feature" | "improvement" | "bugfix" | "security" | "documentation";

const categoryMeta: Record<
  UpdateCategory,
  { label: string; icon: typeof Rocket; badgeClass: string }
> = {
  feature: {
    label: "New Features",
    icon: Rocket,
    badgeClass: "bg-emerald-50 text-emerald-700",
  },
  improvement: {
    label: "Improvements",
    icon: Sparkles,
    badgeClass: "bg-sky-50 text-sky-700",
  },
  bugfix: {
    label: "Bug Fixes",
    icon: Bug,
    badgeClass: "bg-amber-50 text-amber-700",
  },
  security: {
    label: "Security Updates",
    icon: ShieldCheck,
    badgeClass: "bg-rose-50 text-rose-700",
  },
  documentation: {
    label: "Documentation Updates",
    icon: BookOpen,
    badgeClass: "bg-slate-100 text-slate-700",
  },
};

const filterOptions: { id: "all" | UpdateCategory; label: string }[] = [
  { id: "all", label: "All Updates" },
  { id: "feature", label: "Features" },
  { id: "improvement", label: "Improvements" },
  { id: "bugfix", label: "Bug Fixes" },
  { id: "security", label: "Security" },
];

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  summary: string;
  items: Partial<Record<UpdateCategory, string[]>>;
}

const releases: ChangelogEntry[] = [
  {
    version: "v1.0.0",
    date: "July 2026",
    title: "Public Launch",
    summary:
      "The first public release of FinFlowTrack, bringing the core foundation of modern small business accounting to freelancers, startups, and growing teams.",
    items: {
      feature: [
        "Complete accounting dashboard",
        "Company workspace management",
        "User authentication",
        "Team invitations",
        "Subscription architecture",
        "Invoice management",
        "Expense tracking",
        "Inventory foundation",
      ],
      improvement: [
        "Responsive dashboard across devices",
        "Improved navigation structure",
        "Streamlined user onboarding",
      ],
      documentation: [
        "Added Help Center",
        "Added Guides",
        "Added Terms of Service",
        "Added Privacy Policy documentation",
      ],
    },
  },
  {
    version: "v1.0.1",
    date: "July 2026",
    title: "Stability & Experience Update",
    summary:
      "A follow-up release focused on making the core launch experience smoother and more reliable.",
    items: {
      improvement: [
        "Improved company creation flow",
        "Better subscription handling",
        "Improved error messages",
        "Better database reliability",
      ],
      bugfix: [
        "Resolved intermittent authentication issues",
        "Fixed permission handling edge cases",
        "Addressed minor user experience issues reported after launch",
      ],
    },
  },
  {
    version: "v1.1.0",
    date: "Planned",
    title: "Business Growth Update",
    summary:
      "Our next planned release, focused on giving growing businesses deeper financial visibility and smoother collaboration.",
    items: {
      feature: [
        "Advanced financial reports",
        "Export tools",
        "Automation improvements",
        "Better collaboration tools",
      ],
    },
  },
];

const roadmapItems = [
  { title: "Advanced Reports", icon: ClipboardList },
  { title: "Bank Reconciliation", icon: Building2 },
  { title: "AI Bookkeeping Assistance", icon: Sparkles },
  { title: "Mobile Application", icon: Bell },
  { title: "Payment Integrations", icon: Tag },
  { title: "Advanced Analytics", icon: Lightbulb },
];

const versionHistory = [
  { version: "v1.0.0", title: "Public Launch" },
  { version: "v1.0.1", title: "Stability & Experience Update" },
  { version: "v1.1.0", title: "Business Growth Update (Planned)" },
];

const faqs = [
  {
    question: "What is a changelog?",
    answer:
      "A changelog records product releases, improvements, fixes, and updates made to FinFlowTrack over time, so you always know what's changed and why.",
  },
  {
    question: "How often does FinFlowTrack release updates?",
    answer:
      "We release improvements and fixes on an ongoing basis, with larger feature updates grouped into versioned releases like the ones on this page.",
  },
  {
    question: "Can users request new features?",
    answer:
      "Yes. FinFlowTrack's roadmap is shaped by feedback from business owners, freelancers, accountants, and teams who use the platform every day.",
  },
  {
    question: "Where can users report bugs?",
    answer:
      "Email our support team at support@finflowtrack.com with details of what happened. Reported issues help us prioritize fixes in upcoming releases.",
  },
];

function ChangelogPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | UpdateCategory>("all");

  const visibleReleases = useMemo(() => {
    if (activeFilter === "all") return releases;

    return releases
      .map((release) => {
        const matching = release.items[activeFilter];
        if (!matching || matching.length === 0) return null;
        return { ...release, items: { [activeFilter]: matching } as ChangelogEntry["items"] };
      })
      .filter((release): release is ChangelogEntry => release !== null);
  }, [activeFilter]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
              Product Updates
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              FinFlowTrack Changelog
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Follow product updates, new features, improvements, bug fixes,
              and platform enhancements as FinFlowTrack continues to evolve.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-slate-500 sm:flex-row sm:gap-6">
              <span>
                Latest update: <span className="font-medium text-slate-700">{LATEST_UPDATE}</span>
              </span>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                <Tag className="h-3.5 w-3.5" />
                {CURRENT_VERSION}
              </span>
            </div>

            <div className="mt-8">
              <a
                href="mailto:support@finflowtrack.com?subject=Notify%20me%20about%20FinFlowTrack%20updates"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                <Bell className="h-4 w-4" />
                Get Notified About Updates
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Release */}
      <section aria-labelledby="featured-heading" className="mx-auto max-w-6xl px-6 py-20">
        <h2 id="featured-heading" className="sr-only">
          Featured release
        </h2>
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 p-8 shadow-sm sm:p-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            <Rocket className="h-3.5 w-3.5" />
            Featured Release · {CURRENT_VERSION}
          </span>
          <h3 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Introducing FinFlowTrack 1.0
          </h3>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Our first public release introduces the foundation of modern
            small business accounting — built to help freelancers, startups,
            and growing teams manage their finances in one connected
            platform.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[
              "Account authentication",
              "Company workspace management",
              "Multiple company support",
              "Team collaboration",
              "Subscription system",
              "Customers",
              "Suppliers",
              "Products",
              "Invoices",
              "Expenses",
              "Inventory foundation",
              "Reports",
            ].map((capability) => (
              <div
                key={capability}
                className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-slate-200"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                {capability}
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Filters + Timeline */}
      <section aria-labelledby="timeline-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="text-center">
            <h2 id="timeline-heading" className="text-3xl font-bold tracking-tight text-slate-900">
              Release Timeline
            </h2>
            <p className="mt-4 text-slate-600">
              A chronological record of what's shipped and what's coming
              next.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setActiveFilter(option.id)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  activeFilter === option.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="relative mt-14 space-y-10 border-l border-slate-200 pl-8">
            {visibleReleases.length === 0 ? (
              <p className="text-sm text-slate-600">
                No releases match this filter yet.
              </p>
            ) : (
              visibleReleases.map((release) => (
                <article key={release.version} className="relative">
                  <span className="absolute -left-[calc(2rem+1px)] flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white">
                    <Tag className="h-3.5 w-3.5" />
                  </span>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        {release.version}
                      </span>
                      <span className="text-sm text-slate-500">{release.date}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-slate-900">
                      {release.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {release.summary}
                    </p>

                    <div className="mt-6 space-y-5">
                      {(Object.keys(release.items) as UpdateCategory[]).map((category) => {
                        const meta = categoryMeta[category];
                        const entries = release.items[category] ?? [];
                        return (
                          <div key={category}>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}
                            >
                              <meta.icon className="h-3.5 w-3.5" />
                              {meta.label}
                            </span>
                            <ul className="mt-3 space-y-1.5">
                              {entries.map((entry) => (
                                <li
                                  key={entry}
                                  className="flex items-start gap-2 text-sm text-slate-600"
                                >
                                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                                  {entry}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Roadmap Preview */}
      <section aria-labelledby="roadmap-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
            <Compass className="h-4 w-4 text-emerald-600" />
            Coming Soon
          </span>
          <h2 id="roadmap-heading" className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
            Where We're Headed
          </h2>
          <p className="mt-4 text-slate-600">
            These are directions we're exploring for future releases. They
            represent our current thinking, not a guaranteed release date or
            commitment.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roadmapItems.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white">
                <item.icon className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-slate-700">
                {item.title}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Customer Feedback */}
      <section aria-labelledby="feedback-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <MessagesSquare className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 id="feedback-heading" className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
            Built With Our Users
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            FinFlowTrack improves based on real feedback from business
            owners, freelancers, accountants, and teams who use the platform
            day to day. If there's something that would make your workflow
            easier, we want to hear about it.
          </p>
          <div className="mt-8">
            <a
              href="mailto:support@finflowtrack.com?subject=Feature%20Request"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Lightbulb className="h-4 w-4" />
              Request a Feature
            </a>
          </div>
        </div>
      </section>

      {/* Version History + Team Transparency */}
      <section aria-labelledby="history-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 id="history-heading" className="text-lg font-bold text-slate-900">
              Version History
            </h2>
            <ul className="mt-5 space-y-4">
              {versionHistory.map((entry) => (
                <li key={entry.version} className="flex items-center gap-4">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {entry.version}
                  </span>
                  <span className="text-sm text-slate-600">{entry.title}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              Transparency
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Published by</dt>
                <dd className="font-medium text-slate-800">FinFlowTrack Product Team</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Last updated</dt>
                <dd className="font-medium text-slate-800">{LAST_UPDATED}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-slate-600">
              For more on how we build and protect FinFlowTrack, see our{" "}
              <Link to="/security" className="font-medium text-emerald-700 hover:text-emerald-800">
                Security
              </Link>{" "}
              page and{" "}
              <Link to="/terms" className="font-medium text-emerald-700 hover:text-emerald-800">
                Terms of Service
              </Link>
              .
            </p>
          </article>
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

      {/* Final CTA */}
      <section aria-labelledby="final-cta-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-3xl bg-slate-900 px-8 py-16 text-center sm:px-16">
          <h2 id="final-cta-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Stay Updated With FinFlowTrack
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            New features, improvements, and fixes ship regularly. Start
            using FinFlowTrack today, or reach out if there's something
            you'd like to see next.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:support@finflowtrack.com"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </a>
            <a
              href="mailto:support@finflowtrack.com?subject=Feature%20Request"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <FileText className="h-4 w-4" />
              Request Feature
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
