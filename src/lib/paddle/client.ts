/**
 * Browser Paddle.js loader + checkout helper.
 * Only called from client components (pricing/billing pages).
 */
import { PADDLE_CLIENT_TOKEN, PADDLE_ENV, type PlanKey, type BillingCycle } from "./config";

type PaddleInstance = {
  Checkout: {
    open: (opts: Record<string, unknown>) => void;
    close: () => void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleInstance & {
      Environment: { set: (env: string) => void };
      Setup: (opts: Record<string, unknown>) => void;
      Initialize?: (opts: Record<string, unknown>) => void;
    };
  }
}

let loadingPromise: Promise<PaddleInstance> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export function loadPaddle(): Promise<PaddleInstance> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Paddle can only be loaded in the browser"));
  }
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    await loadScript("https://cdn.paddle.com/paddle/v2/paddle.js");
    const Paddle = window.Paddle;
    if (!Paddle) throw new Error("Paddle.js failed to initialize");
    if (PADDLE_ENV === "sandbox") Paddle.Environment.set("sandbox");
    // Paddle v2 API: Initialize (preferred) with fallback to Setup for older loads.
    const init = Paddle.Initialize ?? Paddle.Setup;
    init.call(Paddle, { token: PADDLE_CLIENT_TOKEN });
    return Paddle;
  })();

  return loadingPromise;
}

export interface OpenCheckoutOptions {
  priceId: string;
  customerEmail?: string;
  companyId: string;
  userId: string;
  plan: PlanKey;
  cycle: BillingCycle;
  successUrl?: string;
}

export async function openCheckout(opts: OpenCheckoutOptions): Promise<void> {
  const Paddle = await loadPaddle();
  Paddle.Checkout.open({
    items: [{ priceId: opts.priceId, quantity: 1 }],
    customer: opts.customerEmail ? { email: opts.customerEmail } : undefined,
    customData: {
      company_id: opts.companyId,
      user_id: opts.userId,
      plan: opts.plan,
      cycle: opts.cycle,
    },
    settings: {
      displayMode: "overlay",
      theme: "light",
      successUrl: opts.successUrl ?? `${window.location.origin}/settings?tab=billing`,
    },
  });
}