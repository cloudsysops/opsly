import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import {
  markEnrollmentPaidFromWompi,
  verifyWompiWebhookSignature,
} from '@/lib/services/wompi-payment.service';
import {
  claimWebhookEvent,
  markWebhookEventIgnored,
  markWebhookEventProcessed,
  releaseWebhookEvent,
} from '@/lib/services/webhook-idempotency.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/wompi
 *
 * Order: verify signature -> claim the transaction id in the idempotency ledger
 * -> atomic business write -> settle. Wompi retries deliveries, so without the
 * ledger a redelivery would re-run the paid transition.
 */
export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const payload = await req.text();

  const event = verifyWompiWebhookSignature(payload);
  if (!event) {
    console.warn(
      JSON.stringify({
        component: 'peskids.webhook',
        event: 'wompi_signature_rejected',
        request_id: requestId,
      })
    );
    return errorJson(requestId, 'Invalid signature', 400);
  }

  if (event.event !== 'transaction.updated') {
    return successJson(requestId, { ok: true, received: true, ignored: true });
  }

  const transaction = event.data.transaction as Record<string, unknown> | undefined;
  const status = typeof transaction?.status === 'string' ? transaction.status : '';
  const transactionId = typeof transaction?.id === 'string' ? transaction.id : '';
  const paymentLinkId =
    typeof transaction?.payment_link_id === 'string'
      ? transaction.payment_link_id
      : typeof transaction?.reference === 'string'
        ? transaction.reference
        : '';

  if (!transactionId || !paymentLinkId) {
    return successJson(requestId, { ok: true, received: true, ignored: true });
  }

  // Wompi has no event id, so the (transaction id + status) pair is the natural
  // key: the same transaction reaching the same terminal status twice is the
  // duplicate we must absorb.
  const eventId = `${transactionId}:${status}`;

  const claim = await claimWebhookEvent({
    provider: 'wompi',
    eventId,
    eventType: `transaction.${status.toLowerCase()}`,
    requestId,
  });

  if (!claim.ok) {
    return errorJson(requestId, 'Webhook ledger unavailable', 503);
  }

  if (claim.duplicate) {
    return successJson(requestId, { ok: true, received: true, duplicate: true });
  }

  try {
    const result = await markEnrollmentPaidFromWompi({ paymentLinkId, transactionId, status });

    if (!result.applied) {
      await markWebhookEventIgnored('wompi', eventId);
      return successJson(requestId, { ok: true, received: true, ignored: true });
    }

    await markWebhookEventProcessed('wompi', eventId);
    console.info(
      JSON.stringify({
        component: 'peskids.webhook',
        event: 'wompi.transaction_approved',
        request_id: requestId,
        wompi_transaction_id: transactionId,
        already_paid: result.alreadyPaid,
      })
    );

    return successJson(requestId, { ok: true, received: true, duplicate: false });
  } catch (err) {
    await releaseWebhookEvent('wompi', eventId, 'mark_paid_failed');
    console.error(
      JSON.stringify({
        component: 'peskids.webhook',
        event: 'wompi_mark_paid_failed',
        request_id: requestId,
        wompi_transaction_id: transactionId,
        error: err instanceof Error ? err.message : 'unknown',
      })
    );
    return errorJson(requestId, 'Failed to record payment', 500);
  }
}
