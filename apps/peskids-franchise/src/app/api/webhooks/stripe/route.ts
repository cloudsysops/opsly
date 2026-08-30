import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { constructWebhookEvent, getStripe } from '@/lib/stripe';
import { recordPayment, updateInvoiceStatus } from '@/lib/royalties';
import { sendPaymentConfirmation } from '@/lib/royalties/notifications';
import type Stripe from 'stripe';

export const dynamic = "force-dynamic";

// POST /api/webhooks/stripe - Handle Stripe webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;

    try {
      event = constructWebhookEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    switch (event.type) {
      // Connect account updated
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
        break;
      }

      // Checkout session completed
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      // Payment intent succeeded
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      // Payment intent failed
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      // Charge succeeded (backup for payment tracking)
      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`[Stripe Webhook] Charge succeeded: ${charge.id}`);
        break;
      }

      // Refund created
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Handle checkout.session.completed event
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const { invoiceId, invoiceNumber, franchiseeAccountId } = session.metadata || {};

  if (!invoiceId) {
    console.log(
      `[Stripe Webhook] Checkout session ${session.id} has no invoiceId in metadata`
    );
    return;
  }

  console.log(
    `[Stripe Webhook] Checkout completed for invoice ${invoiceNumber} (${invoiceId})`
  );

  // The payment_intent.succeeded event will handle recording the actual payment
  // This handler is just for logging/tracking purposes
  // If payment_intent is available, we can use it to get payment details
  if (session.payment_intent && typeof session.payment_intent === 'string') {
    console.log(
      `[Stripe Webhook] Payment intent for checkout: ${session.payment_intent}`
    );
  }
}

// Handle account.updated event
async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const isOnboarded =
    account.charges_enabled === true && account.payouts_enabled === true;

  // Find franchisee account by Stripe account ID
  const franchiseeAccount = await db.franchiseeAccount.findFirst({
    where: { stripeAccountId: account.id },
  });

  if (!franchiseeAccount) {
    console.log(
      `[Stripe Webhook] No franchisee found for account: ${account.id}`
    );
    return;
  }

  // Update onboarding status
  if (isOnboarded && !franchiseeAccount.stripeOnboarded) {
    await db.franchiseeAccount.update({
      where: { id: franchiseeAccount.id },
      data: {
        stripeOnboarded: true,
        stripeOnboardedAt: new Date(),
      },
    });
    console.log(
      `[Stripe Webhook] Franchisee ${franchiseeAccount.id} onboarding completed`
    );
  }
}

// Handle payment_intent.succeeded event
async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const { invoiceId, franchiseeId } = paymentIntent.metadata;

  if (!invoiceId) {
    console.log(
      `[Stripe Webhook] Payment ${paymentIntent.id} has no invoiceId in metadata`
    );
    return;
  }

  // Get invoice
  const invoice = await db.royaltyInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      franchiseeAccount: {
        include: {
          prospect: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    console.error(
      `[Stripe Webhook] Invoice not found: ${invoiceId}`
    );
    return;
  }

  // Record the payment
  await recordPayment(
    invoiceId,
    paymentIntent.amount / 100, // Convert from cents
    'STRIPE_ACH',
    {
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId:
        typeof paymentIntent.latest_charge === 'string'
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id,
    }
  );

  // Send confirmation email
  await sendPaymentConfirmation({
    franchiseeName: `${invoice.franchiseeAccount.prospect.firstName} ${invoice.franchiseeAccount.prospect.lastName}`,
    franchiseeEmail: invoice.franchiseeAccount.prospect.email,
    invoiceNumber: invoice.invoiceNumber,
    invoiceId: invoice.id,
    year: invoice.year,
    month: invoice.month,
    grossRevenue: Number(invoice.grossRevenue),
    totalAmount: Number(invoice.totalAmount),
    dueDate: invoice.dueDate,
    paidAmount: paymentIntent.amount / 100,
    paidAt: new Date(),
  });

  console.log(
    `[Stripe Webhook] Payment recorded for invoice ${invoice.invoiceNumber}`
  );
}

// Handle payment_intent.payment_failed event
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const { invoiceId } = paymentIntent.metadata;

  if (!invoiceId) {
    return;
  }

  // Update invoice status
  await updateInvoiceStatus(invoiceId, 'PAYMENT_PENDING');

  // Create failed payment record
  const invoice = await db.royaltyInvoice.findUnique({
    where: { id: invoiceId },
  });

  if (invoice) {
    await db.royaltyPayment.create({
      data: {
        invoiceId,
        franchiseeAccountId: invoice.franchiseeAccountId,
        amount: paymentIntent.amount / 100,
        method: 'STRIPE_ACH',
        status: 'FAILED',
        stripePaymentIntentId: paymentIntent.id,
        failureReason:
          paymentIntent.last_payment_error?.message || 'Payment failed',
        processedAt: new Date(),
      },
    });
  }

  console.log(
    `[Stripe Webhook] Payment failed for invoice ${invoiceId}: ${paymentIntent.last_payment_error?.message}`
  );
}

// Handle charge.refunded event
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  // Find payment by charge ID
  const payment = await db.royaltyPayment.findFirst({
    where: { stripeChargeId: charge.id },
  });

  if (!payment) {
    console.log(
      `[Stripe Webhook] No payment found for refunded charge: ${charge.id}`
    );
    return;
  }

  // Update payment status
  await db.royaltyPayment.update({
    where: { id: payment.id },
    data: { status: 'REFUNDED' },
  });

  // Create ledger entry for refund
  await db.ledgerEntry.create({
    data: {
      franchiseeAccountId: payment.franchiseeAccountId,
      entryType: 'REFUND',
      amount: payment.amount,
      balanceAfter: 0, // Will be recalculated
      description: `Refund for payment ${payment.id}`,
      referenceType: 'payment',
      referenceId: payment.id,
    },
  });

  console.log(`[Stripe Webhook] Refund processed for payment ${payment.id}`);
}
