import { getConfig } from './config.js';
import type {
  OpenWAConfig,
  SendTextResult,
  SessionStatus,
  SessionStatusKind,
  WebhookConfig,
} from './types.js';

interface OpenWAApiEnvelope<T> {
  success?: boolean;
  data?: T;
}

function unwrap<T>(body: OpenWAApiEnvelope<T> | T): T {
  if (body !== null && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data as T;
  }
  return body as T;
}

export async function openwaFetch<T>(
  cfg: OpenWAConfig,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${cfg.apiUrl}${path.replace('{sessionId}', cfg.sessionId)}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': cfg.apiKey,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenWA ${method} ${path} → HTTP ${res.status}: ${text}`);
  }
  const json = (await res.json()) as OpenWAApiEnvelope<T> | T;
  return unwrap(json);
}

function requireConfig(cfg?: OpenWAConfig): OpenWAConfig {
  const c = cfg ?? getConfig();
  if (!c) throw new Error('OpenWA not configured (OPENWA_API_URL / OPENWA_API_KEY missing)');
  return c;
}

function mapSession(raw: {
  id: string;
  name?: string;
  status: string;
  phoneNumber?: string;
  qr?: string | null;
}): SessionStatus {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status as SessionStatusKind,
    phoneNumber: raw.phoneNumber,
    qrCode: raw.qr ?? undefined,
  };
}

export async function getSession(cfg?: OpenWAConfig): Promise<SessionStatus> {
  const c = cfg ?? requireConfig();
  const data = await openwaFetch<{
    id: string;
    name?: string;
    status: string;
    phoneNumber?: string;
  }>(c, 'GET', '/sessions/{sessionId}');
  return mapSession(data);
}

/** Create session; `name` defaults to sessionId from config */
export async function createSession(
  name?: string,
  cfg?: OpenWAConfig
): Promise<SessionStatus> {
  const c = cfg ?? requireConfig();
  const data = await openwaFetch<{
    id: string;
    name?: string;
    status: string;
    qr?: string | null;
  }>(c, 'POST', '/sessions', { name: name ?? c.sessionId });
  return mapSession(data);
}

export async function getQRCode(cfg?: OpenWAConfig): Promise<{ qr: string }> {
  const c = cfg ?? requireConfig();
  const data = await openwaFetch<{ code?: string; image?: string }>(
    c,
    'GET',
    '/sessions/{sessionId}/qr'
  );
  const qr = data.image ?? data.code;
  if (!qr) throw new Error('OpenWA QR not available');
  return { qr };
}

export async function sendTextMessage(
  to: string,
  text: string,
  cfg?: OpenWAConfig
): Promise<SendTextResult> {
  const c = cfg ?? requireConfig();
  const chatId = to.includes('@') ? to : `${to.replace(/\D/g, '')}@c.us`;
  return openwaFetch<SendTextResult>(c, 'POST', '/sessions/{sessionId}/messages/send-text', {
    chatId,
    text,
  });
}

export async function listWebhooks(cfg?: OpenWAConfig): Promise<WebhookConfig[]> {
  const c = cfg ?? requireConfig();
  const data = await openwaFetch<WebhookConfig[] | { items?: WebhookConfig[] }>(
    c,
    'GET',
    '/sessions/{sessionId}/webhooks'
  );
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

export async function createWebhook(
  url: string,
  events: string[],
  secret: string,
  cfg?: OpenWAConfig
): Promise<WebhookConfig> {
  const c = cfg ?? requireConfig();
  return openwaFetch<WebhookConfig>(c, 'POST', '/sessions/{sessionId}/webhooks', {
    url,
    events,
    secret,
  });
}
