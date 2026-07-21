import { useQuery } from "@tanstack/react-query";
import { getMySubscription, listInvoices, cancelSubscription } from "@/lib/billing.functions";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { PLANS, PLAN_ORDER, type PlanKey } from "@/lib/paddle/config";
import { PlanCheckoutButton } from "./PlanCheckoutButton";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function BillingSettings() {
  const companyId = useActiveCompanyId();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [canceling, setCanceling] = useState(false);

  const subQuery = useQuery({
    queryKey: ["subscription", companyId],
    queryFn: () => getMySubscription({ data: { companyId } }),
    enabled: Boolean(companyId),
  });

  const invoicesQuery = useQuery({
    queryKey: ["billing-invoices", companyId],
    queryFn: () => listInvoices({ data: { companyId: companyId! } }),
    enabled: Boolean(companyId) && Boolean(subQuery.data?.paddle_customer_id),
  });

  if (!companyId) {
    return (
      <div className="text-sm text-gray-500">
        Select a company to view billing information.
      </div>
    );
  }

  if (subQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading subscription…
      </div>
    );
  }

  const sub = subQuery.data;
  const currentPlan: PlanKey = (sub?.plan as PlanKey | undefined) ?? "free";
  const currentCfg = PLANS[currentPlan];

  const invoices = (() => {
    const raw = invoicesQuery.data?.transactionsJson;
    if (!raw) return [] as Array<Record<string, unknown>>;
    try {
      return JSON.parse(raw) as Array<Record<string, unknown>>;
    } catch {
      return [];
    }
  })();

  async function handleCancel() {
    if (!sub?.paddle_subscription_id) return;
    if (!confirm("Cancel subscription at end of current billing period?")) return;
    setCanceling(true);
    try {
      await cancelSubscription({
        data: { subscriptionId: sub.paddle_subscription_id, atPeriodEnd: true },
      });
      toast.success("Subscription will cancel at period end");
      subQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setCanceling(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Current plan */}
      <section className="rounded-lg border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-gray-500">Current plan</h2>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {currentCfg.name}
            </p>
            <p className="mt-1 text-xs text-gray-500">{currentCfg.description}</p>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              sub?.status === "active" || sub?.status === "trialing"
                ? "bg-green-50 text-green-700"
                : sub?.status === "canceled" || sub?.status === "paused"
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-gray-100 text-gray-700"
            }`}
          >
            {sub?.status ?? "free"}
          </span>
        </div>
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          {sub?.billing_cycle && (
            <div>
              <dt className="text-gray-500">Billing cycle</dt>
              <dd className="mt-0.5 font-medium text-gray-900 capitalize">
                {sub.billing_cycle}
              </dd>
            </div>
          )}
          {sub?.current_period_end && (
            <div>
              <dt className="text-gray-500">
                {sub.cancel_at_period_end ? "Ends on" : "Renews on"}
              </dt>
              <dd className="mt-0.5 font-medium text-gray-900">
                {new Date(sub.current_period_end).toLocaleDateString()}
              </dd>
            </div>
          )}
          {sub?.paddle_customer_id && (
            <div>
              <dt className="text-gray-500">Customer ID</dt>
              <dd className="mt-0.5 font-mono text-[11px] text-gray-700 break-all">
                {sub.paddle_customer_id}
              </dd>
            </div>
          )}
          {sub?.paddle_subscription_id && (
            <div>
              <dt className="text-gray-500">Subscription ID</dt>
              <dd className="mt-0.5 font-mono text-[11px] text-gray-700 break-all">
                {sub.paddle_subscription_id}
              </dd>
            </div>
          )}
        </dl>
        {sub?.paddle_subscription_id && !sub.cancel_at_period_end && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={canceling}
            className="mt-4 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {canceling ? "Canceling…" : "Cancel subscription"}
          </button>
        )}
      </section>

      {/* Upgrade options */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">Change plan</h2>
          <div className="flex items-center gap-1 rounded-md border border-gray-200 p-1 text-xs">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={`rounded px-2 py-1 font-medium ${
                cycle === "monthly" ? "bg-gray-900 text-white" : "text-gray-500"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("yearly")}
              className={`rounded px-2 py-1 font-medium ${
                cycle === "yearly" ? "bg-gray-900 text-white" : "text-gray-500"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((k) => {
            const p = PLANS[k];
            const isCurrent = k === currentPlan;
            const price =
              k === "enterprise"
                ? "Custom"
                : p.priceMonthly === 0
                  ? "$0"
                  : cycle === "monthly"
                    ? `$${p.priceMonthly}`
                    : `$${p.priceYearly}`;
            return (
              <div
                key={k}
                className={`flex flex-col rounded-lg border p-4 ${
                  isCurrent ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"
                }`}
              >
                <h3 className="text-sm font-semibold text-gray-900">{p.name}</h3>
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {price}
                  {k !== "enterprise" && p.priceMonthly > 0 && (
                    <span className="text-xs font-normal text-gray-500">
                      /{cycle === "monthly" ? "mo" : "yr"}
                    </span>
                  )}
                </div>
                <ul className="mt-3 flex-1 space-y-1 text-xs text-gray-600">
                  {p.features.slice(0, 5).map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="mt-4 rounded-md bg-gray-100 px-3 py-2 text-center text-xs font-medium text-gray-500">
                    Current
                  </div>
                ) : (
                  <PlanCheckoutButton
                    plan={k}
                    cycle={cycle}
                    className="mt-4 w-full rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
                  >
                    {k === "enterprise" ? "Request demo" : `Choose ${p.name}`}
                  </PlanCheckoutButton>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Invoice history */}
      <section>
        <h2 className="text-sm font-medium text-gray-900">Invoice history</h2>
        {invoicesQuery.isLoading ? (
          <p className="mt-2 text-xs text-gray-500">Loading…</p>
        ) : invoices.length === 0 ? (
          <p className="mt-2 text-xs text-gray-500">No invoices yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((tx) => {
                  const details = tx.details as
                    | { totals?: { total?: string; currency_code?: string } }
                    | undefined;
                  return (
                    <tr key={String(tx.id)}>
                      <td className="px-3 py-2 text-gray-700">
                        {tx.billed_at
                          ? new Date(String(tx.billed_at)).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {details?.totals?.total ?? "—"}{" "}
                        {details?.totals?.currency_code ?? ""}
                      </td>
                      <td className="px-3 py-2 text-gray-700 capitalize">
                        {String(tx.status ?? "—")}
                      </td>
                      <td className="px-3 py-2">
                        {tx.invoice_id ? (
                          <span className="font-mono text-[11px] text-gray-500">
                            {String(tx.invoice_id)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}