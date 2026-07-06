import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { handleWacrmWebhookEvent } from '@/lib/integrations/wacrm-inbound-handler';
import {
  extractWacrmWebhookSecretFromHeaders,
  verifyWacrmWebhookSecret,
} from '@/lib/integrations/wacrm-webhook-auth';
import { wacrmWebhookPayloadSchema } from '@/lib/integrations/wacrm-webhook-contract';

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);

  try {
    const providedSecret = extractWacrmWebhookSecretFromHeaders(req.headers);
    if (!verifyWacrmWebhookSecret(providedSecret, tenantSlug())) {
      return errorJson(requestId, 'Unauthorized', 401);
    }

    const body: unknown = await req.json();
    const parsed = wacrmWebhookPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson(requestId, 'Invalid wacrm webhook payload', 400);
    }

    const result = await handleWacrmWebhookEvent(parsed.data, requestId);
    if (!result.ok) {
      return errorJson(requestId, result.error, result.status);
    }

    return successJson(
      requestId,
      {
        ok: true,
        provider: 'wacrm',
        duplicate: result.duplicate,
        message_id: result.messageId ?? null,
        lead_id: result.leadId ?? null,
        event_type: result.event_type,
      },
      result.status
    );
  } catch (error) {
    console.error('wacrm webhook error', {
      request_id: requestId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return errorJson(requestId, 'Internal server error', 500);
  }
}
