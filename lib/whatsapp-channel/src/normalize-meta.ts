import type { NormalizedWhatsAppMessage } from './types.js';

type Json = Record<string, unknown>;

function asRecord(v: unknown): Json | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * Normalize Meta Cloud API webhook payload into channel messages.
 * Supports messages + statuses; ignores empty entries.
 */
export function normalizeMetaWebhookPayload(
  tenantSlug: string,
  payload: unknown
): NormalizedWhatsAppMessage[] {
  const root = asRecord(payload);
  if (!root) return [];

  const entries: NormalizedWhatsAppMessage[] = [];
  const entryList = Array.isArray(root.entry) ? root.entry : [];

  for (const entry of entryList) {
    const e = asRecord(entry);
    if (!e) continue;
    const changes = Array.isArray(e.changes) ? e.changes : [];
    for (const change of changes) {
      const c = asRecord(change);
      const value = asRecord(c?.value);
      if (!value) continue;

      const metadata = asRecord(value.metadata);
      const phoneNumberId = str(metadata?.phone_number_id) || 'unknown';
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const contactNameByWa = new Map<string, string>();
      for (const contact of contacts) {
        const ct = asRecord(contact);
        if (!ct) continue;
        const waId = str(ct.wa_id);
        const profile = asRecord(ct.profile);
        const name = str(profile?.name);
        if (waId) contactNameByWa.set(waId, name);
      }

      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const msg of messages) {
        const m = asRecord(msg);
        if (!m) continue;
        const from = str(m.from);
        const id = str(m.id);
        if (!from || !id) continue;
        const textObj = asRecord(m.text);
        const body = str(textObj?.body) || str(m.caption) || `[${str(m.type) || 'message'}]`;
        const ts = Number(str(m.timestamp)) * 1000 || Date.now();
        entries.push({
          provider: 'meta_cloud',
          tenantSlug,
          externalId: id,
          externalConversationId: `${phoneNumberId}:${from}`,
          direction: 'inbound',
          phone: from,
          contactName: contactNameByWa.get(from),
          body,
          timestamp: ts,
          raw: m,
        });
      }

      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const st of statuses) {
        const s = asRecord(st);
        if (!s) continue;
        const id = str(s.id);
        const recipient = str(s.recipient_id);
        if (!id) continue;
        entries.push({
          provider: 'meta_cloud',
          tenantSlug,
          externalId: id,
          externalConversationId: `${phoneNumberId}:${recipient || 'unknown'}`,
          direction: 'status',
          phone: recipient,
          body: '',
          timestamp: Number(str(s.timestamp)) * 1000 || Date.now(),
          status: str(s.status) || 'unknown',
          raw: s,
        });
      }
    }
  }

  return entries;
}

/** Idempotency key: tenant + external message id */
export function whatsappIdempotencyKey(tenantSlug: string, externalId: string): string {
  return `${tenantSlug.trim().toLowerCase()}::${externalId.trim()}`;
}
