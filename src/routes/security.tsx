import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Database,
  Eye,
  Lock,
  Mail,
  Server,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/security")({
  component: SecurityPage,
  head: () => ({
    meta: [
      {
        title: "Security | How FinFlowTrack Protects Your Financial Data",
      },
      {
        name: "description",
        content:
          "Learn how FinFlowTrack protects business and financial information using secure authentication, role-based permissions, encrypted communications, managed cloud infrastructure, and continuous security improvements.",
      },
    ],
  }),
});

const trustCards = [
  {
    icon: Lock,
    title: "Secure Architecture",
    description:
      "Every layer of FinFlowTrack, from authentication to data storage, is built around industry-standard security practices designed to keep business information safe.",
  },
  {
    icon: UserCheck,
    title: "Protected Accounts",
    description:
      "Secure sign-in, session management, and role-based permissions ensure that only the right people can access the right financial data.",
  },
  {
    icon: Server,
    title: "Reliable Infrastructure",
    description:
      "FinFlowTrack runs on managed cloud infrastructure with automated backups, monitoring, and recovery planning to keep your business running.",
  },
  {
    icon: BadgeCheck,
    title: "Continuous Improvement",
    description:
      "Our security posture evolves constantly through code review, dependency management, testing, and ongoing operational review.",
  },
];

const authenticationPrinciples = [
  "Secure authentication with hashed and salted credentials",
  "Role-based permissions applied to every user in every company",
  "Strict company isolation between customer accounts",
  "Automatic session expiration and secure session management",
];

const platformPrinciples = [
  "HTTPS encryption enforced across the entire application",
  "Secure, managed cloud infrastructure with hardened configurations",
  "Automated, regularly tested database backups",
  "Continuous monitoring of application health and activity",
];

const dataProtectionCards = [
  {
    icon: Lock,
    title: "Encryption in Transit",
    description:
      "All data moving between your browser and FinFlowTrack is encrypted using HTTPS, protecting financial information as it travels across the network.",
  },
  {
    icon: Database,
    title: "Secure Data Storage",
    description:
      "Business and financial records are stored in managed, access-controlled databases that are isolated by company and protected by strict permission checks.",
  },
  {
    icon: ShieldCheck,
    title: "Continuous Protection",
    description:
      "Security controls are reviewed and updated on an ongoing basis so that protections keep pace with new features and evolving best practices.",
  },
];

const roles = [
  {
    name: "Administrator",
    description: "Full access to platform configuration, users, and billing.",
  },
  {
    name: "Company Owner",
    description: "Complete control over a single company's data and team.",
  },
  {
    name: "Accountant",
    description: "Access to financial records, reports, and reconciliation tools.",
  },
  {
    name: "Finance Manager",
    description: "Oversight of budgets, cash flow, and financial reporting.",
  },
  {
    name: "Sales",
    description: "Access limited to customer, invoice, and revenue data.",
  },
  {
    name: "Inventory",
    description: "Access limited to stock, product, and warehouse records.",
  },
  {
    name: "Payroll",
    description: "Access limited to employee compensation and payroll data.",
  },
  {
    name: "Read Only",
    description: "View-only access for stakeholders who don't need to edit data.",
  },
];

const multiCompanyCards = [
  {
    icon: Building2,
    title: "Company Isolation",
    description:
      "Every company workspace is logically separated, so data from one business is never visible to another, even within the same account.",
  },
  {
    icon: UserCheck,
    title: "Permission Controls",
    description:
      "Owners decide exactly what each teammate can see and do, down to individual modules like payroll, sales, or inventory.",
  },
  {
    icon: BadgeCheck,
    title: "Subscription Limits",
    description:
      "Plan-based limits on users and companies help keep access predictable and aligned with how your organization actually operates.",
  },
  {
    icon: Lock,
    title: "Secure Collaboration",
    description:
      "Teams can work across multiple companies without compromising the isolation and access controls that protect each workspace.",
  },
];

const auditCards = [
  {
    icon: Eye,
    title: "Activity Visibility",
    description:
      "Key actions across your company are tracked, giving owners and administrators visibility into who is doing what and when.",
  },
  {
    icon: Database,
    title: "Change History",
    description:
      "Financial records maintain a history of changes, helping teams understand how figures evolved and supporting accountability across the business.",
  },
];

