import type Stripe from "stripe";
import { z } from "zod";
import { HTTP_STATUS } from "../../../../lib/constants";
import { logger } from "../../../../lib/logger";
import {
    notifyInvoicePaymentFailed,
    notifyStripeWebhookCritical,
} from "../../../../lib/notifications";
import { provisionTenant, suspendTenant } from "../../../../lib/orchestrator";
import { constructWebhookEvent } from "../../../../lib/stripe";
import { resolveStripeWebhookEndpointSecret } from "../../../../lib/stripe/webhook-env";
import { getServiceClient } from "../../../../lib/supabase";
const planSchema = z.enum(["startup", "business", "enterprise", "demo"]);

function getStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | undefined {
  if (customer === null) {
    return undefined;
  }
  if (typeof customer === "string") {
    return customer;
  }
  if ("deleted" in customer && customer.deleted) {
    return undefined;
  }
  return customer.id;
}

async function resolveTenantIdByCustomerId(customerId: string): Promise<{
  id: string;
  slug: string;
} | null> {
  const { data, error } = await getServiceClient()
    .schema("platform")
    .from("tenants")
    .select("id, slug")
    .eq("stripe_customer_id", customerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    logger.error("resolveTenantByCustomer", error);
    return null;
  }
  if (!data) {
    return null;
  }
  return data;
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const md = session.metadata ?? {};
  const slug = md.tenant_slug;
  const email = md.email;
  const planRaw = md.plan;

  if (!slug || !email || !planRaw) {
    logger.error("checkout.session.completed missing metadata", {
      slug,
      email,
      planRaw,
    });
    return;
  }

  const planParsed = planSchema.safeParse(planRaw);
  if (!planParsed.success) {
    logger.error("checkout.session.completed invalid plan", { plan: planRaw });
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

const MS_PER_SECOND = 1000;

async function resolveTenantIdForSubscription(
  sub: Stripe.Subscription,
): Promise<string | undefined> {
  if (typeof sub.metadata?.tenant_id === "string") {
    return sub.metadata.tenant_id;
  }
  const customerId = getStripeCustomerId(sub.customer);
  if (customerId === undefined) {
    return undefined;
  }
  const row = await resolveTenantIdByCustomerId(customerId);
  return row?.id;
}

async function upsertSubscriptionRow(
  tenantId: string,
  event: Stripe.Event,
  sub: Stripe.Subscription,
): Promise<boolean> {
  const periodEnd =
    sub.current_period_end !== undefined && sub.current_period_end !== null
      ? new Date(sub.current_period_end * MS_PER_SECOND).toISOString()
      : null;

  const planMeta = sub.metadata?.plan ?? null;
  const db = getServiceClient();
  const { error: insertError } = await db
    .schema("platform")
    .from("subscriptions")
    .insert({
      tenant_id: tenantId,
      stripe_event_id: event.id,
      stripe_status: sub.status,
      current_period_end: periodEnd,
      plan: planMeta,
    });

  if (!insertError) {
    return true;
  }
  if (insertError.code === "23505") {
    return true;
  }
  logger.error("subscriptions insert", insertError);
  return false;
}

async function attachStripeSubscriptionToTenant(
  tenantId: string,
  subscriptionId: string,
): Promise<void> {
  const db = getServiceClient();
  const { error: tenantError } = await db
    .schema("platform")
    .from("tenants")
    .update({ stripe_subscription_id: subscriptionId })
    .eq("id", tenantId);

  if (tenantError) {
    logger.error("tenant subscription id update", tenantError);
  }
}

const VALID_PLANS = ["startup", "business", "enterprise"] as const;
type UpgradablePlan = (typeof VALID_PLANS)[number];

function isValidPlan(p: unknown): p is UpgradablePlan {
  return VALID_PLANS.includes(p as UpgradablePlan);
}

async function syncTenantPlanFromSubscription(
  tenantId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  const rawPlan = sub.metadata?.plan;
  if (!isValidPlan(rawPlan)) {
    return;
  }
  const db = getServiceClient();
  const { error } = await db
    .schema("platform")
    .from("tenants")
    .update({ plan: rawPlan })
    .eq("id", tenantId);
  if (error) {
    logger.error("subscription.updated syncTenantPlan", error);
  }
}

async function handleCustomerSubscriptionUpdated(
  event: Stripe.Event,
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  const tenantId = await resolveTenantIdForSubscription(sub);

  if (tenantId === undefined) {
    logger.error("customer.subscription.updated could not resolve tenant_id");
    return;
  }

  const inserted = await upsertSubscriptionRow(tenantId, event, sub);
  if (!inserted) {
    return;
  }

  await attachStripeSubscriptionToTenant(tenantId, sub.id);
  await syncTenantPlanFromSubscription(tenantId, sub);
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId = getStripeCustomerId(invoice.customer);
  if (!customerId) {
    return;
  }
  const row = await resolveTenantIdByCustomerId(customerId);
  if (!row) {
    return;
  }
  const db = getServiceClient();
  const pdfUrl = invoice.invoice_pdf ?? null;
  const { error } = await db
    .schema("platform")
    .from("subscriptions")
    .update({ last_invoice_pdf: pdfUrl, last_invoice_at: new Date().toISOString() })
    .eq("tenant_id", row.id)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    logger.error("invoice.payment_succeeded update subscriptions", error);
  }
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId = getStripeCustomerId(invoice.customer);
  if (!customerId) {
    logger.error("invoice.payment_failed missing customer");
    return;
  }

  const row = await resolveTenantIdByCustomerId(customerId);
  if (!row) {
    logger.error("invoice.payment_failed tenant not found", { customerId });
    return;
  }

  try {
    await suspendTenant(row.id, "stripe-webhook");
  } catch (e) {
    logger.error(
      "invoice.payment_failed suspend",
      e instanceof Error ? e : { error: String(e) },
    );
  }

  try {
    await notifyInvoicePaymentFailed(row.slug, invoice.id);
  } catch (e) {
    logger.error(
      "invoice.payment_failed discord",
      e instanceof Error ? e : { error: String(e) },
    );
  }
}

function tenantSlugFromCheckoutEvent(event: Stripe.Event): string | undefined {
  if (event.type !== "checkout.session.completed") {
    return undefined;
  }
  const session = event.data.object as Stripe.Checkout.Session;
  const slug = session.metadata?.tenant_slug;
  return typeof slug === "string" && slug.length > 0 ? slug : undefined;
}

async function dispatchStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutSessionCompleted(session);
      return;
    }
    case "customer.subscription.updated": {
      await handleCustomerSubscriptionUpdated(event);
      return;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(invoice);
      return;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentSucceeded(invoice);
      return;
    }
    default:
      return;
  }
}

