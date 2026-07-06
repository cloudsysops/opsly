import { triggerN8nMessagePipeline } from '@/lib/chat-assistant';
import { emitEvent } from '@/lib/events';
import {
  findMessageByExternalId,
  storeDraftReply,
  storeInboundMessage,
  storeOutboundMessageWithExternalId,
  type StoredMessage,
} from '@/lib/message-store';
import { supabaseServer } from '@/lib/supabase';
import { ensureLeadForWhatsAppInbound } from '@/lib/integrations/wacrm-lead-link';
import {
  normalizeWacrmWebhookPayload,
  wacrmExternalId,
  type NormalizedWacrmMessage,
  type WacrmWebhookPayload,
} from '@/lib/integrations/wacrm-webhook-contract';

export type WacrmHandlerResult =
  | {
      ok: true;
      status: 200 | 201 | 202;
      duplicate: boolean;
      messageId?: string;
      leadId?: string;
      event_type: string;
    }
  | {
      ok: false;
      status: 400 | 403 | 500;
      error: string;
    };

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

async function logWacrmAuditEvent(
  action: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = supabaseServer();
    const logAudit = (
      supabase as unknown as {
        rpc: (name: string, args: Record<string, unknown>) => Promise<unknown>;
      }
    ).rpc;
    await logAudit('log_audit_event', {
      p_tenant_slug: tenantSlug(),
      p_actor_id: '00000000-0000-0000-0000-000000000000',
      p_action: action,
      p_resource_type: 'wacrm_webhook',
      p_resource_id: String(metadata.external_message_id ?? 'unknown'),
      p_metadata: metadata,
    });
  } catch {
    // Audit RPC is optional in some environments.
  }
}

async function handleInboundMessage(
  normalized: NormalizedWacrmMessage,
  requestId: string
): Promise<WacrmHandlerResult> {
  const externalId = wacrmExternalId(normalized.external_message_id);
  const existing = await findMessageByExternalId(externalId);
  if (existing) {
    return {
      ok: true,
      status: 200,
      duplicate: true,
      messageId: existing.id,
      event_type: normalized.event_type,
    };
  }

  const { message, error } = await storeInboundMessage({
    source: 'whatsapp',
    sender_contact: normalized.phone,
    sender_name: normalized.contact_name,
    message_text: normalized.body,
    external_id: externalId,
  });

  if (error || !message) {
    return { ok: false, status: 500, error: error ?? 'Failed to store inbound message' };
  }

  let leadId: string | undefined;
  try {
    const lead = await ensureLeadForWhatsAppInbound({
      tenantSlug: normalized.tenant_slug,
      phone: normalized.phone,
      contactName: normalized.contact_name,
      requestId,
    });
    leadId = lead.leadId;
  } catch (leadError) {
    console.error('wacrm lead link failed', {
      request_id: requestId,
      error: leadError instanceof Error ? leadError.message : 'unknown',
    });
  }

  void triggerN8nMessagePipeline(message.id, normalized.body).catch(() => undefined);

  await emitEvent(
    'message.received',
    {
      provider: 'wacrm',
      source: 'whatsapp',
      sender_contact: normalized.phone,
      message_text: normalized.body,
      external_conversation_id: normalized.external_conversation_id,
      external_message_id: normalized.external_message_id,
      auto_reply_enabled: false,
      auto_reply_sent: false,
      timestamp: normalized.timestamp,
      lead_id: leadId ?? null,
    },
    requestId
  );

  void logWacrmAuditEvent('wacrm.inbound_message', {
    message_id: message.id,
    external_message_id: normalized.external_message_id,
    lead_id: leadId ?? null,
    tenant_slug: normalized.tenant_slug,
  });

  return {
    ok: true,
    status: 201,
    duplicate: false,
    messageId: message.id,
    leadId,
    event_type: normalized.event_type,
  };
}

