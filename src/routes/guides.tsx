import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  ReceiptText,
  Share2,
  Users,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/guides")({
  component: GuidesPage,
  head: () => ({
    meta: [
      { title: "FinFlow Track Guides | Set Up, Invoice and Track Payments" },
      {
        name: "description",
        content:
          "Learn the FinFlow Track basics with practical, screenshot-led steps for business setup, customers, invoices, payments and receivables.",
      },
      {
        property: "og:title",
        content: "FinFlow Track Guides | Your First Invoice",
      },
      {
        property: "og:description",
        content:
          "A practical, visual walkthrough of the core FinFlow Track workflows.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.finflowtrack.com/guides" },
    ],
    links: [
      { rel: "canonical", href: "https://www.finflowtrack.com/guides" },
    ],
  }),
});

type GuideStep = {
  number: string;
  title: string;
  summary: string;
  action: string;
  href: string;
  image?: string;
  imageAlt?: string;
  note?: string;
  icon: typeof BookOpen;
};

const steps: GuideStep[] = [
  {
    number: "01",
    title: "Understand your dashboard",
    summary:
      "Start with the financial overview. Review the summary cards, customer balances and outstanding invoices before deciding what needs attention.",
    action: "Open dashboard",
    href: "/dashboard",
    image: "/guides/dashboard-overview.webp",
    imageAlt:
      "Actual FinFlow Track desktop dashboard showing financial summary cards, revenue and expense chart, cash-flow chart and the left navigation.",
    icon: LayoutDashboard,
  },
  {
    number: "02",
    title: "Set up your business",
    summary:
      "Open Companies and choose the company workspace you want to use. Complete the business details shown in Company settings and save your changes. Use the correct business identity and base currency for this workspace.",
    action: "Open companies",
    href: "/companies",
    image: "/guides/business-setup.webp",
    imageAlt:
      "Actual FinFlow Track Company settings screen showing the business details and address form.",
    icon: Building2,
  },
  {
    number: "03",
    title: "Add the customer you will invoice",
    summary:
      "Open Customers and use the page's add-customer action. Enter the customer's details, check them carefully, and save. Select this customer when you prepare the invoice.",
    action: "Open customers",
    href: "/customers",
    image: "/guides/customer-list.webp",
    imageAlt:
      "Actual FinFlow Track Customers page showing the customer list and its add-customer action.",
    icon: Users,
  },
  {
    number: "04",
    title: "Create your first invoice",
    summary:
      "Open Invoices and choose New Invoice. Confirm the invoice number, select the customer, review issue and due dates, choose the currency, and add the products or services and their quantities and prices. Review subtotal, tax and total before selecting Save invoice.",
    action: "Create an invoice",
    href: "/invoices",
    image: "/guides/invoice-create-desktop.webp",
    imageAlt:
      "Actual FinFlow Track desktop New invoice form showing invoice number, customer, dates, status, currency, line items and total.",
    note:
      "The supplied mobile screenshot shows the same New invoice form in a narrow phone viewport. The screenshot displays an empty line-item area and a zero total; enter real invoice items before saving.",
    icon: ReceiptText,
  },
  {
    number: "05",
    title: "Share the saved invoice",
    summary:
      "Return to Invoices and locate the invoice you saved. Open that invoice and use the sharing option actually presented by the application. Check the recipient and invoice details before sending or copying a customer-facing link.",
    action: "Open invoices",
    href: "/invoices",
    image: "/guides/invoice-create-desktop.webp",
    imageAlt:
      "Actual FinFlow Track invoice list and New invoice screen. This is evidence of invoice creation, not a screenshot of the sharing dialog.",
    note:
      "The supplied screenshots do not show the invoice-sharing dialog or the final customer view. This step is a navigation guide, not a visually verified sharing demonstration.",
    icon: Share2,
  },
  {
    number: "06",
    title: "Record a customer payment",
    summary:
      "Open Payments received and choose Record payment. Select the invoice, enter the payment date and amount, choose the payment method and deposit account, and add a reference or note when needed. Review the details before saving.",
    action: "Open payments received",
    href: "/sales/payments",
    image: "/guides/payment-record-form.webp",
    imageAlt:
      "Actual FinFlow Track Record payment dialog showing invoice selection, date, amount, method, deposit account, reference and notes.",
    note:
      "The payment form screenshot is genuine application evidence supplied by the product owner. Use the amount actually received and verify the invoice balance after saving.",
    icon: CircleDollarSign,
  },
  {
    number: "07",
    title: "Review outstanding receivables",
    summary:
      "Return to the dashboard to review customer balances, the largest outstanding invoice and payment status. Use the available reports to review financial activity and investigate balances that need follow-up.",
    action: "Open dashboard",
    href: "/dashboard",
    image: "/guides/receivables-dashboard.webp",
    imageAlt:
      "Actual FinFlow Track dashboard showing balance by customer, largest outstanding invoices, payment status and a reminder draft.",
    note:
      "Amounts and customer details in supplied screenshots are demonstration data. Do not treat them as a real business's financial records.",
    icon: Wallet,
  },
];

