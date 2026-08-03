import { NextRequest, NextResponse } from 'next/server';
import { resolveTwentyEnv, verifyTwentyWebhookSignature } from '@intcloudsysops/services/twenty';
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

  const result = await handleTwentyWebhookEvent(verification.payload).catch((error: unknown) => {
    console.warn('[twenty-webhook] handler threw', error);
    return { handled: false, detail: error instanceof Error ? error.message : String(error) };
  });

  return NextResponse.json({ ok: true, received: true, ...result });
}
