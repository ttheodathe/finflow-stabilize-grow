import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Calculator, RotateCcw, ArrowRight } from "lucide-react";

const SITE_URL = "https://www.finflowtrack.com";
const PAGE_URL = `${SITE_URL}/tools/break-even-calculator`;

export const Route = createFileRoute("/tools/break-even-calculator")({
  component: BreakEvenCalculatorPage,
  head: () => ({
    meta: [
      { title: "Break-Even Calculator for Small Business | FinFlow Track" },
      { name: "description", content: "Calculate break-even units and revenue, contribution margin, target-profit sales, and margin of safety with this free small-business calculator." },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Small Business Break-Even Calculator" },
      { property: "og:description", content: "Model break-even sales, contribution margin, target profit, and margin of safety." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "FinFlow Track Break-Even Calculator",
        url: PAGE_URL,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description: "An educational calculator for single-product or single-service break-even planning.",
      }),
    }],
  }),
});

const money = (n: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
const fmt = (n: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

function Input({ label, value, onChange, currency, hint, step = "0.01" }: {
  label: string; value: string; onChange: (v: string) => void; currency?: string; hint?: string; step?: string;
}) {
  return <label className="block space-y-1.5">
    <span className="text-sm font-medium">{label}</span>
    <span className="flex items-center rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring">
      {currency && <span className="pl-3 text-xs text-muted-foreground">{currency}</span>}
      <input type="number" min="0" step={step} inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} className="w-full min-w-0 rounded-lg bg-transparent px-3 py-2.5 outline-none" />
    </span>
    {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
  </label>;
}

function Result({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="rounded-xl border bg-card p-4">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
  </div>;
}

function BreakEvenCalculatorPage() {
  const [currency, setCurrency] = useState("USD");
  const [period, setPeriod] = useState("month");
  const [fixed, setFixed] = useState("6000");
  const [price, setPrice] = useState("100");
  const [variable, setVariable] = useState("40");
  const [expected, setExpected] = useState("150");
  const [target, setTarget] = useState("3000");

  const result = useMemo(() => {
    // Fixed costs, selling price, variable cost, and expected units are required.
    // A blank target-profit field is intentionally treated as a zero-profit target.
    if ([fixed, price, variable, expected].some(value => value.trim() === "")) return null;
    const f = Number(fixed), p = Number(price), v = Number(variable), e = Number(expected);
    const t = target.trim() === "" ? 0 : Number(target);
    if (![f,p,v,e,t].every(Number.isFinite) || f < 0 || p <= 0 || v < 0 || e < 0 || t < 0 || v >= p) return null;
    const cm = p - v, ratio = cm / p, rawUnits = f / cm;
    const units = Math.ceil(rawUnits);
    const profit = e * cm - f;
    return {
      cm, ratio, units, revenue: rawUnits * p,
      targetUnits: Math.ceil((f + t) / cm),
      profit, expectedRevenue: e * p,
      marginSafety: e > 0 ? (e - rawUnits) / e : null,
      marginSafetyUnits: e - rawUnits,
      totalCosts: f + e * v,
    };
  }, [fixed, price, variable, expected, target]);

  const reset = () => {
    setCurrency("USD"); setPeriod("month"); setFixed("6000");
    setPrice("100"); setVariable("40"); setExpected("150"); setTarget("3000");
  };

  return <div className="min-h-screen bg-background">
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link><span className="mx-2">/</span><span>Tools</span><span className="mx-2">/</span><span className="text-foreground">Break-even calculator</span>
      </nav>
      <div className="max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground"><Calculator className="h-4 w-4" /> Free business planning tool</div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Small Business Break-Even Calculator</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">Estimate how many units or services you need to sell to cover the fixed and variable costs in your model. Test expected sales and a target profit using your own assumptions.</p>
      </div>

      <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="inputs-heading">
          <div className="flex items-center justify-between gap-3">
            <div><h2 id="inputs-heading" className="text-xl font-semibold">Your assumptions</h2><p className="mt-1 text-sm text-muted-foreground">Use figures for the same period.</p></div>
            <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"><RotateCcw className="h-4 w-4" /> Reset</button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">Currency
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2.5 font-normal">
                {["USD","EUR","GBP","CAD","AUD","RWF","KES","NGN","ZAR"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium">Cost period
              <select value={period} onChange={e => setPeriod(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2.5 font-normal">
                <option value="month">Monthly</option><option value="quarter">Quarterly</option><option value="year">Yearly</option><option value="project">Per project / cycle</option>
              </select>
            </label>
          </div>
          <div className="mt-6 space-y-5">
            <Input label={`Fixed costs per ${period === "project" ? "project / cycle" : period}`} value={fixed} onChange={setFixed} currency={currency} hint="Costs for the selected period that do not change directly with each unit sold." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Selling price per unit" value={price} onChange={setPrice} currency={currency} />
              <Input label="Variable cost per unit" value={variable} onChange={setVariable} currency={currency} hint="Costs that increase with each unit or service delivered." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Expected units sold" value={expected} onChange={setExpected} step="1" hint="For the same period." />
              <Input label="Target profit" value={target} onChange={setTarget} currency={currency} hint="Optional planning target for the same period." />
            </div>
          </div>
          <div className="mt-6 rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground"><strong className="text-foreground">Keep periods consistent.</strong> If fixed costs are monthly, expected units and target profit must also represent one month. Convert annual or quarterly costs before entering them.</div>
        </section>

        <section className="space-y-5" aria-live="polite" aria-labelledby="results-heading">
          <div><h2 id="results-heading" className="text-xl font-semibold">Your results</h2><p className="mt-1 text-sm text-muted-foreground">Calculated from your assumptions.</p></div>
          {!result ? <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm"><strong>Check your inputs.</strong><p className="mt-1 text-muted-foreground">{[fixed, price, variable, expected].some(value => value.trim() === "") ? "Complete fixed costs, selling price, variable cost, and expected units. Target profit may be left blank." : Number(price) <= 0 ? "Selling price must be greater than zero." : Number(variable) >= Number(price) ? "Variable cost must be lower than selling price. Otherwise, there is no finite break-even point in this model." : "Enter valid, non-negative numbers in every field."}</p></div> : <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Result label="Break-even units" value={fmt(result.units)} note={`Whole units per ${period}`} />
              <Result label="Break-even revenue" value={money(result.revenue, currency)} note={`Sales needed per ${period}`} />
              <Result label="Contribution per unit" value={money(result.cm, currency)} />
              <Result label="Contribution margin ratio" value={`${fmt(result.ratio * 100)}%`} />
              <Result label="Units for target profit" value={fmt(result.targetUnits)} note={money(Number(target), currency) + " target"} />
              <Result label="Profit / (loss) at expected sales" value={money(result.profit, currency)} note={`${fmt(Number(expected))} expected units`} />
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">Expected sales vs. break-even</h3>
              <div className="mt-4 space-y-4">
                {[{label:"Break-even units",n:result.units},{label:"Expected units",n:Number(expected)}].map(row => <div key={row.label}>
                  <div className="mb-1 flex justify-between text-sm"><span>{row.label}</span><strong>{fmt(row.n)}</strong></div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${Math.min(100,row.n/Math.max(result.units,Number(expected),1)*100)}%`}} /></div>
                </div>)}
              </div>
              <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
                <div><p className="text-sm text-muted-foreground">Margin of safety</p><p className="text-lg font-semibold">{result.marginSafety === null ? "—" : `${fmt(result.marginSafety * 100)}%`}</p><p className="text-xs text-muted-foreground">{fmt(result.marginSafetyUnits)} units above / (below) break-even</p></div>
                <div><p className="text-sm text-muted-foreground">Expected revenue</p><p className="text-lg font-semibold">{money(result.expectedRevenue,currency)}</p><p className="text-xs text-muted-foreground">Modeled costs: {money(result.totalCosts,currency)}</p></div>
              </div>
            </div>
          </>}
        </section>
      </div>

      <section className="mt-12 grid gap-8 border-t pt-10 lg:grid-cols-2">
        <div><h2 className="text-2xl font-semibold">How the calculator works</h2><p className="mt-3 leading-7 text-muted-foreground">Contribution margin is the amount left from each sale after its variable cost. Break-even occurs when total contribution covers the fixed costs included in the model.</p><div className="mt-4 rounded-xl bg-muted/60 p-4 font-mono text-sm leading-7">Contribution = Price − Variable cost<br />Break-even units = Fixed costs ÷ Contribution<br />Break-even revenue = Fixed costs ÷ Contribution ratio<br />Target units = (Fixed costs + Target profit) ÷ Contribution</div></div>
        <div><h2 className="text-2xl font-semibold">Important limitations</h2><ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-muted-foreground"><li>This is a single-product or single-service model. Multiple products require a weighted sales mix or separate calculations.</li><li>It assumes a consistent selling price and variable cost per unit across the selected period.</li><li>It does not model demand changes, capacity limits, taxes, financing, inventory timing, or cash collection delays.</li><li>Break-even is not the same as cash-flow sufficiency or a guarantee of business viability.</li></ul></div>
      </section>

      <div className="mt-10 rounded-2xl border bg-muted/30 p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Continue learning</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">For the full explanation of fixed costs, variable costs, contribution margin, worked examples, and common modeling mistakes, read our <Link to="/blog/$slug" params={{ slug: "break-even-analysis-small-business" }} className="font-medium text-primary underline underline-offset-4">small-business break-even analysis guide</Link>.</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">FinFlow Track helps organize invoices, expenses, and financial reports. This is an independent educational planning tool; it does not read or save your FinFlow Track account data.</p>
        <Link to="/signup" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Explore FinFlow Track <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <p className="mt-8 text-xs leading-5 text-muted-foreground">Educational information only, not accounting, tax, legal, or financial advice. Results depend on your inputs and assumptions. Review cost classifications with an appropriately qualified professional.</p>
    </main>
    <SiteFooter />
  </div>;
}
