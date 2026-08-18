import type { Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function isPaymentsEnabled(): boolean {
  return !!clientToken;
}

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  return "sandbox";
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) {
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = import("@stripe/stripe-js").then(({ loadStripe }) => loadStripe(clientToken));
    }
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

export function isPaymentsTestMode(): boolean {
  return clientToken?.startsWith("pk_test_") ?? false;
}
