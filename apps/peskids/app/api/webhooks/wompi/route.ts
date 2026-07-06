import { NextRequest, NextResponse } from 'next/server';
import {
  markEnrollmentPaidFromWompi,
  verifyWompiWebhookSignature,
} from '@/lib/services/wompi-payment.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const payload = await req.text();

  const event = verifyWompiWebhookSignature(payload);
  if (!event) {
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 400 });
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
        await markEnrollmentPaidFromWompi({ paymentLinkId, transactionId, status });
      }
    }
  }

  return NextResponse.json({ ok: true, received: true });
}
