import { NextRequest, NextResponse } from 'next/server';
import { resolveTwentyEnv } from '@intcloudsysops/services/twenty';
import { verifyTwentyWebhookSignature } from '@intcloudsysops/services/twenty/webhook-verify';
import { handleTwentyWebhookEvent } from '@/lib/twenty-webhook-handler.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const env = resolveTwentyEnv();
  if (!env.enabled || !env.webhookSecret) {
    // Twenty webhooks aren't configured for this tenant yet — accept but
    // no-op, consistent with how the outbound sync paths treat "not enabled".
    return NextResponse.json({ ok: true, received: false, reason: 'not configured' });
  }

  const rawBody = await req.text();
  const timestamp = req.headers.get('x-twenty-webhook-timestamp');
  const signature = req.headers.get('x-twenty-webhook-signature');

  const verification = verifyTwentyWebhookSignature(rawBody, timestamp, signature, env.webhookSecret);
  if (!verification.ok) {
    console.warn('[twenty-webhook] rejected delivery', { reason: verification.reason });
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const result = await handleTwentyWebhookEvent(verification.payload);
    return NextResponse.json({ ok: true, received: true, ...result });
  } catch (error) {
    // A thrown error is an unexpected failure (e.g. DB unreachable), not a
    // recognized-but-ignored event — return 5xx so Twenty retries delivery
    // instead of treating it as successfully received.
    console.warn('[twenty-webhook] handler threw', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
