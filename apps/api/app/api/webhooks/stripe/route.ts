import type Stripe from "stripe";
import { z } from "zod";
import { notifyInvoicePaymentFailed } from "../../../../lib/notifications";
import { provisionTenant, suspendTenant } from "../../../../lib/orchestrator";
import { constructWebhookEvent } from "../../../../lib/stripe";
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
    console.error("resolveTenantByCustomer:", error);
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
    console.error(
      "checkout.session.completed: missing tenant_slug, email, or plan in metadata",
    );
    return;
  }

  const planParsed = planSchema.safeParse(planRaw);
  if (!planParsed.success) {
    console.error("checkout.session.completed: invalid plan", planRaw);
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

async function handleCustomerSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const sub = event.data.object as Stripe.Subscription;
  let tenantId: string | undefined =
    typeof sub.metadata?.tenant_id === "string" ? sub.metadata.tenant_id : undefined;

  if (tenantId === undefined) {
    const customerId = getStripeCustomerId(sub.customer);
    if (customerId !== undefined) {
      const row = await resolveTenantIdByCustomerId(customerId);
      tenantId = row?.id;
    }
  }

  if (tenantId === undefined) {
    console.error("customer.subscription.updated: could not resolve tenant_id");
    return;
  }

  const periodEnd =
    sub.current_period_end !== undefined && sub.current_period_end !== null
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

  const planMeta = sub.metadata?.plan ?? null;

  const db = getServiceClient();
  const { error: insertError } = await db.schema("platform").from("subscriptions").insert({
    tenant_id: tenantId,
    stripe_event_id: event.id,
    stripe_status: sub.status,
    current_period_end: periodEnd,
    plan: planMeta,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return;
    }
    console.error("subscriptions insert:", insertError);
    return;
  }

  const { error: tenantError } = await db
    .schema("platform")
    .from("tenants")
    .update({ stripe_subscription_id: sub.id })
    .eq("id", tenantId);

  if (tenantError) {
    console.error("tenant subscription id update:", tenantError);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = getStripeCustomerId(invoice.customer);
  if (!customerId) {
    console.error("invoice.payment_failed: missing customer");
    return;
  }

  const row = await resolveTenantIdByCustomerId(customerId);
  if (!row) {
    console.error("invoice.payment_failed: tenant not found for customer", customerId);
    return;
  }

  try {
    await suspendTenant(row.id, "stripe-webhook");
  } catch (e) {
    console.error("invoice.payment_failed suspend:", e);
  }

  try {
    await notifyInvoicePaymentFailed(row.slug, invoice.id);
  } catch (e) {
    console.error("invoice.payment_failed discord:", e);
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
    console.error("stripe webhook: failed to read body", e);
    return Response.json({ received: true }, { status: 200 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.length === 0) {
    console.error("stripe webhook: STRIPE_WEBHOOK_SECRET not configured");
    return Response.json({ received: true }, { status: 200 });
  }

  const signature = request.headers.get("stripe-signature");
  const event = constructWebhookEvent(rawBody, signature, secret);
  if (!event) {
    console.error("stripe webhook: signature verification failed");
    return Response.json({ received: true }, { status: 200 });
  }

  try {
    await dispatchStripeEvent(event);
  } catch (e) {
    console.error("stripe webhook: dispatch error", e);
  }

  return Response.json({ received: true }, { status: 200 });
}
