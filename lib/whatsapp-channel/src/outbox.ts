import type { OutboxRecord, WhatsAppSendRequest, WhatsAppSendResult } from './types.js';
import type { WhatsAppProvider } from './types.js';

export type OutboxStore = {
  getById(id: string): Promise<OutboxRecord | null>;
  getByIdempotencyKey(key: string): Promise<OutboxRecord | null>;
  listByTenant(
    tenantSlug: string,
    options?: { status?: OutboxRecord['status']; limit?: number }
  ): Promise<OutboxRecord[]>;
  insertPending(
    record: Omit<OutboxRecord, 'createdAt' | 'updatedAt'> & {
      createdAt?: string;
      updatedAt?: string;
    }
  ): Promise<OutboxRecord>;
  markApproved(id: string): Promise<OutboxRecord | null>;
  markSending(id: string): Promise<void>;
  markSent(id: string, externalId: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
};

/**
 * Approval-first outbox dispatcher.
 * Never marks sent when provider skips/disabled.
 */
export async function enqueueOutboundForApproval(
  store: OutboxStore,
  input: {
    tenantSlug: string;
    toPhone: string;
    body: string;
    parentMessageId?: string;
    externalConversationId?: string;
    idempotencyKey: string;
  }
): Promise<OutboxRecord> {
  const existing = await store.getByIdempotencyKey(input.idempotencyKey);
  if (existing) return existing;

  const now = new Date().toISOString();
  return store.insertPending({
    id: input.idempotencyKey,
    tenantSlug: input.tenantSlug,
    toPhone: input.toPhone,
    body: input.body,
    status: 'pending_approval',
    parentMessageId: input.parentMessageId,
    externalConversationId: input.externalConversationId,
    createdAt: now,
    updatedAt: now,
  });
}

export async function dispatchApprovedOutbound(
  store: OutboxStore,
  provider: WhatsAppProvider,
  outboxId: string,
  request: WhatsAppSendRequest
): Promise<WhatsAppSendResult> {
  const approved = await store.markApproved(outboxId);
  if (!approved) {
    return { ok: false, error: 'outbox_not_found' };
  }
  if (approved.status === 'sent' && approved.externalId) {
    return { ok: true, externalId: approved.externalId };
  }

  await store.markSending(outboxId);
  const result = await provider.sendText(request);

  if (result.skipped || !result.ok) {
    await store.markFailed(
      outboxId,
      result.error ?? result.reason ?? 'send_failed'
    );
    return result;
  }

  if (!result.externalId) {
    await store.markFailed(outboxId, 'missing_external_id_after_send');
    return { ok: false, error: 'missing_external_id_after_send' };
  }

  await store.markSent(outboxId, result.externalId);
  return result;
}

/** In-memory store for unit tests / sandbox. */
export function createMemoryOutboxStore(): OutboxStore {
  const map = new Map<string, OutboxRecord>();
  return {
    async getById(id) {
      return map.get(id) ?? null;
    },
    async getByIdempotencyKey(key) {
      return map.get(key) ?? null;
    },
    async listByTenant(tenantSlug, options) {
      const limit = options?.limit ?? 50;
      return [...map.values()]
        .filter((row) => row.tenantSlug === tenantSlug)
        .filter((row) => (options?.status ? row.status === options.status : true))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
    async insertPending(record) {
      const id = record.id ?? crypto.randomUUID();
      const now = new Date().toISOString();
      const full: OutboxRecord = {
        ...record,
        id,
        createdAt: record.createdAt ?? now,
        updatedAt: now,
      };
      map.set(id, full);
      return full;
    },
    async markApproved(id) {
      const row = map.get(id);
      if (!row) return null;
      if (row.status === 'sent' || row.status === 'sending') return row;
      const next = { ...row, status: 'approved' as const, updatedAt: new Date().toISOString() };
      map.set(id, next);
      return next;
    },
    async markSending(id) {
      const row = map.get(id);
      if (!row) return;
      map.set(id, { ...row, status: 'sending', updatedAt: new Date().toISOString() });
    },
    async markSent(id, externalId) {
      const row = map.get(id);
      if (!row) return;
      map.set(id, {
        ...row,
        status: 'sent',
        externalId,
        updatedAt: new Date().toISOString(),
      });
    },
    async markFailed(id, error) {
      const row = map.get(id);
      if (!row) return;
      map.set(id, {
        ...row,
        status: 'failed',
        error,
        updatedAt: new Date().toISOString(),
      });
    },
  };
}
