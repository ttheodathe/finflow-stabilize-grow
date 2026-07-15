import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Building2,
  CalendarClock,
  Database,
  FileText,
  Gavel,
  Handshake,
  KeyRound,
  Layers,
  Lock,
  Mail,
  Puzzle,
  RefreshCw,
  Scale,
  ScrollText,
  Server,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wrench,
} from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      {
        title: "Terms of Service | FinFlowTrack Accounting Software",
      },
      {
        name: "description",
        content:
          "Read FinFlowTrack's Terms of Service covering account usage, subscriptions, financial data ownership, security responsibilities, and acceptable use policies.",
      },
      {
        property: "og:title",
        content: "Terms of Service | FinFlowTrack Accounting Software",
      },
      {
        property: "og:description",
        content:
          "Read FinFlowTrack's Terms of Service covering account usage, subscriptions, financial data ownership, security responsibilities, and acceptable use policies.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: "https://www.finflowtrack.com/terms",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://www.finflowtrack.com/terms",
      },
    ],
  }),
});

// Update these two values whenever the terms are revised.
const EFFECTIVE_DATE = "July 12, 2026";
const LAST_UPDATED = "July 12, 2026";

interface TermsSection {
  id: string;
  number: string;
  title: string;
  icon: typeof FileText;
  content: ReactNode;
}

