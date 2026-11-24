import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Check, Minus } from "lucide-react";

const SITE_URL = "https://www.finflowtrack.com";
const PAGE_URL = `${SITE_URL}/compare/finflow-track-vs-xero`;
const PUBLISHED_DATE = "2026-08-14";
const REVIEWED_DATE = "2026-11-24";

type Status = "yes" | "no" | "partial";
function Mark({ status, children }: { status: Status; children: string }) {
  return <span className="inline-flex items-start gap-2 text-sm">{status === "yes" ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" /> : status === "no" ? <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <span aria-hidden="true">◐</span>}<span>{children}</span></span>;
}

const comparisons: { feature: string; finflow: string; xero: string; fs: Status; xs: Status }[] = [
  { feature: "Ongoing free plan", finflow: "Free plan available", xero: "No ongoing free plan", fs: "yes", xs: "no" },
  { feature: "Invoice creation", finflow: "Included on Free; PDF export and sharing by email or secure link", xero: "Early: 20/month; Growing and Established remove the Early cap", fs: "yes", xs: "partial" },
  { feature: "Bills", finflow: "Not listed as a current feature", xero: "Early: 5/month; higher plans remove the Early limit", fs: "no", xs: "partial" },
  { feature: "Expense tracking", finflow: "Expense recording and tracking", xero: "Income and expense tracking on all plans", fs: "yes", xs: "yes" },
  { feature: "Receipt/document capture", finflow: "Not currently available", xero: "Smart Document Capture on all U.S. plans", fs: "no", xs: "yes" },
  { feature: "Bank reconciliation", finflow: "No automatic bank feeds or reconciliation claim", xero: "Bank transaction reconciliation on all U.S. plans", fs: "no", xs: "yes" },
  { feature: "Financial reports", finflow: "P&L, balance sheet, cash flow, aging reports; CSV export", xero: "Real-time reports on all U.S. plans", fs: "yes", xs: "yes" },
  { feature: "Cash-flow forecasting", finflow: "No dedicated forecast tool", xero: "30 days Early; 60 Growing; 180 Established", fs: "no", xs: "yes" },
  { feature: "Multi-currency", finflow: "Rate locked when transaction is recorded", xero: "Established plan in the U.S.", fs: "yes", xs: "partial" },
  { feature: "AI Bookkeeper", finflow: "Paid plans", xero: "AI availability and rollout vary", fs: "partial", xs: "partial" },
  { feature: "Inventory", finflow: "Not currently available", xero: "Inventory Plus optional add-on on Growing and Established", fs: "no", xs: "partial" },
  { feature: "Projects and time tracking", finflow: "Not currently available", xero: "Established plan", fs: "no", xs: "partial" },
  { feature: "Payroll", finflow: "Not currently available", xero: "Optional Xero Payroll add-on", fs: "no", xs: "partial" },
  { feature: "Companies and team access", finflow: "Company and team limits depend on plan", xero: "Organization subscriptions; no per-user license fees", fs: "partial", xs: "partial" },
];

const faqs = [
  { q: "Does Xero have a free plan?", a: "Xero's U.S. pricing page lists paid subscriptions rather than an ongoing free plan. Early is its entry-level paid option. Promotional offers may change, so check Xero's official pricing page for current terms." },
  { q: "How much does Xero cost in the U.S.?", a: "Xero's U.S. standard monthly list prices currently shown are $27 for Early, $59 for Growing, and $97 for Established, before applicable taxes and optional add-ons. Introductory promotions can change; confirm the current price on Xero's official pricing page." },
  { q: "What is the main difference between FinFlow Track and Xero?", a: "FinFlow Track offers a Free plan focused on basic accounting, invoice creation, expense tracking, customer management, and basic reports. Xero is a paid accounting platform with bank transaction reconciliation, Smart Document Capture, real-time reports, and plan-based cash-flow forecasting." },
  { q: "Does FinFlow Track support multiple currencies?", a: "Yes. FinFlow Track supports multi-currency transactions, and the exchange rate is locked when a transaction is recorded." },
  { q: "Which Xero plan includes multi-currency?", a: "Xero's U.S. pricing page lists multi-currency on its Established plan. Confirm current availability and terms for your country on Xero's local pricing page." },
  { q: "Does FinFlow Track include recurring invoices or the AI Bookkeeper?", a: "Recurring invoices and the AI Bookkeeper are paid-plan features. Invoice creation is included on the Free plan, with PDF export and sharing by email or secure link." },
  { q: "Can I switch from Xero to FinFlow Track?", a: "FinFlow Track does not currently offer a direct, automated Xero importer. Review the records you can export from Xero, confirm which information you can recreate in FinFlow Track, and reconcile opening balances and reports carefully before switching." },
];

export const Route = createFileRoute("/compare/finflow-track-vs-xero")({
  component: ComparePage,
  head: () => {
    const title = "FinFlow Track vs Xero: Plans & Features Compared";
    const description = "Compare FinFlow Track Free with Xero's paid U.S. plans, including invoices, bills, reports, bank reconciliation, and multi-currency features.";
    return {
      meta: [
        { title }, { name: "description", content: description }, { name: "robots", content: "index, follow" },
        { property: "og:title", content: title }, { property: "og:description", content: description },
        { property: "og:type", content: "article" }, { property: "og:url", content: PAGE_URL },
        { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: PAGE_URL }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Compare", item: `${SITE_URL}/compare` },
          { "@type": "ListItem", position: 3, name: "FinFlow Track vs Xero", item: PAGE_URL },
        ] }) },
        { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: title, description, url: PAGE_URL, datePublished: PUBLISHED_DATE, dateModified: REVIEWED_DATE, isPartOf: { "@type": "WebSite", name: "FinFlow Track", url: SITE_URL }, publisher: { "@type": "Organization", name: "FinFlow Track", url: SITE_URL } }) },
        { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }) },
      ],
    };
  },
});

