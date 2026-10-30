import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Building2,
  CalendarDays,
  Landmark,
  Package,
  Receipt,
  ScrollText,
  ShieldCheck,
  Users,
  Wallet,
  FileText,
  Globe,
  Briefcase,
  Minus,
  type LucideIcon,
} from "lucide-react";
import {
  FEATURES,
  planHasFeature,
  requiredPlanFor,
  requiredPlanName,
  type FeatureKey,
} from "@/lib/features/catalog";
import { PLANS, type PlanKey } from "@/lib/paddle/config";

/**
 * Every statement on this page was checked against the codebase (routes, database
 * migrations, services and the plan catalog). The plan table is generated from
 * "@/lib/features/catalog", the same source the app uses to gate features, so it cannot
 * drift from what each plan actually unlocks.
 */

const PAGE_TITLE =
  "Features | FinFlowTrack - Invoicing, Accounting, Inventory, Payroll and Reports";
const PAGE_DESC =
  "See what FinFlowTrack includes: invoicing, expenses and bills, accounting, bank reconciliation, inventory, payroll and HR, tax tracking, financial reports and an AI Bookkeeper.";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESC },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESC },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESC },
    ],
    links: [{ rel: "canonical", href: "https://www.finflowtrack.com/features" }],
  }),
});

/** Shows the lowest plan that unlocks a feature, read from the plan catalog. */
function PlanTag({ feature }: { feature: FeatureKey }) {
  if (requiredPlanFor(feature) === "free") return null;
  return (
    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      {requiredPlanName(feature)}+
    </span>
  );
}

type Module = {
  icon: LucideIcon;
  title: string;
  desc: string;
  points: { text: string; feature?: FeatureKey }[];
};

const modules: Module[] = [
  {
    icon: FileText,
    title: "Invoicing",
    desc: "Create and send invoices, quote customers and record the payments you receive.",
    points: [
      {
        text: "Invoices with PDF export, email delivery and a shareable online link",
        feature: "invoices",
      },
      { text: "Estimates (quotations) for customers" },
      { text: "Record customer payments against invoices" },
      { text: "Recurring invoices", feature: "recurringInvoices" },
      { text: "Credit notes", feature: "creditNotes" },
    ],
  },
  {
    icon: Receipt,
    title: "Expenses & bills",
    desc: "Track what the business spends and what it owes to suppliers.",
    points: [
      { text: "Expenses by vendor and category" },
      { text: "Supplier bills and vendor records", feature: "bills" },
      { text: "Purchase orders", feature: "purchaseOrders" },
    ],
  },
  {
    icon: BookOpen,
    title: "Accounting",
    desc: "Double-entry books behind the scenes, with the standard accounting views.",
    points: [
      { text: "Chart of accounts and journal entries", feature: "accounting" },
      { text: "General ledger and trial balance", feature: "accounting" },
      { text: "Balance sheet generated from the ledger", feature: "accounting" },
    ],
  },
  {
    icon: Landmark,
    title: "Banking",
    desc: "Keep bank records in step with your books.",
    points: [
      { text: "Bank accounts, transactions and transfers" },
      { text: "Import bank statements from CSV files" },
      { text: "Bank reconciliation", feature: "bankReconciliation" },
    ],
  },
  {
    icon: Package,
    title: "Inventory",
    desc: "Know what you hold and where it is.",
    points: [
      { text: "Products, variants, services and categories", feature: "inventory" },
      { text: "Warehouses and stock movements", feature: "warehouses" },
      { text: "Low-stock indicators in the inventory list", feature: "inventory" },
    ],
  },
  {
    icon: BarChart3,
    title: "Financial reports",
    desc: "See where the business stands, using your recorded data.",
    points: [
      { text: "Basic reports", feature: "basicReports" },
      { text: "Profit & loss, balance sheet and cash flow statement", feature: "advancedReports" },
      { text: "Receivables and payables aging", feature: "advancedReports" },
      { text: "Invoice summary: outstanding and overdue balances per currency" },
      { text: "CSV export and saved report filters" },
    ],
  },
  {
    icon: BrainCircuit,
    title: "AI Bookkeeper & document scanning",
    desc: "Save typing and get answers from your own records. You stay in control.",
    points: [
      {
        text: "Ask questions about your invoices and expenses in plain language",
        feature: "aiBookkeeper",
      },
      {
        text: "Scan receipts and bills; review and approve the extracted details before saving",
        feature: "documentAi",
      },
      { text: "Suggested expense categories" },
    ],
  },
  {
    icon: ScrollText,
    title: "Tax tracking",
    desc: "Keep tax periods, returns and deadlines in one place.",
    points: [
      { text: "Tax periods, returns, payments and supporting documents", feature: "tax" },
      { text: "Tax calendar with upcoming deadlines", feature: "tax" },
    ],
  },
  {
    icon: Wallet,
    title: "HR & payroll",
    desc: "Employees, leave and pay runs, with Rwandan statutory rates built in.",
    points: [
      { text: "Employees, departments, leave and expense claims", feature: "hr" },
      { text: "Pay runs and payslips, posted to the books", feature: "payroll" },
      {
        text: "Rwanda PAYE and RSSB rates, with effective dates, in payroll settings",
        feature: "payroll",
      },
    ],
  },
  {
    icon: Briefcase,
    title: "Customers & CRM",
    desc: "Keep customer details and sales activity together.",
    points: [{ text: "Customer records with lifecycle stages" }, { text: "Deals pipeline" }],
  },
  {
    icon: Building2,
    title: "Companies & team",
    desc: "Run more than one business and decide who can do what.",
    points: [
      {
        text: "Several companies under one login, each with separate books (limits depend on plan)",
      },
      { text: "Invite team members by email and give them a role" },
      { text: "Multi-currency, with the exchange rate locked when a transaction is recorded" },
    ],
  },
  {
    icon: CalendarDays,
    title: "Calendar",
    desc: "See what is due and when.",
    points: [{ text: "Payment due dates and recurring invoices in one calendar view" }],
  },
];

