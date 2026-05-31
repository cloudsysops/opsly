import { NextRequest, NextResponse } from 'next/server';
import {
  markEnrollmentPaidFromCheckout,
  verifyStripeWebhookSignature,
} from '@/lib/services/payment.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!verifyStripeWebhookSignature(payload, signature)) {
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 400 });
  }

  let event: {
    type: string;
    data: { object: Record<string, unknown> };
  };

  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
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
      await markEnrollmentPaidFromCheckout({
        enrollmentId,
        sessionId,
        paymentIntentId,
      });
    }
  }

  return NextResponse.json({ ok: true, received: true });
}
