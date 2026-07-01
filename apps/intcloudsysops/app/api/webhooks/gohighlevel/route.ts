import { NextRequest, NextResponse } from 'next/server';
import {
  verifyGhlWebhookSignature,
  extractGhlEventType,
} from '@/lib/services/gohighlevel/webhook-auth';
import {
  handlePipelineStageUpdate,
  handleContactCreated,
  handleContactUpdated,
} from '@/lib/services/gohighlevel/webhook-handler';

const GHL_WEBHOOK_SECRET =
  process.env.GOHIGHLEVEL_PESKIDS_WEBHOOK_SECRET ||
  process.env.GOHIGHLEVEL_PESKIDS_API_KEY ||
  '';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const signature = request.headers.get('x-ghl-signature') ?? '';
    const rawBody = await request.text();

    if (!verifyGhlWebhookSignature(rawBody, signature, GHL_WEBHOOK_SECRET)) {
      console.warn('[ghl] invalid webhook signature');
      return NextResponse.json(
        { ok: false, error: 'Invalid signature', request_id: requestId },
        { status: 401 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      console.warn('[ghl] failed to parse webhook body as JSON');
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON body', request_id: requestId },
        { status: 400 }
      );
    }

    const eventType = extractGhlEventType(body);

    if (!eventType) {
      console.warn('[ghl] unknown event type:', JSON.stringify(body).slice(0, 200));
      return NextResponse.json({ status: 'ignored', request_id: requestId });
    }

    console.log(`[ghl] processing event: ${eventType}`);

    switch (eventType) {
      case 'opportunity.stage.updated':
        void handlePipelineStageUpdate(body).catch((err) =>
          console.error('[ghl] stage update handler failed:', err)
        );
        break;

      case 'contact.created':
        void handleContactCreated(body).catch((err) =>
          console.error('[ghl] contact created handler failed:', err)
        );
        break;

      case 'contact.updated':
        void handleContactUpdated(body).catch((err) =>
          console.error('[ghl] contact updated handler failed:', err)
        );
        break;

      default:
        console.log(`[ghl] unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ ok: true, request_id: requestId });
  } catch (error) {
    console.error('[ghl] unhandled webhook error:', error, { request_id: requestId });
    return NextResponse.json(
      { ok: false, error: 'Internal server error', request_id: requestId },
      { status: 500 }
    );
  }
}
