import Stripe from "stripe";

const STRIPE_API_VERSION = "2024-06-20" as unknown as Stripe.LatestApiVersion;

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function resolveStripeSecretKey(): string {
  return isProductionRuntime()
    ? requireEnv("STRIPE_SECRET_KEY")
    : requireEnv("STRIPE_TEST_SECRET_KEY");
}

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(resolveStripeSecretKey(), {
      apiVersion: STRIPE_API_VERSION,
    });
  }
  return stripeInstance;
}

export const stripeClient: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const stripe = getStripe();
    const value = Reflect.get(stripe, prop, stripe);
    if (typeof value === "function") {
      return value.bind(stripe);
    }
    return value;
  },
});
