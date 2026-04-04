import Stripe from "stripe";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
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