function GuideScreenshot({
  src,
  alt,
  mobile = false,
}: {
  src: string;
  alt: string;
  mobile?: boolean;
}) {
  return (
    <figure className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={
          mobile
            ? "mx-auto block max-h-[34rem] w-auto max-w-full object-contain"
            : "block h-auto w-full object-contain"
        }
      />
      <figcaption className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
        Genuine FinFlow Track application screenshot supplied for this guide.
      </figcaption>
    </figure>
  );
}

function GuidesPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main>
        <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-sm font-medium text-emerald-800">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                FinFlow Track learning centre
              </span>
              <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                Your first invoice, step by step
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Learn the essential workflow for an owner-led service business:
                set up your company, add a customer, create an invoice, record
                the payment and understand what is still outstanding.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  Create your account <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#first-invoice"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  Follow the walkthrough
                </a>
              </div>
            </div>

            <div className="mx-auto mt-12 max-w-5xl">
              <GuideScreenshot
                src="/guides/dashboard-overview.webp"
                alt="Actual FinFlow Track desktop dashboard overview with financial summary cards and charts."
              />
            </div>
          </div>
        </section>

        <section
          id="first-invoice"
          aria-labelledby="walkthrough-title"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20"
        >
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              First-use walkthrough
            </p>
            <h2
              id="walkthrough-title"
              className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
            >
              From business setup to receivables
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Follow the numbered steps in order. Each action link opens the
              relevant area of FinFlow Track. You can return to this page at any
              time.
            </p>
          </div>

          <ol className="space-y-7">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.number}
                  className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-7 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                        {step.number}
                      </span>
                      <Icon
                        className="h-5 w-5 text-emerald-700"
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Step {Number(step.number)}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-slate-950">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                      {step.summary}
                    </p>
                    {step.note && (
                      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                        {step.note}
                      </p>
                    )}
                    <Link
                      to={step.href}
                      className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                    >
                      {step.action} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  {step.image && (
                    <GuideScreenshot
                      src={step.image}
                      alt={step.imageAlt ?? step.title}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BadgeCheck className="h-5 w-5 text-emerald-700" />
                Mobile invoice view
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The supplied phone screenshot shows the New invoice form at a
                narrow viewport. Review the customer, dates, currency, line
                items and total before saving.
              </p>
              <div className="mt-4">
                <GuideScreenshot
                  src="/guides/invoice-create-mobile.webp"
                  alt="Actual FinFlow Track mobile screenshot of the New invoice form, including customer, issue date, due date, currency, line items and Save invoice button."
                  mobile
                />
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                Before you finish
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>• Confirm the invoice belongs to the correct company.</li>
                <li>• Check customer, currency, dates and line-item totals.</li>
                <li>• Record only payments actually received.</li>
                <li>• Recheck the outstanding balance after recording payment.</li>
              </ul>
              <Link
                to="/reports"
                className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-emerald-800 hover:text-emerald-900"
              >
                Review financial reports <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                Need help with the next step?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Open the relevant workspace and follow the on-screen actions.
                If a control differs from the screenshots, use the current
                application interface as the source of truth.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/companies" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                  <Building2 className="h-4 w-4" /> Companies
                </Link>
                <Link to="/customers" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                  <Users className="h-4 w-4" /> Customers
                </Link>
                <Link to="/invoices" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                  <FileText className="h-4 w-4" /> Invoices
                </Link>
                <Link to="/sales/payments" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                  <CircleDollarSign className="h-4 w-4" /> Payments
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6">
          <p className="text-xs leading-5 text-slate-500">
            Screenshots are genuine FinFlow Track application captures supplied
            for this guide. Visible names and financial amounts are illustrative
            demonstration data, not customer results. The sharing step is
            described without a sharing screenshot because that screen was not
            included in the supplied captures.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
