import { useState } from "react";
import type { Settings } from "@/hooks/useSettings";

interface UpgradeSettingsFormProps {
  settings: Settings;
  saving: boolean;
  onSave: (patch: Partial<Settings>) => void;
}

type PlanId = "free" | "professional" | "business" | "enterprise";
type BillingProvider = "paddle" | "razorpay";

interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: string;
  period?: string;
  features: string[];
  cta: string;
  href?: string; // used for enterprise/contact-sales style plans
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "For individuals and small businesses getting started.",
    price: "$0",
    period: "/month",
    features: [
      "Basic accounting",
      "Invoice creation",
      "Expense tracking",
      "Customer management",
      "Basic reports",
    ],
    cta: "Start Free",
  },
  {
    id: "professional",
    name: "Professional",
    description:
      "Designed for growing businesses that need collaboration, automation, inventory, and advanced reporting.",
    price: "$19",
    period: "/month",
    features: [
      "Everything in Free",
      "Up to 3 Companies",
      "Up to 10 Team Members",
      "Inventory Management",
      "Purchase Orders",
      "Bank Reconciliation",
      "Advanced Reports",
      "Role-Based Permissions",
      "Priority Email Support",
    ],
    cta: "Start Professional",
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    description:
      "Built for established businesses managing multiple departments, users, and companies.",
    price: "$49",
    period: "/month",
    features: [
      "Everything in Professional",
      "Up to 15 Companies",
      "Unlimited Team Members",
      "Payroll",
      "CRM",
      "Projects",
      "Audit Logs",
      "Advanced Analytics",
      "API Access",
      "Priority Support",
    ],
    cta: "Contact Sales",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description:
      "Tailored solutions for organizations requiring custom deployments, integrations, and enterprise support.",
    price: "Custom",
    features: [
      "Unlimited Companies",
      "Unlimited Users",
      "Dedicated Account Manager",
      "Custom Integrations",
      "Advanced Security",
      "Priority Infrastructure",
      "Migration Assistance",
      "Training",
      "SLA Options",
      "Enterprise Support",
    ],
    cta: "Request a Demo",
    href: "https://freeflow-accounts.vercel.app/contact",
  },
];

export function UpgradeSettingsForm({ settings, saving }: UpgradeSettingsFormProps) {
  const currentPlan = (settings.plan as PlanId) ?? "free";
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<PlanId | null>(null);
  const [provider, setProvider] = useState<BillingProvider>("paddle");

  const handleUpgrade = async (plan: Plan) => {
    // Enterprise / contact-sales style plans just navigate out
    if (plan.href) {
      window.open(plan.href, "_blank", "noopener,noreferrer");
      return;
    }

    // Free plan (or downgrading to it) usually just updates the record directly,
    // no checkout needed
    if (plan.id === "free") {
      // TODO: call your API to downgrade the subscription
      return;
    }

    setCheckoutLoadingPlan(plan.id);
    try {
      if (provider === "paddle") {
        // TODO: wire up Paddle checkout
        // Example shape once Paddle.js is loaded:
        // window.Paddle.Checkout.open({
        //   items: [{ priceId: PADDLE_PRICE_IDS[plan.id], quantity: 1 }],
        //   customer: { email: settings.billingEmail },
        //   settings: { successUrl: window.location.href },
        // });
        console.log("Open Paddle checkout for", plan.id);
      } else {
        // TODO: wire up Razorpay checkout
        // Typical flow: create an order server-side, then open Razorpay Checkout:
        // const order = await fetch("/api/razorpay/create-order", {
        //   method: "POST",
        //   body: JSON.stringify({ planId: plan.id }),
        // }).then((r) => r.json());
        // const rzp = new window.Razorpay({
        //   key: RAZORPAY_KEY_ID,
        //   order_id: order.id,
        //   amount: order.amount,
        //   currency: order.currency,
        //   handler: (response) => {
        //     // verify payment server-side, then refresh settings
        //   },
        // });
        // rzp.open();
        console.log("Open Razorpay checkout for", plan.id);
      }
    } finally {
      setCheckoutLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-gray-900">Plans designed for every stage</h2>
          <p className="mt-1 text-sm text-gray-500">
            You're currently on the{" "}
            <span className="font-medium text-gray-900">
              {PLANS.find((p) => p.id === currentPlan)?.name ?? "Free"}
            </span>{" "}
            plan.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-gray-200 p-1 text-xs">
          <button
            type="button"
            onClick={() => setProvider("paddle")}
            className={`rounded px-2 py-1 font-medium transition-colors ${
              provider === "paddle" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Paddle
          </button>
          <button
            type="button"
            onClick={() => setProvider("razorpay")}
            className={`rounded px-2 py-1 font-medium transition-colors ${
              provider === "razorpay" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Razorpay
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isLoading = checkoutLoadingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-lg border p-4 ${
                isCurrent ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-2 left-4 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white">
                  Most Popular
                </span>
              )}

              <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-1 text-xs text-gray-500">{plan.description}</p>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-lg font-semibold text-gray-900">{plan.price}</span>
                {plan.period && <span className="text-xs text-gray-500">{plan.period}</span>}
              </div>

              <ul className="mt-3 flex-1 space-y-1.5 text-xs text-gray-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-1.5">
                    <span className="text-gray-400">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={saving || isCurrent || isLoading}
                onClick={() => handleUpgrade(plan)}
                className={`mt-4 w-full rounded-md px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                  isCurrent
                    ? "bg-gray-100 text-gray-500"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                {isCurrent ? "Current plan" : isLoading ? "Loading…" : plan.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
