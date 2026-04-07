import type Stripe from "stripe";
import { z } from "zod";
import { notifyInvoicePaymentFailed } from "../../../../lib/notifications";
import { provisionTenant, suspendTenant } from "../../../../lib/orchestrator";
import { constructWebhookEvent } from "../../../../lib/stripe";
import { getServiceClient } from "../../../../lib/supabase";
import { logger } from "../../../../lib/logger";
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
    return Response.json({ received: true }, { status: 200 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.length === 0) {
    logger.error("stripe webhook STRIPE_WEBHOOK_SECRET not configured");
    return Response.json({ received: true }, { status: 200 });
  }

  const signature = request.headers.get("stripe-signature");
  const event = constructWebhookEvent(rawBody, signature, secret);
  if (!event) {
    logger.error("stripe webhook signature verification failed");
    return Response.json({ received: true }, { status: 200 });
  }

  try {
    await dispatchStripeEvent(event);
  } catch (e) {
    logger.error(
      "stripe webhook dispatch error",
      e instanceof Error ? e : { error: String(e) },
    );
  }

  return Response.json({ received: true }, { status: 200 });
}