const trust = [
  {
    icon: Building2,
    title: "Separate books per company",
    desc: "Each company's records are kept apart, and access follows company membership.",
  },
  {
    icon: Users,
    title: "Roles & permissions",
    desc: "Owner, admin, accountant, manager, employee and viewer roles, plus a permission matrix.",
  },
  {
    icon: ShieldCheck,
    title: "Audit log of key actions",
    desc: "Actions such as document approvals and pay run postings are recorded in an audit log.",
  },
  {
    icon: Globe,
    title: "Cloud-based",
    desc: "Work from any modern browser. Traffic to the app is encrypted with HTTPS.",
  },
];

const faqs = [
  {
    q: "Who is FinFlowTrack for?",
    a: "Freelancers, small businesses, startups and NGOs that want invoicing, expenses, accounting and reports in one place.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The Free plan includes basic accounting, invoice creation, expense tracking, customer management and basic reports. Paid plans unlock more features, companies and team members. See the plan table above and the pricing page.",
  },
  {
    q: "Does FinFlowTrack connect directly to my bank?",
    a: "Not at the moment. You can import bank statements from CSV files and reconcile them against your records.",
  },
  {
    q: "Does the AI Bookkeeper make changes to my books on its own?",
    a: "No. It answers questions using your own invoices and expenses, and scanned documents are shown for your review and approval before anything is saved. Always check important figures against your reports.",
  },
  {
    q: "Can I manage more than one company?",
    a: "Yes. Depending on your plan, you can create several companies and switch between them while keeping each company's records separate.",
  },
  {
    q: "Which countries does payroll support?",
    a: "Payroll includes Rwandan PAYE and RSSB rates. Check your own local requirements with a qualified professional before relying on any payroll calculation.",
  },
];

const planColumns: PlanKey[] = ["free", "pro", "business"];
// "apiAccess" is deliberately left out: it is not offered as a customer-facing feature yet.
const tableFeatures = (Object.keys(FEATURES) as FeatureKey[]).filter((k) => k !== "apiAccess");

