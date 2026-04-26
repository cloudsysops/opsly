import Stripe from 'stripe';

/**
 * Versión API Stripe (dashboard + requests). Tipado del SDK usa LatestApiVersion;
 * se fija la cadena pedida para producción (ver docs Stripe versioning).
 */
const STRIPE_API_VERSION = '2024-06-20' as unknown as Stripe.LatestApiVersion;

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

/**
 * Clave secreta API: Live en `NODE_ENV=production`, Test en el resto.
 * Sin fallback cruzado para evitar cargos Live desde entornos de desarrollo.
 */
function resolveStripeSecretKey(): string {
  return isProductionRuntime()
    ? requireEnv('STRIPE_SECRET_KEY')
    : requireEnv('STRIPE_TEST_SECRET_KEY');
}

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  stripeInstance ??= new Stripe(resolveStripeSecretKey(), {
    apiVersion: STRIPE_API_VERSION,
  });
  return stripeInstance;
}
