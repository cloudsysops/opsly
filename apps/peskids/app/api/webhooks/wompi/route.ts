import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import {
  markEnrollmentPaidFromWompi,
  verifyWompiWebhookSignature,
} from '@/lib/services/wompi-payment.service';
import { resolvePeskidsEnvironment } from '@/lib/runtime-environment';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const environment = resolvePeskidsEnvironment();
  const payload = await req.text();

  const event = verifyWompiWebhookSignature(payload);
  if (!event) {
    console.warn('[peskids][wompi] invalid signature', { request_id: requestId, environment });
    return errorJson(requestId, 'Invalid signature', 400);
  }

  if (event.event === 'transaction.updated') {
    const transaction = event.data.transaction as Record<string, unknown> | undefined;
    if (transaction) {
      const status = typeof transaction.status === 'string' ? transaction.status : '';
      const transactionId = typeof transaction.id === 'string' ? transaction.id : '';
      const paymentLinkId =
        typeof transaction.payment_link_id === 'string'
          ? transaction.payment_link_id
          : typeof transaction.reference === 'string'
            ? transaction.reference
            : '';

      if (paymentLinkId && transactionId) {
        console.info('[peskids][wompi] transaction.updated', {
          request_id: requestId,
          environment,
          tenant: process.env.NEXT_PUBLIC_TENANT_ID || 'peskids',
          status,
        });
        await markEnrollmentPaidFromWompi({ paymentLinkId, transactionId, status });
      }
    }
  }

  return successJson(requestId, { ok: true, received: true });
}
