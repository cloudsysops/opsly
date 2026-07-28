import { NextRequest, NextResponse } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { handleMetaWhatsAppWebhook } from '@/lib/integrations/meta-whatsapp-handler';
import {
  isMetaInboundAccepting,
  readMetaSignatureHeader,
  resolveMetaCloudForTenant,
  resolveMetaVerifyChallenge,
  verifyMetaSignature,
} from '@intcloudsysops/whatsapp-channel';

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

/** Meta subscription challenge */
export async function GET(req: NextRequest): Promise<NextResponse | Response> {
  const cfg = resolveMetaCloudForTenant(tenantSlug());
  const url = req.nextUrl;
  const result = resolveMetaVerifyChallenge({
    mode: url.searchParams.get('hub.mode'),
    token: url.searchParams.get('hub.verify_token'),
    challenge: url.searchParams.get('hub.challenge'),
    expectedToken: cfg.verifyToken,
  });

  if (!result.ok) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return new NextResponse(result.challenge, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

/** Signed inbound webhook — Meta only; n8n must not inject secrets here. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(req);
  const cfg = resolveMetaCloudForTenant(tenantSlug());

  if (!isMetaInboundAccepting(cfg)) {
    return errorJson(
      requestId,
      'WhatsApp Meta inbound disabled (flags off or unconfigured)',
      403
    );
  }

  const rawBody = await req.text();
  const signature = readMetaSignatureHeader(req.headers);
  const valid = await verifyMetaSignature(rawBody, signature, cfg.appSecret);
  if (!valid) {
    return errorJson(requestId, 'Invalid Meta signature', 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const result = await handleMetaWhatsAppWebhook(payload, requestId);
  if (!result.ok) {
    return errorJson(requestId, result.error, result.status);
  }

  return successJson(requestId, {
    ok: true,
    provider: 'meta_cloud',
    processed: result.processed,
    duplicates: result.duplicates,
    message_ids: result.messageIds,
  });
}
