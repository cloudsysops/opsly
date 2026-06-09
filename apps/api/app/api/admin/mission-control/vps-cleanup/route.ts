import { requireAdminAccess } from '../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../lib/constants';
import {
  cleanupWebhookSecret,
  evaluateVpsCleanupEvent,
  vpsCleanupWebhookSchema,
} from '../../../../../lib/vps-cleanup-webhook';

function getWebhookSecretHeader(request: Request): string | null {
  const header = request.headers.get('x-opsly-webhook-secret');
  if (header && header.trim().length > 0) {
    return header.trim();
  }
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth) {
    const expected = cleanupWebhookSecret();
    const provided = getWebhookSecretHeader(request);
    if (!expected || provided !== expected) {
      return auth;
    }
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const parsed = vpsCleanupWebhookSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: 'invalid_payload', details: parsed.error.flatten() },
      { status: HTTP_STATUS.UNPROCESSABLE }
    );
  }

  const decision = evaluateVpsCleanupEvent(parsed.data);
  const shouldAutoExecute = decision.decision === 'safe-auto';

  return Response.json(
    {
      accepted: true,
      auto_execute: shouldAutoExecute,
      decision,
      event: {
        source: parsed.data.source,
        alert_type: parsed.data.alert_type,
        severity: parsed.data.severity,
        vps: parsed.data.vps,
        service: parsed.data.service,
        tenant_slug: parsed.data.tenant_slug ?? null,
        timestamp: parsed.data.timestamp,
      },
      next_action: shouldAutoExecute
        ? 'Execute safe cleanup actions automatically'
        : 'Create approval in Mission Control before acting',
    },
    { status: HTTP_STATUS.ACCEPTED }
  );
}
