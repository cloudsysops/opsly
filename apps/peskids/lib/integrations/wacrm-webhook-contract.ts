import { z } from 'zod';

export const WACRM_EVENT_TYPES = [
  'inbound_message',
  'outbound_message_approved',
  'outbound_message_sent',
  'conversation_created',
  'conversation_status_changed',
] as const;

export type WacrmEventType = (typeof WACRM_EVENT_TYPES)[number];

export const wacrmWebhookPayloadSchema = z
  .object({
    tenant_slug: z.string().min(1),
    provider: z.literal('wacrm').optional().default('wacrm'),
    event_type: z.enum(WACRM_EVENT_TYPES),
    external_conversation_id: z.string().optional(),
    external_message_id: z.string().optional(),
    phone: z.string().optional(),
    contact_name: z.string().optional(),
    body: z.string().optional(),
    direction: z.enum(['inbound', 'outbound']).optional(),
    timestamp: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .passthrough();

export type WacrmWebhookPayload = z.infer<typeof wacrmWebhookPayloadSchema>;

export type NormalizedWacrmMessage = {
  tenant_slug: string;
  event_type: WacrmEventType;
  external_conversation_id: string | null;
  external_message_id: string;
  phone: string;
  contact_name: string;
  body: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
  metadata: Record<string, unknown>;
};

export function wacrmExternalId(externalMessageId: string): string {
  return `wacrm:${externalMessageId}`;
}

export function isWacrmExternalId(externalId: string | null | undefined): boolean {
  return Boolean(externalId?.startsWith('wacrm:'));
}

export function normalizeWacrmWebhookPayload(
  payload: WacrmWebhookPayload
): NormalizedWacrmMessage | null {
  const phone = (payload.phone ?? '').trim();
  const body = (payload.body ?? '').trim();
  const needsMessage =
    payload.event_type === 'inbound_message' ||
    payload.event_type === 'outbound_message_approved' ||
    payload.event_type === 'outbound_message_sent';

  if (needsMessage) {
    if (!phone || !body) {
      return null;
    }
    const externalMessageId = (payload.external_message_id ?? '').trim();
    if (!externalMessageId) {
      return null;
    }
  }

  const externalMessageId =
    (payload.external_message_id ?? '').trim() ||
    `${payload.event_type}-${payload.external_conversation_id ?? 'unknown'}-${payload.timestamp ?? Date.now()}`;

  const direction =
    payload.direction ??
    (payload.event_type === 'inbound_message' ? 'inbound' : 'outbound');

  return {
    tenant_slug: payload.tenant_slug.trim().toLowerCase(),
    event_type: payload.event_type,
    external_conversation_id: payload.external_conversation_id?.trim() || null,
    external_message_id: externalMessageId,
    phone,
    contact_name: (payload.contact_name ?? 'Contacto WhatsApp').trim() || 'Contacto WhatsApp',
    body,
    direction,
    timestamp: payload.timestamp?.trim() || new Date().toISOString(),
    metadata: payload.metadata ?? {},
  };
}
