import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import {
  markEnrollmentPaidFromCheckout,
  verifyStripeWebhookSignatureDetailed,
} from '@/lib/services/payment.service';
import {
  claimWebhookEvent,
  releaseWebhookEvent,
  markWebhookEventIgnored,
  markWebhookEventProcessed,
} from '@/lib/services/webhook-idempotency.service';

export const dynamic = 'force-dynamic';

type StripeEvent = {
  id?: unknown;
  type?: unknown;
  created?: unknown;
  data?: { object?: Record<string, unknown> };
};

function readEnrollmentId(session: Record<string, unknown>): string | null {
  if (typeof session.client_reference_id === 'string') return session.client_reference_id;
  const metadata = session.metadata;
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const value = (metadata as Record<string, unknown>).enrollment_id;
    if (typeof value === 'string') return value;
  }
  return null;
}

/**
 * POST /api/webhooks/stripe
 *
 * Order: verify signature (incl. replay window) -> parse -> claim the event id
 * in the idempotency ledger -> do the (atomic) business write -> settle.
 *
 * Nothing is logged from the payload itself beyond ids, so a webhook body can
 * never carry a secret or PII into the logs.
 */
export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  const verification = verifyStripeWebhookSignatureDetailed(payload, signature);
  if (!verification.ok) {
    console.warn(
      JSON.stringify({
        component: 'peskids.webhook',
        event: 'stripe_signature_rejected',
        request_id: requestId,
        reason: verification.reason,
      })
    );
    // 503 when the secret is missing: that is our misconfiguration, not a bad
    // request, and Stripe should retry once it is fixed.
    const status = verification.reason === 'not_configured' ? 503 : 400;
    return errorJson(requestId, 'Invalid signature', status);
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }

  const eventId = typeof event.id === 'string' ? event.id : '';
  const eventType = typeof event.type === 'string' ? event.type : '';

  if (!eventId) {
    return errorJson(requestId, 'Missing event id', 400);
  }

  const claim = await claimWebhookEvent({
    provider: 'stripe',
    eventId,
    eventType,
    requestId,
    eventCreatedAt:
      typeof event.created === 'number' ? new Date(event.created * 1000).toISOString() : null,
  });

  if (!claim.ok) {
    // Fail closed: without the ledger we cannot promise "exactly once", so ask
    // Stripe to retry rather than risk a double confirmation.
    return errorJson(requestId, 'Webhook ledger unavailable', 503);
  }

  if (claim.duplicate) {
    // Already handled — acknowledge so Stripe stops retrying, but change nothing.
    return successJson(requestId, { ok: true, received: true, duplicate: true });
  }

  if (eventType !== 'checkout.session.completed') {
    await markWebhookEventIgnored('stripe', eventId);
    return successJson(requestId, { ok: true, received: true, ignored: true });
  }

  const session = event.data?.object ?? {};
  const enrollmentId = readEnrollmentId(session);
  const sessionId = typeof session.id === 'string' ? session.id : null;
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

  if (!sessionId) {
    await markWebhookEventIgnored('stripe', eventId);
    return successJson(requestId, { ok: true, received: true, ignored: true });
  }

  try {
    const result = await markEnrollmentPaidFromCheckout({ sessionId, paymentIntentId });
    await markWebhookEventProcessed('stripe', eventId);

    console.info(
      JSON.stringify({
        component: 'peskids.webhook',
        event: 'stripe.checkout_completed',
        request_id: requestId,
        stripe_event_id: eventId,
        enrollment_id: result.enrollmentId || enrollmentId,
        already_paid: result.alreadyPaid,
      })
    );

    return successJson(requestId, { ok: true, received: true, duplicate: false });
  } catch (err) {
    await releaseWebhookEvent('stripe', eventId, 'mark_paid_failed');
    console.error(
      JSON.stringify({
        component: 'peskids.webhook',
        event: 'stripe_mark_paid_failed',
        request_id: requestId,
        stripe_event_id: eventId,
        error: err instanceof Error ? err.message : 'unknown',
      })
    );
    // 500 so Stripe retries. The claim was released above, so the retry can
    // re-claim the same event id instead of being rejected as a duplicate.
    return errorJson(requestId, 'Failed to record payment', 500);
  }
}
