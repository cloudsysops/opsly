import type { InboundWhatsAppMessage, OpenWAWebhookPayload } from './types.js';
import { getWebhookSecret } from './config.js';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify OpenWA webhook signature.
 * OpenWA signs JSON.stringify(parsed body) with header X-OpenWA-Signature: sha256=…
 * Falls back to raw-body HMAC for legacy gateways.
 */
export async function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret?: string,
  parsedPayload?: OpenWAWebhookPayload
): Promise<boolean> {
  const s = secret ?? getWebhookSecret();
  if (!s) return true;
  if (!signatureHeader) return false;

  const normalized = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader.includes('=')
      ? (signatureHeader.split('=')[1] ?? '')
      : signatureHeader;

  const parsed =
    parsedPayload ??
    (JSON.parse(rawBody) as OpenWAWebhookPayload);

  const canonical = JSON.stringify(parsed);
  const expectedParsed = await hmacSha256Hex(s, canonical);
  if (timingSafeEqual(expectedParsed, normalized)) return true;

  const expectedRaw = await hmacSha256Hex(s, rawBody);
  return timingSafeEqual(expectedRaw, normalized);
}

export function senderFromJid(jid: string): string {
  return jid.replace('@c.us', '').replace('@s.whatsapp.net', '').replace('@g.us', '');
}

export function parseInboundMessage(
  payload: OpenWAWebhookPayload
): InboundWhatsAppMessage | null {
  const { event, data } = payload;
  const isInboundEvent = event === 'message' || event === 'message.received';
  const text = data.body?.trim();
  if (!isInboundEvent || !text) return null;
  if (data.fromMe === true) return null;

  const ts =
    data.waTimestamp ??
    (data.timestamp ? Date.parse(data.timestamp) : NaN) ??
    Date.now();

  return {
    sender: senderFromJid(data.from),
    chatId: data.from,
    text,
    timestamp: Number.isFinite(ts) ? ts : Date.now(),
    hasMedia: Boolean(data.hasMedia),
    mediaUrl: data.mediaUrl,
    rawEvent: payload,
  };
}

/** Read signature from common OpenWA / legacy headers */
export function readSignatureHeader(headers: Headers): string | null {
  return (
    headers.get('x-openwa-signature') ??
    headers.get('x-signature') ??
    headers.get('x-hub-signature-256')
  );
}
