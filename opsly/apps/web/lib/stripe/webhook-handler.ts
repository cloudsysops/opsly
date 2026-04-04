import Stripe from "stripe";
import { stripeClient } from "./client";

async function onCheckoutSessionCompleted(
  _session: Stripe.Checkout.Session,
): Promise<void> {
  // TODO: call subscription service to activate tenant from checkout.session.completed
}

async function onInvoicePaymentFailed(_invoice: Stripe.Invoice): Promise<void> {
  // TODO: call billing service to handle invoice.payment_failed
}

async function onInvoicePaymentSucceeded(
  _invoice: Stripe.Invoice,
): Promise<void> {
  // TODO: call billing service to handle invoice.payment_succeeded
}

async function onCustomerSubscriptionDeleted(
  _subscription: Stripe.Subscription,
): Promise<void> {
  // TODO: call subscription service to suspend or offboard tenant for customer.subscription.deleted
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

export async function handleStripeWebhook(request: Request): Promise<Response> {
  const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
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
