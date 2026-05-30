import type { OpenWAWebhookPayload } from './types.js';
import { parseInboundMessage, readSignatureHeader, verifySignature } from './verify.js';
import { getWebhookSecret } from './config.js';

export interface ParsedOpenWAWebhook {
  payload: OpenWAWebhookPayload;
  message: ReturnType<typeof parseInboundMessage>;
}

/**
 * Verify + parse inbound OpenWA webhook (shared by all tenant apps).
 * Returns null message when event should be skipped (acks, outbound, etc.).
 */
export async function parseOpenWAWebhookRequest(
  rawBody: string,
  headers: Headers,
  tenantSlug?: string
): Promise<{ ok: true; parsed: ParsedOpenWAWebhook } | { ok: false; status: number; error: string }> {
  let payload: OpenWAWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as OpenWAWebhookPayload;
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON body' };
  }

  const signature = readSignatureHeader(headers);
  const secret = getWebhookSecret(tenantSlug);
  const valid = await verifySignature(rawBody, signature, secret, payload);
  if (!valid) {
    return { ok: false, status: 401, error: 'Invalid webhook signature' };
  }

  return {
    ok: true,
    parsed: {
      payload,
      message: parseInboundMessage(payload),
    },
  };
}
