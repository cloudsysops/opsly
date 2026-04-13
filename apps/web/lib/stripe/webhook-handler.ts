import Stripe from "stripe";
import { stripeClient } from "./client";

interface TenantActivation {
  tenantId: string;
  customerId: string;
  subscriptionId: string;
}

async function findTenantByCustomerId(
  customerId: string,
): Promise<TenantActivation | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[webhook] Missing Supabase config");
    return null;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("platform.tenants")
    .select("id, stripe_customer_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (error || !data) {
    console.error("[webhook] Tenant not found for customer:", customerId);
    return null;
  }

  return { tenantId: data.id, customerId, subscriptionId: "" };
}

async function onCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  console.log("[webhook] checkout.session.completed:", {
    customerId,
    subscriptionId,
    tenant: session.client_reference_id,
  });

  if (!customerId) {
    console.warn("[webhook] No customer ID in session");
    return;
  }

  const tenant = await findTenantByCustomerId(customerId);
  if (!tenant) {
    return;
  }

  console.log("[webhook] Activating tenant:", tenant.tenantId);
}

async function onInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  const amountDue = invoice.amount_due;

  console.log("[webhook] invoice.payment_failed:", {
    customerId,
    amountDue,
    currency: invoice.currency,
  });

  if (!customerId) {
    return;
  }

  const tenant = await findTenantByCustomerId(customerId);
  if (!tenant) {
    return;
  }

  console.log("[webhook] Payment failed for tenant:", tenant.tenantId);
}

async function onInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  const amountPaid = invoice.amount_paid;
  const periodStart = invoice.period_start;
  const periodEnd = invoice.period_end;

  console.log("[webhook] invoice.payment_succeeded:", {
    customerId,
    amountPaid,
    periodStart,
    periodEnd,
  });

  if (!customerId) {
    return;
  }

  const tenant = await findTenantByCustomerId(customerId);
  if (!tenant) {
    return;
  }

  console.log("[webhook] Payment recorded for tenant:", tenant.tenantId);
}

async function onCustomerSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  console.log("[webhook] customer.subscription.deleted:", {
    customerId,
    subscriptionId,
    status,
  });

  if (!customerId) {
    return;
  }

  const tenant = await findTenantByCustomerId(customerId);
  if (!tenant) {
    return;
  }

  console.log("[webhook] Suspending tenant:", tenant.tenantId);
}

async function dispatchStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await onCheckoutSessionCompleted(session);
      return;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await onInvoicePaymentFailed(invoice);
      return;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      await onInvoicePaymentSucceeded(invoice);
      return;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await onCustomerSubscriptionDeleted(subscription);
      return;
    }
    default:
      return;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Live: STRIPE_WEBHOOK_SECRET. No-prod: STRIPE_WEBHOOK_SECRET_TEST. */
function resolveStripeWebhookEndpointSecret(): string {
  if (process.env.NODE_ENV === "production") {
    return requireEnv("STRIPE_WEBHOOK_SECRET");
  }
  const test = process.env.STRIPE_WEBHOOK_SECRET_TEST?.trim();
  if (test && test.length > 0) {
    return test;
  }
  return requireEnv("STRIPE_WEBHOOK_SECRET_TEST");
}

export async function handleStripeWebhook(request: Request): Promise<Response> {
  const webhookSecret = resolveStripeWebhookEndpointSecret();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing Stripe-Signature header" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    await dispatchStripeEvent(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