export async function POST(request: Request): Promise<Response> {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (e) {
    logger.error(
      "stripe webhook failed to read body",
      e instanceof Error ? e : { error: String(e) },
    );
    return Response.json(
      { error: "body_read_failed" },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }

  const endpointSecret = resolveStripeWebhookEndpointSecret();
  if (!endpointSecret) {
    logger.error(
      "stripe webhook endpoint secret not configured (STRIPE_WEBHOOK_SECRET en prod; STRIPE_WEBHOOK_SECRET_TEST en no-prod)",
    );
    return Response.json(
      { error: "webhook_not_configured" },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }

  const signature = request.headers.get("stripe-signature");
  const event = constructWebhookEvent(rawBody, signature, endpointSecret);
  if (!event) {
    logger.error("stripe webhook signature verification failed");
    return Response.json(
      { error: "invalid_signature" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  try {
    await dispatchStripeEvent(event);
  } catch (e) {
    const errPayload = e instanceof Error ? e : { error: String(e) };
    logger.error("stripe webhook dispatch error — Stripe reintentará si respondemos 5xx", errPayload);
    const msg = e instanceof Error ? e.message : String(e);
    const slug = tenantSlugFromCheckoutEvent(event);
    await notifyStripeWebhookCritical(event.type, msg, slug);
    return Response.json(
      { error: "processing_failed" },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }

  return Response.json({ received: true }, { status: HTTP_STATUS.OK });
}
