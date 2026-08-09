import { NextRequest, NextResponse } from 'next/server';
import { verifyJelouSignature, parseJelouWebhook } from '@/lib/jelou';
import { handleLeadSubmission, handleFeedbackSubmission } from '@/lib/services/jelou.service';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  const jelouSecret = process.env.JELOU_WEBHOOK_SECRET?.trim();
  if (!jelouSecret) {
    console.error('[jelou] JELOU_WEBHOOK_SECRET not configured — rejecting request');
    return NextResponse.json(
      { ok: false, error: 'Webhook not configured', request_id: requestId },
      { status: 503 }
    );
  }

  try {
    const signature = request.headers.get('x-jelou-signature') || '';
    const body = await request.text();

    if (!verifyJelouSignature(body, signature, jelouSecret)) {
      console.warn('[jelou] invalid signature');
      return NextResponse.json(
        { ok: false, error: 'Invalid signature', request_id: requestId },
        { status: 401 }
      );
    }

    const webhook = parseJelouWebhook(JSON.parse(body));

    if (webhook.event === 'form.lead_capture' || webhook.data.form_id === 'lead') {
      const result = await handleLeadSubmission(webhook);
      return NextResponse.json(result);
    }

    if (webhook.event === 'form.feedback' || webhook.data.form_id === 'feedback') {
      const result = await handleFeedbackSubmission(webhook);
      return NextResponse.json(result);
    }

    console.warn(`[jelou] unknown form type: ${webhook.data.form_id}`);
    return NextResponse.json({ status: 'ignored', request_id: requestId });
  } catch (error) {
    console.error('[jelou] unhandled error:', error, { request_id: requestId });
    return NextResponse.json(
      { ok: false, error: 'Internal server error', request_id: requestId },
      { status: 500 }
    );
  }
}
