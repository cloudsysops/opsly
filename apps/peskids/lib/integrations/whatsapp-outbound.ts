/**
 * Single outbound path for Meta WhatsApp: approval-first outbox → Meta provider.
 * Never marks sent when flags/credentials are off (provider returns skipped).
 */
import {
  MetaCloudWhatsAppProvider,
  dispatchApprovedOutbound,
  enqueueOutboundForApproval,
  resolveMetaCloudForTenant,
  whatsappIdempotencyKey,
  type OutboxRecord,
  type WhatsAppSendResult,
} from '@intcloudsysops/whatsapp-channel';
import { createSupabaseOutboxStore } from '@/lib/integrations/whatsapp-outbox-store';

export type WhatsAppOutboundDispatchResult = {
  outbox: OutboxRecord;
  send: WhatsAppSendResult | null;
};

function tenantSlugFromEnv(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

export async function enqueueWhatsAppDraft(input: {
  tenantSlug?: string;
  toPhone: string;
  body: string;
  parentMessageId: string;
  externalConversationId?: string;
}): Promise<OutboxRecord> {
  const tenantSlug = input.tenantSlug ?? tenantSlugFromEnv();
  const store = createSupabaseOutboxStore();
  const idempotencyKey = whatsappIdempotencyKey(
    tenantSlug,
    `outbox:${input.parentMessageId}:${hashBody(input.body)}`
  );

  return enqueueOutboundForApproval(store, {
    tenantSlug,
    toPhone: input.toPhone,
    body: input.body,
    parentMessageId: input.parentMessageId,
    externalConversationId: input.externalConversationId,
    idempotencyKey,
  });
}

/**
 * Human "send" = explicit approval. Dispatches via Meta only; never fabricates sent.
 */
export async function approveAndDispatchWhatsApp(input: {
  tenantSlug?: string;
  toPhone: string;
  body: string;
  parentMessageId: string;
  externalConversationId?: string;
  outboxId?: string;
}): Promise<WhatsAppOutboundDispatchResult> {
  const tenantSlug = input.tenantSlug ?? tenantSlugFromEnv();
  const store = createSupabaseOutboxStore();
  const cfg = resolveMetaCloudForTenant(tenantSlug);
  const provider = new MetaCloudWhatsAppProvider(cfg);

  let outbox: OutboxRecord;
  if (input.outboxId) {
    const existing = await store.getById(input.outboxId);
    if (!existing) {
      throw new Error('outbox_not_found');
    }
    outbox = existing;
  } else {
    outbox = await enqueueWhatsAppDraft({
      tenantSlug,
      toPhone: input.toPhone,
      body: input.body,
      parentMessageId: input.parentMessageId,
      externalConversationId: input.externalConversationId,
    });
  }

  const send = await dispatchApprovedOutbound(store, provider, outbox.id, {
    tenantSlug,
    toPhone: input.toPhone,
    body: input.body,
    idempotencyKey: outbox.id,
    externalConversationId: input.externalConversationId,
  });

  const refreshed = (await store.getById(outbox.id)) ?? outbox;
  return { outbox: refreshed, send };
}

export async function listWhatsAppOutbox(input?: {
  tenantSlug?: string;
  status?: OutboxRecord['status'];
  limit?: number;
}): Promise<OutboxRecord[]> {
  const tenantSlug = input?.tenantSlug ?? tenantSlugFromEnv();
  const store = createSupabaseOutboxStore();
  return store.listByTenant(tenantSlug, {
    status: input?.status,
    limit: input?.limit ?? 50,
  });
}

function hashBody(body: string): string {
  let h = 0;
  for (let i = 0; i < body.length; i += 1) {
    h = (h * 31 + body.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}
