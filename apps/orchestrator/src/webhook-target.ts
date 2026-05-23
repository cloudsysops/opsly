import { isIP } from 'node:net';
import type { WebhookPayload } from './workers/webhook-types.js';

const ALLOWED_WEBHOOK_EVENTS = new Set<WebhookPayload['event']>([
  'tenant.created',
  'tenant.suspended',
  'tenant.resumed',
  'billing.paid',
  'billing.failed',
  'backup.completed',
  'backup.failed',
  'usage.threshold_reached',
]);

export interface WebhookJobData {
  webhookId: string;
  url: string;
  secret: string;
  payload: WebhookPayload;
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b !== undefined && b >= 64 && b <= 127) return true;
  if (a === 198 && b !== undefined && (b === 18 || b === 19)) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === '::1') return true;
  if (normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('::ffff:127.')) return true;
  return false;
}

export function isAllowedWebhookUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (parsed.username.length > 0 || parsed.password.length > 0) {
      return false;
    }

    const host = parsed.hostname.trim().toLowerCase();
    if (host.length === 0) return false;
    if (host === 'localhost' || host.endsWith('.localhost')) return false;
    if (host.endsWith('.local')) return false;

    const ipVersion = isIP(host);
    if (ipVersion === 4) {
      return !isPrivateIpv4(host);
    }
    if (ipVersion === 6) {
      return !isPrivateIpv6(host);
    }

    return true;
  } catch {
    return false;
  }
}

export function parseWebhookJobData(body: unknown): { ok: true; data: WebhookJobData } | { ok: false; error: string } {
  if (body === null || typeof body !== 'object') {
    return { ok: false, error: 'invalid body' };
  }
  const b = body as Record<string, unknown>;
  const webhookId = typeof b.webhookId === 'string' ? b.webhookId.trim() : '';
  const url = typeof b.url === 'string' ? b.url.trim() : '';
  const secret = typeof b.secret === 'string' ? b.secret.trim() : '';
  const payloadRaw = b.payload;

  if (webhookId.length === 0) {
    return { ok: false, error: 'webhookId required' };
  }
  if (url.length === 0) {
    return { ok: false, error: 'url required' };
  }
  if (!isAllowedWebhookUrl(url)) {
    return { ok: false, error: 'invalid webhook url' };
  }
  if (secret.length === 0) {
    return { ok: false, error: 'secret required' };
  }
  if (payloadRaw === null || typeof payloadRaw !== 'object') {
    return { ok: false, error: 'payload required' };
  }

  const payload = payloadRaw as Record<string, unknown>;
  const event = typeof payload.event === 'string' ? payload.event.trim() : '';
  const tenantSlug = typeof payload.tenant_slug === 'string' ? payload.tenant_slug.trim() : '';
  const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp.trim() : '';
  const data = payload.data;
  if (event.length === 0 || tenantSlug.length === 0 || timestamp.length === 0) {
    return { ok: false, error: 'payload fields required' };
  }
  if (!ALLOWED_WEBHOOK_EVENTS.has(event as WebhookPayload['event'])) {
    return { ok: false, error: 'invalid payload event' };
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'payload.data must be an object' };
  }

  return {
    ok: true,
    data: {
      webhookId,
      url,
      secret,
      payload: {
        event: event as WebhookPayload['event'],
        tenant_slug: tenantSlug,
        timestamp,
        data: data as Record<string, unknown>,
      },
    },
  };
}