const sections: TermsSection[] = [
  {
    id: "introduction",
    number: "01",
    title: "Introduction",
    icon: Sparkles,
    content: (
      <>
        <p>
          FinFlowTrack is a cloud-based accounting and business management
          platform that helps business owners, freelancers, startups, and
          accounting teams track income and expenses, manage invoices and
          customers, run financial reports, and collaborate across one or
          more company workspaces.
        </p>
        <p>
          These Terms of Service ("Terms") explain the rules for using
          FinFlowTrack, the responsibilities you take on as a user, and the
          protections that apply to both you and FinFlowTrack. They form a
          binding agreement between you (or the business you represent) and
          FinFlowTrack.
        </p>
      </>
    ),
  },
  {
    id: "acceptance",
    number: "02",
    title: "Acceptance of Terms",
    icon: Handshake,
    content: (
      <>
        <p>
          By creating a FinFlowTrack account, accessing the platform, or
          otherwise using our services, you confirm that you have read,
          understood, and agree to be bound by these Terms and our{" "}
          <Link to="/privacy" className="font-medium text-emerald-700 hover:text-emerald-800">
            Privacy Policy
          </Link>
          . If you are creating an account on behalf of a company or other
          organization, you confirm that you have the authority to accept
          these Terms on that organization's behalf.
        </p>
        <p>
          If you do not agree to these Terms, you should not create an
          account or use FinFlowTrack.
        </p>
      </>
    ),
  },
  {
    id: "services",
    number: "03",
    title: "Description of Services",
    icon: Layers,
    content: (
      <>
        <p>
          FinFlowTrack provides tools designed to support day-to-day
          accounting and business operations, including:
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="text-sm font-semibold text-slate-900">Accounting</h4>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li>Income tracking</li>
              <li>Expense management</li>
              <li>Financial reports</li>
              <li>Business records</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="text-sm font-semibold text-slate-900">Business management</h4>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li>Invoices</li>
              <li>Customers</li>
              <li>Suppliers</li>
              <li>Products and inventory</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="text-sm font-semibold text-slate-900">Collaboration</h4>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li>Multiple companies and workspaces</li>
              <li>Team members</li>
              <li>Role-based permissions</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="text-sm font-semibold text-slate-900">Subscriptions</h4>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li>Free and paid plans</li>
              <li>Feature availability by plan</li>
            </ul>
          </div>
        </div>
        <p className="mt-4">
          We may add, change, or remove features over time as we continue to
          improve the platform.
        </p>
      </>
    ),
  },
  {
    id: "account-responsibilities",
    number: "04",
    title: "Account Responsibilities",
    icon: UserCheck,
    content: (
      <>
        <p>You agree to:</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Provide accurate, current, and complete information when creating and maintaining your account.
          </li>
          <li className="flex items-start gap-2.5">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Keep your password confidential and use a strong, unique password.
          </li>
          <li className="flex items-start gap-2.5">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Take reasonable steps to protect your account and any devices used to access it.
          </li>
          <li className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Notify us promptly at{" "}
            <a href="mailto:support@finflowtrack.com" className="font-medium text-emerald-700 hover:text-emerald-800">
              support@finflowtrack.com
            </a>{" "}
            if you suspect unauthorized access to your account.
          </li>
        </ul>
        <p className="mt-4">
          You are responsible for all activity that occurs under your
          account, including activity by team members you invite.
        </p>
      </>
    ),
  },
  {
    id: "company-workspaces",
    number: "05",
    title: "Company Workspace & Team Management",
    icon: Building2,
    content: (
      <>
        <p>
          FinFlowTrack allows you to create and manage one or more company
          workspaces, each containing its own business and financial
          records, separate from other companies.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2.5">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            The number of company workspaces you can create depends on your subscription plan.
          </li>
          <li className="flex items-start gap-2.5">
            <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Company owners control who is invited to a workspace and what role each team member is assigned.
          </li>
          <li className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            You are responsible for making sure only authorized people have access to your company workspaces.
          </li>
          <li className="flex items-start gap-2.5">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Each company workspace's records are isolated from other companies, including other companies you may separately manage.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "billing",
    number: "06",
    title: "Subscription and Billing Terms",
    icon: CalendarClock,
    content: (
      <>
        <p>
          FinFlowTrack offers both free and paid subscription plans. Paid
          plans unlock additional features, limits, or company workspaces as
          described on our pricing page at the time of purchase.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2.5">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Paid subscriptions are billed on a recurring cycle (such as monthly or annually) as selected at checkout.
          </li>
          <li className="flex items-start gap-2.5">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Subscriptions renew automatically at the end of each billing cycle unless cancelled before the renewal date.
          </li>
          <li className="flex items-start gap-2.5">
            <Handshake className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            You are responsible for all charges associated with your subscription and for keeping your payment details up to date.
          </li>
          <li className="flex items-start gap-2.5">
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            You may cancel your subscription at any time; cancellation takes effect at the end of the current billing cycle.
          </li>
          <li className="flex items-start gap-2.5">
            <Layers className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Downgrading your plan may reduce available features, limits, or company workspaces, and some data may become read-only or inaccessible until you upgrade again.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "acceptable-use",
    number: "07",
    title: "Acceptable Use Policy",
    icon: Ban,
    content: (
      <>
        <p>When using FinFlowTrack, you agree not to:</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2.5">
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            Abuse, overload, or interfere with the normal operation of the platform.
          </li>
          <li className="flex items-start gap-2.5">
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            Attempt to gain unauthorized access to any account, workspace, or system.
          </li>
          <li className="flex items-start gap-2.5">
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            Reverse engineer, decompile, or attempt to extract the source code of the software.
          </li>
          <li className="flex items-start gap-2.5">
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            Upload harmful, malicious, or unlawful content of any kind.
          </li>
          <li className="flex items-start gap-2.5">
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            Use FinFlowTrack in a way that violates any applicable law or regulation.
          </li>
        </ul>
        <p className="mt-4">
          We may investigate suspected violations and take appropriate
          action, including suspending or terminating accounts involved.
        </p>
      </>
    ),
  },
  {
    id: "financial-disclaimer",
    number: "08",
    title: "Financial Disclaimer",
    icon: Scale,
    content: (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-3 text-sm text-amber-900">
            <p>
              FinFlowTrack provides accounting and business management tools
              only. It is not a substitute for advice from a qualified
              professional accountant, tax advisor, or legal advisor.
            </p>
            <p>
              We do not review, verify, or guarantee the accuracy of the
              information you enter, and we do not provide tax, legal, or
              financial advice through the platform.
            </p>
            <p>
              You remain solely responsible for the accuracy of your
              financial records, your compliance with applicable tax and
              regulatory obligations, and any financial decisions you make
              based on information from FinFlowTrack. We recommend consulting
              a qualified professional for advice specific to your business.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "data-ownership",
    number: "09",
    title: "Data Ownership",
    icon: Database,
    content: (
      <>
        <p>
          You own the business information, financial records, and customer
          data you enter into FinFlowTrack. We do not claim ownership over
          your business data.
        </p>
        <p className="mt-3">
          FinFlowTrack owns the software, platform technology, brand, and
          interface that make the service possible. Nothing in these Terms
          transfers ownership of our software or intellectual property to
          you.
        </p>
      </>
    ),
  },
  {
    id: "data-security",
    number: "10",
    title: "Data Security",
    icon: ShieldCheck,
    content: (
      <>
        <p>
          We apply reasonable security practices designed to protect your
          account and data, including secure authentication, role-based
          access controls, and encrypted communication between your browser
          and our platform.
        </p>
        <p className="mt-3">
          No method of transmission or storage is completely secure, and we
          cannot guarantee absolute security. We do not claim any specific
          security certifications unless explicitly stated elsewhere on our
          website. For more detail on how we protect your data, see our{" "}
          <Link to="/security" className="font-medium text-emerald-700 hover:text-emerald-800">
            Security page
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="font-medium text-emerald-700 hover:text-emerald-800">
            Privacy Policy
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "third-party-services",
    number: "11",
    title: "Third-Party Services",
    icon: Puzzle,
    content: (
      <>
        <p>
          FinFlowTrack relies on trusted third-party providers to operate,
          including services for hosting, authentication, payment
          processing, and analytics. These providers process limited data on
          our behalf as part of delivering the platform to you.
        </p>
        <p className="mt-3">
          Third-party providers maintain their own terms and privacy
          policies, which govern their handling of data outside of
          FinFlowTrack's direct control.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    number: "12",
    title: "Intellectual Property",
    icon: ScrollText,
    content: (
      <p>
        The FinFlowTrack name, logo, brand, software, source code, user
        interface, and documentation are the property of FinFlowTrack and
        are protected by applicable intellectual property laws. You may not
        copy, modify, distribute, sell, or lease any part of our software or
        brand without our prior written permission.
      </p>
    ),
  },
  {
    id: "service-availability",
    number: "13",
    title: "Service Availability",
    icon: Server,
    content: (
      <p>
        We work to keep FinFlowTrack available and reliable, but the
        platform may occasionally be unavailable due to scheduled
        maintenance, updates, feature improvements, or circumstances outside
        our control. We are not liable for reasonable, temporary
        interruptions to service.
      </p>
    ),
  },
  {
    id: "suspension-termination",
    number: "14",
    title: "Suspension and Termination",
    icon: Ban,
    content: (
      <>
        <p>
          We may suspend or terminate your access to FinFlowTrack, with or
          without notice, in cases including:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2.5">
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            Suspected fraud or abuse of the platform.
          </li>
          <li className="flex items-start gap-2.5">
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            Activity that poses a security risk to FinFlowTrack or other users.
          </li>
          <li className="flex items-start gap-2.5">
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            Violation of these Terms or our Acceptable Use Policy.
          </li>
          <li className="flex items-start gap-2.5">
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            Non-payment or unresolved billing issues on a paid subscription.
          </li>
        </ul>
        <p className="mt-4">
          You may stop using FinFlowTrack and close your account at any
          time.
        </p>
      </>
    ),
  },
  {
    id: "limitation-of-liability",
    number: "15",
    title: "Limitation of Liability",
    icon: AlertTriangle,
    content: (
      <p>
        To the fullest extent permitted by law, FinFlowTrack and its team
        are not liable for indirect, incidental, special, or consequential
        damages arising from your use of the platform, including loss of
        profits, data, or business opportunities. Our total liability for
        any claim relating to the service is limited to the amount you paid
        us in the twelve months preceding the claim. FinFlowTrack is
        provided on an "as is" and "as available" basis without warranties
        of any kind, whether express or implied.
      </p>
    ),
  },
  {
    id: "changes-to-terms",
    number: "16",
    title: "Changes to These Terms",
    icon: RefreshCw,
    content: (
      <p>
        We may update these Terms from time to time to reflect changes to
        our services or legal requirements. When we make material changes,
        we will update the "Last updated" date above and, where appropriate,
        notify you by email or through the platform. Continuing to use
        FinFlowTrack after changes take effect means you accept the revised
        Terms.
      </p>
    ),
  },
  {
    id: "governing-law",
    number: "17",
    title: "Governing Law",
    icon: Gavel,
    content: (
      <p>
        These Terms are governed by the laws of{" "}
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
          [Governing Jurisdiction — to be finalized upon legal entity registration]
        </span>
        , without regard to conflict of law principles. Any disputes arising
        from these Terms or your use of FinFlowTrack will be resolved in the
        courts of that jurisdiction, unless otherwise required by applicable
        law.
      </p>
    ),
  },
];

const faqs = [
  {
    question: "Do these Terms apply to free accounts too?",
    answer:
      "Yes. These Terms apply to every FinFlowTrack account, whether you're on a free plan or a paid subscription.",
  },
  {
    question: "Can I use FinFlowTrack for more than one business?",
    answer:
      "Yes. You can create multiple company workspaces, subject to the limits of your subscription plan. Each workspace keeps its records separate from the others.",
  },
  {
    question: "Does FinFlowTrack replace my accountant?",
    answer:
      "No. FinFlowTrack provides accounting tools to help you manage your records, but it does not replace a qualified accountant, tax advisor, or legal advisor.",
  },
  {
    question: "What happens to my data if I cancel my subscription?",
    answer:
      "Your business data remains yours. Depending on your plan, some features may become limited or read-only after cancellation. Contact support@finflowtrack.com if you have questions about your specific account.",
  },
];

function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <header className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
              <FileText className="h-4 w-4 text-emerald-600" />
              Legal
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Clear rules and guidelines for using FinFlowTrack accounting
              software.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-2 text-sm text-slate-500 sm:flex-row sm:gap-6">
              <span>
                Effective date: <span className="font-medium text-slate-700">{EFFECTIVE_DATE}</span>
              </span>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span>
                Last updated: <span className="font-medium text-slate-700">{LAST_UPDATED}</span>
              </span>
            </div>
          </header>
        </div>
      </section>

      {/* Table of contents */}
      <section aria-labelledby="toc-heading" className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h2 id="toc-heading" className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            On this page
          </h2>
          <nav aria-label="Table of contents" className="mt-4">
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex items-center gap-2 text-slate-600 hover:text-emerald-700"
                  >
                    <span className="text-xs font-semibold text-slate-400">{section.number}</span>
                    {section.title}
                  </a>
                </li>
              ))}
              <li>
                <a href="#contact" className="flex items-center gap-2 text-slate-600 hover:text-emerald-700">
                  <span className="text-xs font-semibold text-slate-400">18</span>
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </section>

      {/* Sections */}
      <section aria-labelledby="terms-heading" className="mx-auto max-w-4xl px-6 py-20">
        <h2 id="terms-heading" className="sr-only">
          Terms of Service sections
        </h2>
        <div className="space-y-10">
          {sections.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <section.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400">
                    Section {section.number}
                  </span>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">
                    {section.title}
                  </h3>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                {section.content}
              </div>
            </article>
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

      {/* Contact Section */}
      <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-24 mx-auto max-w-4xl px-6 py-20">
        <article className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
            <Mail className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 id="contact-heading" className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
            Questions About These Terms?
          </h2>
          <p className="mt-3 text-slate-600">
            If anything in these Terms of Service is unclear, our team is
            happy to help explain it.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="mailto:support@finflowtrack.com"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Mail className="h-4 w-4" />
              support@finflowtrack.com
            </a>
            <Link
              to="/privacy"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
            >
              Read Privacy Policy
            </Link>
          </div>
        </article>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="final-cta-heading" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl bg-slate-900 px-8 py-16 text-center sm:px-16">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <Wrench className="h-6 w-6 text-white" />
          </div>
          <h2 id="final-cta-heading" className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built to Support Your Business
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            These Terms exist to keep FinFlowTrack fair, secure, and reliable
            for every business that depends on it. If you have questions,
            we're just an email away.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="mailto:support@finflowtrack.com"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              Contact Us
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/privacy"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
