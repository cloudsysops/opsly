import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import {
  markEnrollmentPaidFromCheckout,
  verifyStripeWebhookSignature,
} from '@/lib/services/payment.service';
import { resolvePeskidsEnvironment } from '@/lib/runtime-environment';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const environment = resolvePeskidsEnvironment();
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!verifyStripeWebhookSignature(payload, signature)) {
    console.warn('[peskids][stripe] invalid signature', { request_id: requestId, environment });
    return errorJson(requestId, 'Invalid signature', 400);
  }

  let event: {
    type: string;
    data: { object: Record<string, unknown> };
  };

  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const enrollmentId =
      typeof session.client_reference_id === 'string'
        ? session.client_reference_id
        : typeof session.metadata === 'object' &&
            session.metadata !== null &&
            typeof (session.metadata as Record<string, unknown>).enrollment_id === 'string'
          ? ((session.metadata as Record<string, unknown>).enrollment_id as string)
          : null;

    const sessionId = typeof session.id === 'string' ? session.id : null;
    const paymentIntentId =
      typeof session.payment_intent === 'string' ? session.payment_intent : null;

    if (enrollmentId && sessionId) {
      console.info('[peskids][stripe] checkout.session.completed', {
        request_id: requestId,
        environment,
        tenant: process.env.NEXT_PUBLIC_TENANT_ID || 'peskids',
      });
      await markEnrollmentPaidFromCheckout({
        enrollmentId,
        sessionId,
        paymentIntentId,
      });
    }
  }

  return successJson(requestId, { ok: true, received: true });
}