const continuityCards = [
  {
    icon: Server,
    title: "Managed Infrastructure",
    description:
      "FinFlowTrack runs on established cloud providers that offer high availability and industry-standard physical and network security.",
  },
  {
    icon: Database,
    title: "Database Backups",
    description:
      "Automated backups run on a regular schedule, helping protect against data loss from unexpected failures.",
  },
  {
    icon: ShieldCheck,
    title: "Recovery Planning",
    description:
      "Recovery procedures are documented and reviewed so that service can be restored quickly if an incident occurs.",
  },
  {
    icon: BadgeCheck,
    title: "Continuous Improvements",
    description:
      "Business continuity practices are revisited regularly as the platform and its customer base grow.",
  },
];

const monitoringCards = [
  {
    icon: Eye,
    title: "Application Monitoring",
    description:
      "Application performance and error rates are monitored continuously to catch issues before they affect customers.",
  },
  {
    icon: Server,
    title: "Infrastructure Monitoring",
    description:
      "Cloud infrastructure is monitored for availability, resource usage, and abnormal activity around the clock.",
  },
  {
    icon: UserCheck,
    title: "Operational Reviews",
    description:
      "The team regularly reviews access, configurations, and operational practices to reduce risk over time.",
  },
  {
    icon: BadgeCheck,
    title: "Continuous Improvements",
    description:
      "Monitoring tools and processes are refined as the platform evolves, keeping detection aligned with real usage patterns.",
  },
];

const sdlcChecklist = [
  "Code reviews required before changes reach production",
  "Ongoing dependency management and vulnerability tracking",
  "Regular review of authentication and session handling",
  "Database access restricted through least-privilege principles",
  "Permission logic validated across roles and companies",
  "Automated and manual testing before release",
  "Production monitoring for errors and anomalies",
  "Continuous improvements based on lessons learned",
];

const disclosureGuidelines = [
  "Report suspected vulnerabilities privately to our security team",
  "Give us reasonable time to investigate and respond before public disclosure",
  "Avoid accessing, modifying, or deleting data that isn't your own",
  "Avoid actions that could disrupt service for other customers",
  "Provide clear reproduction steps so we can confirm and resolve issues quickly",
];

const faqs = [
  {
    question: "Is FinFlowTrack cloud-based?",
    answer:
      "Yes. FinFlowTrack is a cloud-based platform that runs on managed infrastructure, so your team can access financial data securely from anywhere without maintaining any servers.",
  },
  {
    question: "How is access controlled?",
    answer:
      "Access is controlled through secure authentication and role-based permissions. Company owners and administrators decide which roles can view or edit specific data, and every user is scoped to the companies they belong to.",
  },
  {
    question: "Are backups performed?",
    answer:
      "Yes. Database backups run on a regular automated schedule as part of our broader business continuity and recovery planning.",
  },
  {
    question: "How do I report security concerns?",
    answer:
      "Email our security team directly at security@finflowtrack.com. We take every report seriously and will work with you to investigate and address the issue.",
  },
];

function SecurityPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <header className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Security Center
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Security Built Into Every Layer
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              FinFlowTrack helps businesses manage their financial operations
              with confidence. From secure authentication and role-based
              permissions to encrypted communications and managed cloud
              infrastructure, protecting your business and financial data is
              built into how we design, build, and operate the platform.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/privacy"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                Privacy Policy
              </Link>
              <a
                href="mailto:security@finflowtrack.com"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Contact Security Team
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </header>
        </div>
      </section>

      {/* Trust Cards */}
      <section aria-labelledby="trust-heading" className="mx-auto max-w-6xl px-6 py-20">
        <h2 id="trust-heading" className="sr-only">
          Why businesses trust FinFlowTrack
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trustCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <card.icon className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Security Principles */}
      <section aria-labelledby="principles-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="principles-heading" className="text-3xl font-bold tracking-tight text-slate-900">
              Security Principles
            </h2>
            <p className="mt-4 text-slate-600">
              A consistent set of principles guides how we authenticate
              users, protect data, and operate the platform every day.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Authentication &amp; Access
                </h3>
              </div>
              <ul className="mt-5 space-y-3">
                {authenticationPrinciples.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Platform Protection
                </h3>
              </div>
              <ul className="mt-5 space-y-3">
                {platformPrinciples.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* Data Protection */}
      <section aria-labelledby="data-protection-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="data-protection-heading" className="text-3xl font-bold tracking-tight text-slate-900">
            Data Protection
          </h2>
          <p className="mt-4 text-slate-600">
            Financial data deserves careful handling at every stage, from the
            moment it leaves your browser to how it's stored and maintained.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dataProtectionCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <card.icon className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Role-Based Access */}
      <section aria-labelledby="rbac-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 id="rbac-heading" className="text-3xl font-bold tracking-tight text-slate-900">
                Role-Based Access Control
              </h2>
              <p className="mt-4 text-slate-600">
                Not everyone on your team needs access to every part of your
                business. FinFlowTrack uses role-based access control so that
                each teammate only sees the data relevant to their work.
                Company owners define roles for every member of their
                organization, and permissions are enforced consistently
                across the entire platform.
              </p>
              <p className="mt-4 text-slate-600">
                This approach reduces the risk of accidental changes,
                keeps sensitive data like payroll and financial reports
                limited to the people who need it, and gives owners a clear
                picture of who can do what within their company.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {roles.map((role) => (
                <article
                  key={role.name}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="text-sm font-semibold text-slate-900">
                    {role.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    {role.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Company Security */}
      <section aria-labelledby="multi-company-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="multi-company-heading" className="text-3xl font-bold tracking-tight text-slate-900">
            Multi-Company Security
          </h2>
          <p className="mt-4 text-slate-600">
            Many businesses manage more than one company inside FinFlowTrack.
            Each workspace is protected independently, so growth never comes
            at the cost of security.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {multiCompanyCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <card.icon className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Audit Logging */}
      <section aria-labelledby="audit-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="audit-heading" className="text-3xl font-bold tracking-tight text-slate-900">
              Audit Logging
            </h2>
            <p className="mt-4 text-slate-600">
              Understanding what happened, and when, is essential for
              financial accountability. FinFlowTrack keeps a clear record of
              key activity across your company.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {auditCards.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <card.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Backup & Business Continuity */}
      <section aria-labelledby="continuity-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="continuity-heading" className="text-3xl font-bold tracking-tight text-slate-900">
            Backup &amp; Business Continuity
          </h2>
          <p className="mt-4 text-slate-600">
            Your financial data needs to be there when you need it. Our
            infrastructure and processes are designed to keep FinFlowTrack
            reliable and recoverable.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {continuityCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <card.icon className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Continuous Monitoring */}
      <section aria-labelledby="monitoring-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="monitoring-heading" className="text-3xl font-bold tracking-tight text-slate-900">
              Continuous Monitoring
            </h2>
            <p className="mt-4 text-slate-600">
              Security isn't a one-time effort. We continuously monitor the
              application and its infrastructure to catch issues early and
              keep improving.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {monitoringCards.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                  <card.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Secure Software Development */}
      <section aria-labelledby="sdlc-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 id="sdlc-heading" className="text-3xl font-bold tracking-tight text-slate-900">
              Secure Software Development
            </h2>
            <p className="mt-4 text-slate-600">
              Security starts long before code reaches production. Every
              change to FinFlowTrack goes through a development process
              designed to catch issues early and keep the platform reliable
              as it grows.
            </p>
            <p className="mt-4 text-slate-600">
              From code review to dependency management and testing, our
              engineering practices are built to protect the accuracy and
              confidentiality of the financial data our customers trust us
              with.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sdlcChecklist.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm"
              >
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Responsible Vulnerability Disclosure */}
      <section aria-labelledby="disclosure-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 id="disclosure-heading" className="text-3xl font-bold tracking-tight text-slate-900">
              Responsible Vulnerability Disclosure
            </h2>
            <p className="mt-4 text-slate-600">
              We welcome reports from security researchers and customers who
              believe they've found a vulnerability in FinFlowTrack. Acting
              in good faith and giving us the opportunity to investigate
              helps us protect every business on the platform.
            </p>
            <article className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Guidelines for Reporting
              </h3>
              <ul className="mt-5 space-y-3">
                {disclosureGuidelines.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="mx-auto max-w-4xl px-6 py-20">
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
      </section>

      {/* Contact Section */}
      <section aria-labelledby="contact-heading" className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <article className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
              <Mail className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 id="contact-heading" className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
              Contact the Security Team
            </h2>
            <p className="mt-3 text-slate-600">
              Have a security question or want to report a potential
              vulnerability? Reach out and our team will respond promptly.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="mailto:security@finflowtrack.com"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Mail className="h-4 w-4" />
                security@finflowtrack.com
              </a>
              <a
                href="mailto:support@finflowtrack.com"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                <Mail className="h-4 w-4" />
                support@finflowtrack.com
              </a>
            </div>
          </article>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="final-cta-heading" className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-3xl bg-slate-900 px-8 py-16 text-center sm:px-16">
          <h2 id="final-cta-heading" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Security Is a Continuous Commitment
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Protecting your business and financial data is never finished.
            We keep investing in the people, processes, and infrastructure
            that keep FinFlowTrack secure as your business grows.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/privacy"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              Privacy Policy
            </Link>
            <a
              href="mailto:support@finflowtrack.com"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Contact Us
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