async function handleOutboundApproved(
  normalized: NormalizedWacrmMessage,
  requestId: string
): Promise<WacrmHandlerResult> {
  const externalId = wacrmExternalId(normalized.external_message_id);
  const existing = await findMessageByExternalId(externalId);
  if (existing) {
    return {
      ok: true,
      status: 200,
      duplicate: true,
      messageId: existing.id,
      event_type: normalized.event_type,
    };
  }

  const parent = await findLatestInboundForContact(normalized.phone);
  if (!parent) {
    return {
      ok: false,
      status: 400,
      error: 'No inbound conversation found for outbound_message_approved',
    };
  }

  const { draft, error } = await storeDraftReply(parent.id, normalized.body, 'whatsapp', {
    senderName: 'wacrm',
    status: 'approved',
  });

  if (error || !draft) {
    return { ok: false, status: 500, error: error ?? 'Failed to store approved draft' };
  }

  await emitEvent(
    'message.approved',
    {
      provider: 'wacrm',
      message_id: draft.id,
      parent_message_id: parent.id,
      auto_send: false,
    },
    requestId
  );

  return {
    ok: true,
    status: 202,
    duplicate: false,
    messageId: draft.id,
    event_type: normalized.event_type,
  };
}

async function handleOutboundSent(
  normalized: NormalizedWacrmMessage,
  requestId: string
): Promise<WacrmHandlerResult> {
  const externalId = wacrmExternalId(normalized.external_message_id);
  const existing = await findMessageByExternalId(externalId);
  if (existing) {
    return {
      ok: true,
      status: 200,
      duplicate: true,
      messageId: existing.id,
      event_type: normalized.event_type,
    };
  }

  const parent = await findLatestInboundForContact(normalized.phone);
  if (!parent) {
    return {
      ok: false,
      status: 400,
      error: 'No inbound conversation found for outbound_message_sent',
    };
  }

  const { message, error } = await storeOutboundMessageWithExternalId({
    parentId: parent.id,
    source: 'whatsapp',
    sender_contact: normalized.phone,
    replyText: normalized.body,
    aiGenerated: false,
    senderName: 'wacrm',
    status: 'sent',
    external_id: externalId,
  });

  if (error || !message) {
    return { ok: false, status: 500, error: error ?? 'Failed to store outbound message' };
  }

  const supabase = supabaseServer();
  await supabase
    .from('messages')
    .update({ status: 'sent' })
    .eq('id', parent.id)
    .eq('tenant_id', tenantSlug());

  await emitEvent(
    'message.sent',
    {
      provider: 'wacrm',
      message_id: message.id,
      parent_message_id: parent.id,
      manual_send: true,
    },
    requestId
  );

  return {
    ok: true,
    status: 202,
    duplicate: false,
    messageId: message.id,
    event_type: normalized.event_type,
  };
}

async function findLatestInboundForContact(phone: string): Promise<StoredMessage | null> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('messages')
    .select(
      'id, source, sender_name, sender_contact, message_text, created_at, direction, parent_message_id, ai_generated, status'
    )
    .eq('tenant_id', tenantSlug())
    .eq('sender_contact', phone)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as StoredMessage;
}

async function handleConversationEvent(
  normalized: NormalizedWacrmMessage,
  requestId: string
): Promise<WacrmHandlerResult> {
  await emitEvent(
    `wacrm.${normalized.event_type}`,
    {
      provider: 'wacrm',
      external_conversation_id: normalized.external_conversation_id,
      phone: normalized.phone || null,
      metadata: normalized.metadata,
      timestamp: normalized.timestamp,
    },
    requestId
  );

  return {
    ok: true,
    status: 202,
    duplicate: false,
    event_type: normalized.event_type,
  };
}

export async function handleWacrmWebhookEvent(
  payload: WacrmWebhookPayload,
  requestId: string
): Promise<WacrmHandlerResult> {
  const normalized = normalizeWacrmWebhookPayload(payload);
  if (!normalized) {
    return { ok: false, status: 400, error: 'Invalid wacrm payload for event_type' };
  }

  if (normalized.tenant_slug !== tenantSlug()) {
    return { ok: false, status: 403, error: 'Tenant mismatch' };
  }

  switch (normalized.event_type) {
    case 'inbound_message':
      return handleInboundMessage(normalized, requestId);
    case 'outbound_message_approved':
      return handleOutboundApproved(normalized, requestId);
    case 'outbound_message_sent':
      return handleOutboundSent(normalized, requestId);
    case 'conversation_created':
    case 'conversation_status_changed':
      return handleConversationEvent(normalized, requestId);
    default:
      return { ok: false, status: 400, error: 'Unsupported event_type' };
  }
}