function ComparePage() {
  return <div className="bg-background">
    <SiteHeader />
    <div className="border-b"><div className="container mx-auto max-w-7xl px-6 py-4"><nav aria-label="Breadcrumb" className="text-sm text-muted-foreground"><ol className="flex flex-wrap items-center gap-2"><li><Link to="/">Home</Link></li><li aria-hidden="true">/</li><li><span>Compare</span></li><li aria-hidden="true">/</li><li aria-current="page" className="text-foreground">FinFlow Track vs Xero</li></ol></nav></div></div>
    <section className="border-b"><div className="container mx-auto max-w-5xl px-6 py-16">
      <span className="inline-flex rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">Accounting Software Comparison</span>
      <h1 className="mt-6 text-4xl font-bold tracking-tight lg:text-5xl">FinFlow Track vs Xero: Free Plan, Pricing &amp; Features Compared</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">FinFlow Track and Xero both support small-business financial workflows, but their plans and capabilities differ. FinFlow Track has a Free plan for basic accounting, invoice creation, expense tracking, customer records, and basic reports. Xero is a paid platform whose U.S. plans add bank transaction reconciliation, document capture, real-time reporting, and cash-flow forecasting, with limits and features varying by tier.</p>
      <div className="mt-8 flex flex-wrap gap-4"><Link to="/signup" search={{ plan: "free" }} className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-primary-foreground">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/pricing" className="rounded-lg border px-6 py-3 hover:bg-muted">View Pricing</Link></div>
      <div className="mt-10 rounded-xl border bg-muted/40 p-5 text-sm text-muted-foreground"><strong className="text-foreground">Comparison reviewed:</strong> November 16, 2026. Xero plan details and standard prices shown here are for the U.S. market. Features and prices vary by country and can change; confirm details on the official pricing page before purchasing.</div>
    </div></section>

    <section className="container mx-auto max-w-5xl px-6 py-14"><h2 className="text-3xl font-bold">Quick Answer</h2><div className="mt-6 space-y-4 text-lg leading-8 text-muted-foreground">
      <p><strong className="text-foreground">FinFlow Track</strong> may fit freelancers and small businesses whose needs are covered by a focused set of invoicing, expense, customer, and reporting workflows, starting with a Free plan. Recurring invoices and the AI Bookkeeper are paid-plan features.</p>
      <p><strong className="text-foreground">Xero</strong> is a paid accounting platform with bank transaction reconciliation, Smart Document Capture, real-time reports, and plan-based cash-flow forecasting. Its U.S. Early plan has monthly invoice and bill limits; more advanced capabilities sit on higher plans or optional add-ons.</p>
      <p>Choose based on the exact tasks you need to complete, not the number of features listed on a pricing page. Confirm country availability and plan limits before moving financial records.</p>
    </div></section>

    <section className="bg-muted/40"><div className="container mx-auto max-w-6xl px-6 py-14">
      <h2 className="text-3xl font-bold">FinFlow Track Free vs Xero's Entry-Level U.S. Plan</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">This is a plan-level comparison, not a claim that the products have identical feature sets. Xero Early is a paid subscription; FinFlow Track also offers a Free plan.</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border bg-background"><table className="min-w-full text-sm">
        <thead className="bg-muted"><tr><th scope="col" className="px-5 py-4 text-left">Item</th><th scope="col" className="px-5 py-4 text-center">FinFlow Track Free</th><th scope="col" className="px-5 py-4 text-center">Xero Early (U.S.)</th></tr></thead>
        <tbody>
          <tr className="border-t"><th scope="row" className="px-5 py-4 text-left font-medium">Standard monthly price</th><td className="px-5 py-4 text-center">$0</td><td className="px-5 py-4 text-center">$27</td></tr>
          <tr className="border-t"><th scope="row" className="px-5 py-4 text-left font-medium">Invoices</th><td className="px-5 py-4 text-center">Invoice creation; PDF export and sharing</td><td className="px-5 py-4 text-center">20 per month</td></tr>
          <tr className="border-t"><th scope="row" className="px-5 py-4 text-left font-medium">Bills</th><td className="px-5 py-4 text-center">Not listed as a current feature</td><td className="px-5 py-4 text-center">5 per month</td></tr>
          <tr className="border-t"><th scope="row" className="px-5 py-4 text-left font-medium">Core workflows</th><td className="px-5 py-4 text-center">Basic accounting, expenses, customers, basic reports</td><td className="px-5 py-4 text-center">Income/expense tracking, bills, quotes, invoices, reconciliation</td></tr>
          <tr className="border-t"><th scope="row" className="px-5 py-4 text-left font-medium">Cash-flow forecast</th><td className="px-5 py-4 text-center">No dedicated forecast tool</td><td className="px-5 py-4 text-center">30 days</td></tr>
          <tr className="border-t"><th scope="row" className="px-5 py-4 text-left font-medium">Document capture</th><td className="px-5 py-4 text-center">Not currently available</td><td className="px-5 py-4 text-center">Smart Document Capture</td></tr>
        </tbody></table></div>
      <p className="mt-4 text-xs text-muted-foreground">Xero plan limits and prices are for the U.S. market and were checked on November 16, 2026. Fees, taxes, promotions, and local plan availability may differ. See <a href="https://www.xero.com/us/pricing-plans/" target="_blank" rel="noopener noreferrer nofollow" className="underline">Xero's official U.S. pricing page</a>.</p>
    </div></section>

    <section className="container mx-auto max-w-6xl px-6 py-14"><h2 className="text-3xl font-bold">Feature-by-Feature Comparison</h2><div className="mt-8 overflow-x-auto rounded-2xl border"><table className="min-w-full bg-background text-sm">
      <thead className="bg-muted"><tr><th scope="col" className="px-5 py-4 text-left">Feature</th><th scope="col" className="px-5 py-4 text-left">FinFlow Track</th><th scope="col" className="px-5 py-4 text-left">Xero (U.S.)</th></tr></thead>
      <tbody>{comparisons.map(r => <tr key={r.feature} className="border-t"><th scope="row" className="px-5 py-4 text-left font-medium">{r.feature}</th><td className="px-5 py-4"><Mark status={r.fs}>{r.finflow}</Mark></td><td className="px-5 py-4"><Mark status={r.xs}>{r.xero}</Mark></td></tr>)}</tbody>
    </table></div><p className="mt-4 text-xs text-muted-foreground">“Partial” means a feature is limited by plan, region, or add-on. Confirm current terms before purchase.</p></section>

    <section className="bg-muted/40"><div className="container mx-auto max-w-6xl px-6 py-14"><h2 className="text-3xl font-bold">Pricing Compared</h2>
      <p className="mt-3 max-w-3xl text-muted-foreground">Xero's U.S. standard monthly list prices are $27 for Early, $59 for Growing, and $97 for Established, before applicable taxes and optional add-ons. Promotional offers can change. FinFlow Track's current paid-plan prices and limits are listed on its pricing page.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-background p-8"><h3 className="text-xl font-bold">FinFlow Track</h3><p className="mt-4 text-2xl font-semibold">$0 <span className="text-sm font-normal text-muted-foreground">Free plan</span></p><p className="mt-3 text-sm leading-7 text-muted-foreground">Includes basic accounting, invoice creation, expense tracking, customer management, and basic reports. Recurring invoices and the AI Bookkeeper are paid-plan features.</p><Link to="/pricing" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">See FinFlow Track plans <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="rounded-2xl border bg-background p-8"><h3 className="text-xl font-bold">Xero (U.S.)</h3><ul className="mt-4 space-y-2 text-sm text-muted-foreground"><li>Early — <strong className="text-foreground">$27/month</strong></li><li>Growing — <strong className="text-foreground">$59/month</strong></li><li>Established — <strong className="text-foreground">$97/month</strong></li></ul><p className="mt-3 text-sm leading-7 text-muted-foreground">Early is limited to 20 invoices and 5 bills per month. Growing and Established expand those workflows. Inventory Plus and Xero Payroll are optional add-ons; multi-currency and project tracking are listed on Established.</p><a href="https://www.xero.com/us/pricing-plans/" target="_blank" rel="noopener noreferrer nofollow" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">View official Xero pricing <ArrowRight className="h-4 w-4" /></a></div>
      </div><p className="mt-4 text-xs text-muted-foreground">Prices checked November 16, 2026; U.S. dollars, monthly list prices, before applicable taxes. Pricing and plan details vary by country and can change.</p>
    </div></section>

    <section className="container mx-auto max-w-5xl px-6 py-14"><h2 className="text-3xl font-bold">Which Product Fits Your Business?</h2><div className="mt-8 grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border p-7"><h3 className="text-xl font-semibold">Consider FinFlow Track if</h3><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground"><li>Your needs are covered by invoicing, expense tracking, customer records, and basic reports.</li><li>You want to begin with a Free plan and check included limits before upgrading.</li><li>You record transactions in multiple currencies and need the rate locked when each transaction is recorded.</li><li>You understand recurring invoices and the AI Bookkeeper are paid-plan features.</li></ul></div>
      <div className="rounded-2xl border p-7"><h3 className="text-xl font-semibold">Consider Xero if</h3><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground"><li>You need bank transaction reconciliation and supported bank-feed workflows.</li><li>You need Smart Document Capture or bill management in your accounting platform.</li><li>You need cash-flow forecasting, multi-currency, or project tools and can choose the plan that includes them.</li><li>Your team or accountant already relies on Xero's ecosystem.</li></ul></div>
    </div></section>

    <section className="bg-muted/40"><div className="container mx-auto max-w-5xl px-6 py-14"><h2 className="text-3xl font-bold">Important FinFlow Track Limitations</h2><p className="mt-4 max-w-3xl text-muted-foreground">FinFlow Track does not currently advertise automatic bank feeds, automatic bank reconciliation, receipt scanning, inventory, payroll, project/time tracking, a public third-party integration marketplace, or public API access. Recurring invoices and the AI Bookkeeper are paid-plan features. Company and team limits depend on plan. Compare these boundaries with your actual requirements before switching from another system.</p></div></section>

    <section className="container mx-auto max-w-4xl px-6 py-14"><h2 className="text-3xl font-bold">Switching from Xero to FinFlow Track</h2><p className="mt-4 text-muted-foreground">FinFlow Track does not currently offer a direct, automated Xero importer. Treat migration as a controlled record-recreation project, and do not close the previous system until opening balances and reports have been checked by an appropriately qualified person.</p><ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-7 text-muted-foreground"><li>List the records your business needs to retain, including customers, invoices, expenses, and financial balances.</li><li>Review Xero's current export options and save the records your plan allows you to export.</li><li>Create the company workspace in FinFlow Track and confirm its base currency and company details.</li><li>Recreate supported customer, invoice, and expense information using workflows available in FinFlow Track.</li><li>Do not assume every Xero record, bill, tax setting, inventory item, or integration can be transferred.</li><li>Compare opening balances and key financial reports with source records before relying on the new system.</li><li>Keep original exports and a record of migration decisions for future reference.</li></ol></section>

    <section className="bg-muted/40"><div className="container mx-auto max-w-4xl px-6 py-14"><h2 className="text-2xl font-bold">How We Prepared This Comparison</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">This comparison was prepared by the FinFlow Track team using the product's currently documented capabilities and Xero's official U.S. pricing and plan information, checked on November 16, 2026. FinFlow Track is the product being compared, so this is not an independent review. We have identified limitations in our own product and have not claimed hands-on testing of Xero. Xero's plan features and prices can change and may differ by country; the official pricing page is linked for readers to verify current terms.</p></div></section>

    <section className="container mx-auto max-w-4xl px-6 py-14"><h2 className="text-3xl font-bold">Frequently Asked Questions</h2><Accordion type="single" collapsible className="mt-8">{faqs.map(f => <AccordionItem key={f.q} value={f.q}><AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger><AccordionContent className="text-muted-foreground leading-7">{f.a}</AccordionContent></AccordionItem>)}</Accordion></section>

    <section className="border-t"><div className="container mx-auto max-w-4xl px-6 py-16 text-center"><h2 className="text-3xl font-bold">See Whether FinFlow Track Fits Your Workflow</h2><p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Explore its invoicing, expense tracking, customer records, and financial reporting workflows, then compare included plan limits with your business needs.</p><div className="mt-8 flex flex-wrap justify-center gap-4"><Link to="/signup" search={{ plan: "free" }} className="inline-flex items-center rounded-lg bg-primary px-7 py-3 text-primary-foreground">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link><Link to="/pricing" className="rounded-lg border px-7 py-3">View Pricing</Link></div></div></section>
    <SiteFooter />
  </div>;
}
