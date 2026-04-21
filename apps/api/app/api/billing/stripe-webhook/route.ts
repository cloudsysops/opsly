import type Stripe from 'stripe';
import { HTTP_STATUS } from '../../../../lib/constants';
import { logger } from '../../../../lib/logger';
import { constructWebhookEvent } from '../../../../lib/stripe';
import { resolveStripeWebhookEndpointSecret } from '../../../../lib/stripe/webhook-env';
import { getServiceClient } from '../../../../lib/supabase';

const UNIX_MS_MULTIPLIER = 1000;
const DATE_ISO_SLICE = 10;

/**
 * POST /api/billing/stripe-webhook
 *
 * Billing-specific Stripe webhook handler.
 * Syncs invoice.paid, invoice.payment_failed, customer.subscription.updated
 * to platform.invoices and platform.billing_subscriptions.
 */
export async function POST(request: Request): Promise<Response> {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return Response.json({ error: 'body_read_failed' }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }

  const endpointSecret = resolveStripeWebhookEndpointSecret();
  if (!endpointSecret) {
    logger.error('billing stripe-webhook: endpoint secret not configured');
    return Response.json({ error: 'not_configured' }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }

  const signature = request.headers.get('stripe-signature');
  const event = constructWebhookEvent(rawBody, signature, endpointSecret);
  if (!event) {
    return Response.json({ error: 'invalid_signature' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  try {
    await dispatchBillingEvent(event);
    await logStripeSync(event, 'success');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('billing stripe-webhook dispatch', { type: event.type, error: msg });
    await logStripeSync(event, 'failed', msg);
    return Response.json({ error: 'processing_failed' }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }

  return Response.json({ received: true });
}

async function dispatchBillingEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'invoice.paid': {
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      return;
    }
    case 'invoice.payment_failed': {
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      return;
    }
    case 'customer.subscription.updated': {
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      return;
    }
    case 'customer.subscription.deleted': {
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      return;
    }
    default:
      return;
  }
}

function extractCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (typeof customer === 'string') return customer;
  if (customer && 'id' in customer && !('deleted' in customer && customer.deleted)) {
    return customer.id;
  }
  return null;
}

async function resolveTenantByStripeCustomer(
  customerId: string
): Promise<{ id: string; slug: string } | null> {
  const { data } = await getServiceClient()
    .schema('platform')
    .from('tenants')
    .select('id, slug')
    .eq('stripe_customer_id', customerId)
    .is('deleted_at', null)
    .maybeSingle();
  return data as { id: string; slug: string } | null;
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = extractCustomerId(invoice.customer);
  if (!customerId) return;

  const tenant = await resolveTenantByStripeCustomer(customerId);
  if (!tenant) return;

  const db = getServiceClient();
  await markSubscriptionActive(db, invoice);

  const { data: existing } = await db
    .schema('platform')
    .from('invoices')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();

  if (!existing) {
    await insertPaidInvoice(db, tenant.id, invoice);
    return;
  }

  await db
    .schema('platform')
    .from('invoices')
    .update({ status: 'paid', paid_date: new Date().toISOString().slice(0, DATE_ISO_SLICE) })
    .eq('stripe_invoice_id', invoice.id);
}

async function markSubscriptionActive(
  db: ReturnType<typeof getServiceClient>,
  invoice: Stripe.Invoice
): Promise<void> {
  if (!invoice.subscription) return;
  const subId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
  const periodEnd = invoice.period_end
    ? new Date(invoice.period_end * UNIX_MS_MULTIPLIER).toISOString().slice(0, DATE_ISO_SLICE)
    : null;

  await db
    .schema('platform')
    .from('billing_subscriptions')
    .update({
      status: 'active',
      current_period_end: periodEnd,
    })
    .eq('stripe_subscription_id', subId);
}

async function insertPaidInvoice(
  db: ReturnType<typeof getServiceClient>,
  tenantId: string,
  invoice: Stripe.Invoice
): Promise<void> {
  const totalCents = invoice.amount_paid ?? 0;
  const today = new Date().toISOString().slice(0, DATE_ISO_SLICE);

  await db
    .schema('platform')
    .from('invoices')
    .insert({
      tenant_id: tenantId,
      invoice_number: `STRIPE-${invoice.number ?? invoice.id}`,
      customer_email: invoice.customer_email ?? '',
      status: 'paid',
      subtotal_cents: totalCents,
      total_cents: totalCents,
      currency: (invoice.currency ?? 'cop').toUpperCase(),
      issue_date: today,
      paid_date: today,
      stripe_invoice_id: invoice.id,
      pdf_storage_path: invoice.invoice_pdf ?? null,
    });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = extractCustomerId(invoice.customer);
  if (!customerId) return;

  const tenant = await resolveTenantByStripeCustomer(customerId);
  if (!tenant) return;

  // Mark subscription as past_due
  const db = getServiceClient();
  if (invoice.subscription) {
    const subId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
    await db
      .schema('platform')
      .from('billing_subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_subscription_id', subId);
  }

  // Update invoice status if synced
  if (invoice.id) {
    await db
      .schema('platform')
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('stripe_invoice_id', invoice.id);
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const customerId = extractCustomerId(sub.customer);
  if (!customerId) return;

  const db = getServiceClient();
  const periodStart = sub.current_period_start
    ? new Date(sub.current_period_start * UNIX_MS_MULTIPLIER).toISOString().slice(0, DATE_ISO_SLICE)
    : null;
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * UNIX_MS_MULTIPLIER).toISOString().slice(0, DATE_ISO_SLICE)
    : null;

  await db
    .schema('platform')
    .from('billing_subscriptions')
    .update({
      status: mapStripeStatus(sub.status),
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      auto_renew: !sub.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', sub.id);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const db = getServiceClient();
  await db
    .schema('platform')
    .from('billing_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id);
}

function mapStripeStatus(status: string): string {
  const mapping: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    trialing: 'trialing',
    paused: 'paused',
  };
  return mapping[status] ?? 'active';
}

async function logStripeSync(
  event: Stripe.Event,
  status: 'success' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    await getServiceClient()
      .schema('platform')
      .from('stripe_sync_logs')
      .insert({
        event_type: event.type,
        stripe_object_id: (event.data.object as { id?: string }).id ?? null,
        status,
        error_message: errorMessage ?? null,
      });
  } catch {
    // Non-blocking
  }
}