function FeaturesPage() {
  return (
    <div className="bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="border-b">
        <div className="container mx-auto max-w-7xl px-6 py-20">
          <span className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            FinFlowTrack Features
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight lg:text-6xl">
            Know your numbers.
            <br />
            Run your books in one place.
          </h1>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground">
            Invoicing, expenses and bills, accounting, banking, inventory, payroll, tax tracking and
            financial reports on one cloud platform for freelancers, small businesses and NGOs.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:opacity-90"
            >
              Start free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center rounded-lg border px-6 py-3 hover:bg-muted"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="container mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {trust.map((t) => (
            <div key={t.title} className="rounded-xl border p-8">
              <t.icon className="mb-4 h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">{t.title}</h3>
              <p className="mt-4 text-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MODULES */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-7xl px-6 py-20">
          <div className="text-center">
            <h2 className="text-4xl font-bold">What&rsquo;s included</h2>
            <p className="mx-auto mt-6 max-w-3xl text-muted-foreground">
              A plan tag shows the lowest plan that unlocks a feature. Items without a tag are
              available as part of the modules above them.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <div key={m.title} className="rounded-2xl border bg-background p-8">
                <m.icon className="mb-5 h-10 w-10 text-primary" />
                <h3 className="text-2xl font-semibold">{m.title}</h3>
                <p className="mt-3 text-muted-foreground">{m.desc}</p>
                <ul className="mt-5 space-y-3">
                  {m.points.map((p) => (
                    <li key={p.text} className="flex items-start gap-3 text-sm">
                      <BadgeCheck
                        className="mt-0.5 h-4 w-4 flex-none text-green-600"
                        aria-hidden="true"
                      />
                      <span className="flex-1">{p.text}</span>
                      {p.feature && <PlanTag feature={p.feature} />}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLAN TABLE (generated from the plan catalog) */}
      <section className="container mx-auto max-w-5xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold">What each plan unlocks</h2>
          <p className="mx-auto mt-6 max-w-2xl text-muted-foreground">
            Enterprise includes everything in Business with custom terms.{" "}
            <Link to="/pricing" className="font-medium text-primary underline underline-offset-2">
              See full plan details
            </Link>
            .
          </p>
        </div>

        <div className="mt-12 overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[32rem]">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="px-6 py-4 text-left">
                  Feature
                </th>
                {planColumns.map((k) => (
                  <th key={k} scope="col" className="px-6 py-4 text-center">
                    {PLANS[k].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableFeatures.map((key) => (
                <tr key={key} className="border-t">
                  <th scope="row" className="px-6 py-4 text-left font-normal">
                    {FEATURES[key].label}
                  </th>
                  {planColumns.map((plan) => (
                    <td key={plan} className="px-6 py-4 text-center">
                      {planHasFeature(plan, key) ? (
                        <>
                          <BadgeCheck
                            className="mx-auto h-5 w-5 text-green-600"
                            aria-hidden="true"
                          />
                          <span className="sr-only">Included</span>
                        </>
                      ) : (
                        <>
                          <Minus
                            className="mx-auto h-5 w-5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="sr-only">Not included</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECURITY */}
      <section className="bg-muted/40">
        <div className="container mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold">Your financial data</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Company data is separated by membership, access is controlled by role, and key actions
            are written to an audit log. Read more on our{" "}
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
      </section>

      {/* FAQ */}
      <section className="container mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-center text-4xl font-bold">Frequently asked questions</h2>
        <div className="mt-12 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-xl border px-6 py-5">
              <summary className="cursor-pointer list-none text-lg font-semibold marker:hidden">
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
              <p className="mt-4 text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t">
        <div className="container mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-4xl font-bold">Start on the Free plan</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Create an account, add your company and send your first invoice. No credit card is
            needed to sign up.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:opacity-90"
            >
              Get started free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center rounded-lg border px-6 py-3 hover:bg-muted"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
