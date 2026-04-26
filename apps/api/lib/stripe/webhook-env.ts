/**
 * Secretos de firma de webhooks Stripe: Live vs Test según NODE_ENV.
 * Live (producción): STRIPE_WEBHOOK_SECRET
 * No producción: solo STRIPE_WEBHOOK_SECRET_TEST (modo Test en Stripe Dashboard)
 */

export function isStripeWebhookProductionMode(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Secreto del endpoint de webhook (`whsec_...`) para `constructEvent`.
 */
export function resolveStripeWebhookEndpointSecret(): string | null {
  if (isStripeWebhookProductionMode()) {
    const live = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    return live && live.length > 0 ? live : null;
  }
  const test = process.env.STRIPE_WEBHOOK_SECRET_TEST?.trim();
  return test && test.length > 0 ? test : null;
}
