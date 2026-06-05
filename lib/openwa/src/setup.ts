import {
  createSession,
  createWebhook,
  getQRCode,
  getSession,
  listWebhooks,
} from './client.js';
import { getConfig, getWebhookSecret } from './config.js';
import type { OpenWAConfig, OpenWARegisterWebhookResult, OpenWASetupResult } from './types.js';

export interface SetupRequestContext {
  host: string;
  proto?: string;
  webhookPath?: string;
}

function webhookUrlFromContext(ctx: SetupRequestContext): string {
  const proto = ctx.proto ?? 'https';
  const path = ctx.webhookPath ?? '/api/webhooks/openwa';
  return `${proto}://${ctx.host}${path}`;
}

/** GET setup: session status + QR when SCAN_QR */
export async function openwaSetupStatus(cfg?: OpenWAConfig): Promise<OpenWASetupResult> {
  const c = cfg ?? getConfig();
  if (!c) throw new Error('OpenWA not configured');

  const session = await getSession(c).catch(() => createSession(undefined, c));
  let qrCode: string | undefined;
  if (session.status === 'SCAN_QR') {
    const qr = await getQRCode(c).catch(() => null);
    qrCode = qr?.qr;
  }
  return { session, qrCode };
}

/** POST setup: ensure session + register inbound webhook */
export async function openwaRegisterWebhook(
  ctx: SetupRequestContext,
  cfg?: OpenWAConfig,
  tenantSlug?: string
): Promise<OpenWARegisterWebhookResult> {
  const c = cfg ?? getConfig();
  if (!c) throw new Error('OpenWA not configured');

  const webhookUrl = webhookUrlFromContext(ctx);
  const hmacKey = getWebhookSecret(tenantSlug) ?? '';

  const session = await getSession(c).catch(() => createSession(undefined, c));
  const existing = await listWebhooks(c).catch(() => []);
  const alreadyRegistered = existing.some((w) => w.url === webhookUrl);
  const webhook = alreadyRegistered
    ? existing.find((w) => w.url === webhookUrl)
    : await createWebhook(
        webhookUrl,
        ['message.received', 'message', 'session.status'],
        hmacKey,
        c
      );

  return { session, webhook, webhookUrl, alreadyRegistered };
}
