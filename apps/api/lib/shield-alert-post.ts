import type { NextRequest } from 'next/server';
import type { z } from 'zod';
import { HTTP_STATUS } from './constants';
import { logger } from './logger';
import { resolveTrustedPortalSession } from './portal-trusted-identity';
import { resolveShieldDiscordWebhook, shieldAlertConfigBodySchema } from './shield-alert-config';
import { getServiceClient } from './supabase';

interface ShieldAlertRow {
  id: string;
  enabled: boolean;
}

type ParsedBody = z.infer<typeof shieldAlertConfigBodySchema>;

async function readParsedBody(request: NextRequest): Promise<Response | ParsedBody> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  const parsed = shieldAlertConfigBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }
  return parsed.data;
}

async function upsertShieldRow(
  data: ParsedBody,
  webhookUrl: string
): Promise<ShieldAlertRow | null> {
  const db = getServiceClient();
  const { data: row, error } = await db
    .schema('platform')
    .from('shield_alert_config')
    .upsert(
      {
        tenant_slug: data.tenant_slug,
        alert_type: data.alert_type,
        webhook_url: webhookUrl,
        threshold: data.threshold ?? null,
        enabled: data.enabled,
      },
      { onConflict: 'tenant_slug,alert_type' }
    )
    .select('id, enabled')
    .maybeSingle();

  if (error !== null) {
    logger.error('shield_alert_config upsert', error);
    return null;
  }
  return row as ShieldAlertRow | null;
}

export async function postShieldAlertConfig(request: NextRequest): Promise<Response> {
  const parsed = await readParsedBody(request);
  if (parsed instanceof Response) {
    return parsed;
  }

  const trusted = await resolveTrustedPortalSession(request);
  if (!trusted.ok) {
    return trusted.response;
  }
  if (trusted.session.tenant.slug !== parsed.tenant_slug) {
    return Response.json(
      { error: 'Tenant slug does not match session' },
      { status: HTTP_STATUS.FORBIDDEN }
    );
  }

  const webhookUrl = resolveShieldDiscordWebhook(parsed.webhook_url);
  if (webhookUrl === null) {
    return Response.json(
      {
        error:
          'webhook_url required or set SHIELD_ALERTS_DISCORD_WEBHOOK_URL / DISCORD_WEBHOOK_URL',
      },
      { status: HTTP_STATUS.UNPROCESSABLE }
    );
  }

  const row = await upsertShieldRow(parsed, webhookUrl);
  if (row === null) {
    return Response.json(
      { error: 'Failed to save alert config' },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }

  return Response.json({
    alert_id: row.id,
    status: row.enabled ? 'active' : 'disabled',
    webhook_url: webhookUrl,
  });
}
