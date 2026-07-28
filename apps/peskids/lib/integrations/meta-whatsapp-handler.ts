import {
  findMessageByExternalId,
  storeInboundMessage,
} from '@/lib/message-store';
import { ensureLeadForWhatsAppInbound } from '@/lib/integrations/wacrm-lead-link';
import {
  normalizeMetaWebhookPayload,
  whatsappIdempotencyKey,
  type NormalizedWhatsAppMessage,
} from '@intcloudsysops/whatsapp-channel';
import { emitEvent } from '@/lib/events';
import { triggerN8nMessagePipeline } from '@/lib/chat-assistant';

export type MetaHandlerResult =
  | {
      ok: true;
      status: 200;
      processed: number;
      duplicates: number;
      messageIds: string[];
    }
  | { ok: false; status: 400 | 500; error: string };

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

async function persistInbound(
  msg: NormalizedWhatsAppMessage,
  requestId: string
): Promise<{ duplicate: boolean; messageId?: string }> {
  const externalId = whatsappIdempotencyKey(msg.tenantSlug, msg.externalId);
  const existing = await findMessageByExternalId(externalId);
  if (existing) {
    return { duplicate: true, messageId: existing.id };
  }

  const { message, error } = await storeInboundMessage({
    source: 'whatsapp',
    sender_contact: msg.phone,
    sender_name: msg.contactName ?? msg.phone,
    message_text: msg.body,
    external_id: externalId,
  });

  if (error || !message) {
    throw new Error(error ?? 'Failed to store inbound Meta message');
  }

  try {
    await ensureLeadForWhatsAppInbound({
      tenantSlug: msg.tenantSlug,
      phone: msg.phone,
      contactName: msg.contactName ?? msg.phone,
      requestId,
    });
  } catch {
    // Lead link is best-effort; message already persisted.
  }

  // Internal n8n only after persist — never before.
  void triggerN8nMessagePipeline(message.id, msg.body).catch(() => undefined);

  await emitEvent(
    'message.received',
    {
      provider: 'meta_cloud',
      source: 'whatsapp',
      sender_contact: msg.phone,
      message_text: msg.body,
      external_conversation_id: msg.externalConversationId,
      external_message_id: msg.externalId,
      auto_reply_enabled: false,
      auto_reply_sent: false,
      timestamp: msg.timestamp,
    },
    requestId
  );

  return { duplicate: false, messageId: message.id };
}

export async function handleMetaWhatsAppWebhook(
  payload: unknown,
  requestId: string
): Promise<MetaHandlerResult> {
  const slug = tenantSlug();
  const normalized = normalizeMetaWebhookPayload(slug, payload);
  const inbound = normalized.filter(
    (m: NormalizedWhatsAppMessage) => m.direction === 'inbound'
  );

  if (inbound.length === 0 && normalized.length === 0) {
    return { ok: true, status: 200, processed: 0, duplicates: 0, messageIds: [] };
  }

  let duplicates = 0;
  const messageIds: string[] = [];

  try {
    for (const msg of inbound) {
      const result = await persistInbound(msg, requestId);
      if (result.duplicate) duplicates += 1;
      if (result.messageId) messageIds.push(result.messageId);
    }
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : 'persist_failed',
    };
  }

  return {
    ok: true,
    status: 200,
    processed: inbound.length,
    duplicates,
    messageIds,
  };
}
