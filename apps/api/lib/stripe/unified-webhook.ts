import type Stripe from 'stripe';
import { z } from 'zod';
import { HTTP_STATUS } from '../constants';
import { logger } from '../logger';
import { getServiceClient } from '../supabase';
import { provisionTenant, suspendTenant } from '../orchestrator';
import { notifyInvoicePaymentFailed, notifyStripeWebhookCritical } from '../notifications';
import { getDunningService } from '../billing/dunning-service';

const planSchema = z.enum(['startup', 'business', 'enterprise', 'demo']);

const PLAN_TO_BILLING_PLAN: Record<string, string> = {
  startup: 'opsly-basic',
  business: 'opsly-pro',
  enterprise: 'opsly-enterprise',
  demo: 'opsly-basic',
};

const MS_PER_SECOND = 1000;

function getStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | undefined {
  if (customer === null) return undefined;
  if (typeof customer === 'string') return customer;
  if ('deleted' in customer && customer.deleted) return undefined;
  return customer.id;
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

async function resolveTenantByCustomerId(
  customerId: string
): Promise<{ id: string; slug: string } | null> {
  const { data, error } = await getServiceClient()
    .schema('platform')
    .from('tenants')
    .select('id, slug')
    .eq('stripe_customer_id', customerId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    logger.error('resolveTenantByCustomerId', error);
    return null;
  }
  return data as { id: string; slug: string } | null;
}

async function resolveTenantIdForSubscription(
  sub: Stripe.Subscription
): Promise<string | undefined> {
  if (typeof sub.metadata?.tenant_id === 'string') {
    return sub.metadata.tenant_id;
  }
  const customerId = getStripeCustomerId(sub.customer);
  if (customerId === undefined) return undefined;
  const row = await resolveTenantByCustomerId(customerId);
  return row?.id;
}

function toIsoDate(ts: number | null | undefined): string | null {
  if (ts === undefined || ts === null) return null;
  return new Date(ts * MS_PER_SECOND).toISOString();
}

function toIsoDateShort(ts: number | null | undefined): string | null {
  if (ts === undefined || ts === null) return null;
  return new Date(ts * MS_PER_SECOND).toISOString().slice(0, 10);
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

// ─── Legacy subscriptions table (platform.subscriptions) ──────────

async function upsertLegacySubscription(
  tenantId: string,
  eventId: string,
  sub: Stripe.Subscription
): Promise<boolean> {
  const planMeta = sub.metadata?.plan ?? null;
  const db = getServiceClient();
  const { error } = await db
    .schema('platform')
    .from('subscriptions')
    .insert({
      tenant_id: tenantId,
      stripe_event_id: eventId,
      stripe_status: sub.status,
      current_period_end: toIsoDate(sub.current_period_end),
      plan: planMeta,
    });

  if (!error) return true;
  if (error.code === '23505') return true;
  logger.error('legacy subscription insert', error);
  return false;
}

async function updateLegacySubscriptionLastInvoice(
  tenantId: string,
  invoice: Stripe.Invoice
): Promise<void> {
  const db = getServiceClient();
  const { error } = await db
    .schema('platform')
    .from('subscriptions')
    .update({
      last_invoice_pdf: invoice.invoice_pdf ?? null,
      last_invoice_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    logger.error('legacy subscription last_invoice update', error);
  }
}

// ─── New billing_subscriptions table ──────────────────────────────

type BillingSubscriptionInsert = {
  tenant_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: string;
  billing_period: string;
  amount_cents: number;
  currency: string;
  current_period_start: string | null;
  current_period_end: string | null;
  auto_renew: boolean;
};

async function upsertBillingSubscription(
  tenantId: string,
  sub: Stripe.Subscription,
  customerId: string | null,
  planId: string
): Promise<void> {
  const db = getServiceClient();
  const existing = await db
    .schema('platform')
    .from('billing_subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const insert: Partial<BillingSubscriptionInsert> = {
    tenant_id: tenantId,
    plan_id: planId,
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerId,
    status: mapStripeStatus(sub.status),
    billing_period: 'monthly',
    amount_cents: sub.items?.data?.[0]?.price?.unit_amount ?? 0,
    currency: (sub.items?.data?.[0]?.price?.currency ?? 'usd').toUpperCase(),
    current_period_start: toIsoDateShort(sub.current_period_start),
    current_period_end: toIsoDateShort(sub.current_period_end),
    auto_renew: !sub.cancel_at_period_end,
  };

  if (existing?.data) {
    const { error } = await db
      .schema('platform')
      .from('billing_subscriptions')
      .update(insert)
      .eq('tenant_id', tenantId);

    if (error) {
      logger.error('billing_subscriptions update', error);
    }
  } else {
    const { error } = await db.schema('platform').from('billing_subscriptions').insert(insert);

    if (error && error.code !== '23505') {
      logger.error('billing_subscriptions insert', error);
    }
  }
}

// ─── Invoices table ───────────────────────────────────────────────

async function upsertInvoice(
  tenantId: string,
  invoice: Stripe.Invoice,
  status: string
): Promise<void> {
  const db = getServiceClient();
  const totalCents = invoice.amount_paid ?? invoice.amount_due ?? 0;
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await db
    .schema('platform')
    .from('invoices')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();

  const payload = {
    tenant_id: tenantId,
    invoice_number: `STRIPE-${invoice.number ?? invoice.id}`,
    customer_email: invoice.customer_email ?? '',
    status,
    subtotal_cents: totalCents,
    total_cents: totalCents,
    currency: (invoice.currency ?? 'usd').toUpperCase(),
    issue_date: today,
    paid_date: status === 'paid' ? today : null,
    stripe_invoice_id: invoice.id,
    pdf_storage_path: invoice.invoice_pdf ?? null,
  };

  if (existing) {
    const { error } = await db
      .schema('platform')
      .from('invoices')
      .update({ status, paid_date: status === 'paid' ? today : null })
      .eq('stripe_invoice_id', invoice.id);

    if (error) {
      logger.error('invoice update', error);
    }
  } else {
    const { error } = await db.schema('platform').from('invoices').insert(payload);

    if (error) {
      logger.error('invoice insert', error);
    }
  }
}

// ─── Sync logs ────────────────────────────────────────────────────

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

// ─── Event handlers ───────────────────────────────────────────────

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const md = session.metadata ?? {};
  const slug = md.tenant_slug;
  const email = md.email;
  const planRaw = md.plan;

  if (!slug || !email || !planRaw) {
    logger.error('checkout.session.completed missing metadata', { slug, email, planRaw });
    return;
  }

  const planParsed = planSchema.safeParse(planRaw);
  if (!planParsed.success) {
    logger.error('checkout.session.completed invalid plan', { plan: planRaw });
    return;
  }

  const customerId = getStripeCustomerId(session.customer);

  await provisionTenant({
    slug,
    owner_email: email,
    plan: planParsed.data,
    stripe_customer_id: customerId,
  });
}

async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  const tenantId = await resolveTenantIdForSubscription(sub);

  if (tenantId === undefined) {
    logger.error('customer.subscription.updated could not resolve tenant_id');
    return;
  }

  const customerId = extractCustomerId(sub.customer);
  const planMeta = sub.metadata?.plan;
  const planId =
    typeof planMeta === 'string' && PLAN_TO_BILLING_PLAN[planMeta]
      ? PLAN_TO_BILLING_PLAN[planMeta]
      : 'opsly-basic';

  const inserted = await upsertLegacySubscription(tenantId, event.id, sub);
  if (!inserted) return;

  await upsertBillingSubscription(tenantId, sub, customerId, planId);

  const db = getServiceClient();
  const { error: tenantError } = await db
    .schema('platform')
    .from('tenants')
    .update({ stripe_subscription_id: sub.id })
    .eq('id', tenantId);

  if (tenantError) {
    logger.error('tenant subscription id update', tenantError);
  }

  const validPlans = ['startup', 'business', 'enterprise'] as const;
  if (validPlans.includes(planMeta as (typeof validPlans)[number])) {
    const { error: planError } = await db
      .schema('platform')
      .from('tenants')
      .update({ plan: planMeta })
      .eq('id', tenantId);

    if (planError) {
      logger.error('subscription.updated syncTenantPlan', planError);
    }
  }

  if (sub.status === 'active') {
    const { error: resumeError } = await db
      .schema('platform')
      .from('tenants')
      .update({ status: 'active' })
      .eq('id', tenantId)
      .eq('status', 'suspended');

    if (resumeError) {
      logger.error('tenant resume on subscription active', resumeError);
    }
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const db = getServiceClient();
  const { error } = await db
    .schema('platform')
    .from('billing_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id);

  if (error) {
    logger.error('billing_subscriptions cancelled', error);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = extractCustomerId(invoice.customer);
  if (!customerId) return;

  const tenant = await resolveTenantByCustomerId(customerId);
  if (!tenant) return;

  const db = getServiceClient();

  if (invoice.subscription) {
    const subId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
    const periodEnd = invoice.period_end
      ? new Date(invoice.period_end * MS_PER_SECOND).toISOString()
      : null;

    await db
      .schema('platform')
      .from('billing_subscriptions')
      .update({
        status: 'active',
        current_period_end: periodEnd ? periodEnd.slice(0, 10) : null,
      })
      .eq('stripe_subscription_id', subId);
  }

  await updateLegacySubscriptionLastInvoice(tenant.id, invoice);
  await upsertInvoice(tenant.id, invoice, 'paid');
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = extractCustomerId(invoice.customer);
  if (!customerId) {
    logger.error('invoice.payment_failed missing customer');
    return;
  }

  const tenant = await resolveTenantByCustomerId(customerId);
  if (!tenant) {
    logger.error('invoice.payment_failed tenant not found', { customerId });
    return;
  }

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

  if (invoice.id) {
    await upsertInvoice(tenant.id, invoice, 'overdue');
  }

  const dunning = getDunningService();
  await dunning.recordPaymentFailure(tenant.id, tenant.slug);

  const status = await dunning.getDunningStatus(tenant.id);

  if (status.shouldSuspend) {
    try {
      await suspendTenant(tenant.id, 'stripe-webhook-dunning');
    } catch (e) {
      logger.error('invoice.payment_failed suspend', e instanceof Error ? e : { error: String(e) });
    }
  }

  try {
    await notifyInvoicePaymentFailed(tenant.slug, invoice.id);
  } catch (e) {
    logger.error('invoice.payment_failed discord', e instanceof Error ? e : { error: String(e) });
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = extractCustomerId(invoice.customer);
  if (!customerId) return;

  const tenant = await resolveTenantByCustomerId(customerId);
  if (!tenant) return;

  await updateLegacySubscriptionLastInvoice(tenant.id, invoice);
  await upsertInvoice(tenant.id, invoice, 'paid');

  const dunning = getDunningService();
  await dunning.clearFailures(tenant.id);
}

// ─── Dispatcher ───────────────────────────────────────────────────

export async function dispatchStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      return;
    }
    case 'customer.subscription.updated': {
      await handleSubscriptionUpdated(event);
      return;
    }
    case 'customer.subscription.deleted': {
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      return;
    }
    case 'invoice.paid':
    case 'invoice.payment_succeeded': {
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      return;
    }
    case 'invoice.payment_failed': {
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      return;
    }
    default:
      return;
  }
}

// ─── POST handler helper (used by both webhook routes) ────────────

import { constructWebhookEvent } from './index';
import { resolveStripeWebhookEndpointSecret } from './webhook-env';

export async function handleStripeWebhookPost(request: Request): Promise<Response> {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (e) {
    logger.error(
      'stripe webhook failed to read body',
      e instanceof Error ? e : { error: String(e) }
    );
    return Response.json({ error: 'body_read_failed' }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }

  const endpointSecret = resolveStripeWebhookEndpointSecret();
  if (!endpointSecret) {
    logger.error('stripe webhook endpoint secret not configured');
    return Response.json(
      { error: 'webhook_not_configured' },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }

  const signature = request.headers.get('stripe-signature');
  const event = constructWebhookEvent(rawBody, signature, endpointSecret);
  if (!event) {
    logger.error('stripe webhook signature verification failed');
    return Response.json({ error: 'invalid_signature' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  try {
    await dispatchStripeEvent(event);
    await logStripeSync(event, 'success');
  } catch (e) {
    const errPayload = e instanceof Error ? e : { error: String(e) };
    logger.error('stripe webhook dispatch error', errPayload);
    const msg = e instanceof Error ? e.message : String(e);
    const slug =
      event.type === 'checkout.session.completed'
        ? (event.data.object as Stripe.Checkout.Session).metadata?.tenant_slug
        : undefined;
    await notifyStripeWebhookCritical(event.type, msg, slug);
    if (event.type === 'checkout.session.completed') {
      return Response.json({ error: 'processing_failed' }, { status: HTTP_STATUS.INTERNAL_ERROR });
    }
  }

  return Response.json({ received: true }, { status: HTTP_STATUS.OK });
}
