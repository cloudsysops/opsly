/**
 * Supabase adapter for WhatsApp approval-first outbox (platform schema).
 * Migration 0093 must be applied before production use — sandbox-first: table may be absent.
 */
import type { OutboxRecord, OutboxStore } from '@intcloudsysops/whatsapp-channel';
import { supabaseServer } from '@/lib/supabase';

type OutboxRow = {
  id: string;
  tenant_slug: string;
  to_phone: string;
  body: string;
  status: OutboxRecord['status'];
  external_id: string | null;
  external_conversation_id: string | null;
  parent_message_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

type QueryResult<T> = Promise<{ data: T; error: { message: string } | null }>;

/** Minimal chain used by this adapter (platform table not in generated Database yet). */
type OutboxQuery = {
  select: (columns: string) => OutboxQuery;
  insert: (row: Record<string, unknown>) => OutboxQuery;
  update: (row: Record<string, unknown>) => OutboxQuery;
  eq: (column: string, value: string) => OutboxQuery;
  order: (column: string, opts: { ascending: boolean }) => OutboxQuery;
  limit: (n: number) => OutboxQuery & QueryResult<OutboxRow[] | null>;
  maybeSingle: () => QueryResult<OutboxRow | null>;
  single: () => QueryResult<OutboxRow | null>;
};

function mapRow(row: OutboxRow): OutboxRecord {
  return {
    id: row.id,
    tenantSlug: row.tenant_slug,
    toPhone: row.to_phone,
    body: row.body,
    status: row.status,
    externalId: row.external_id ?? undefined,
    externalConversationId: row.external_conversation_id ?? undefined,
    parentMessageId: row.parent_message_id ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function outboxTable(): OutboxQuery {
  const client = supabaseServer() as unknown as {
    schema: (name: string) => { from: (tableName: string) => OutboxQuery };
  };
  return client.schema('platform').from('whatsapp_outbound_outbox');
}

export function createSupabaseOutboxStore(): OutboxStore {
  const store: OutboxStore = {
    async getById(id: string): Promise<OutboxRecord | null> {
      const { data, error } = await outboxTable().select('*').eq('id', id).maybeSingle();
      if (error || !data) return null;
      return mapRow(data);
    },

    async getByIdempotencyKey(key: string): Promise<OutboxRecord | null> {
      return store.getById(key);
    },

    async listByTenant(
      tenantSlug: string,
      options?: { status?: OutboxRecord['status']; limit?: number }
    ): Promise<OutboxRecord[]> {
      const limit = options?.limit ?? 50;
      let query = outboxTable()
        .select('*')
        .eq('tenant_slug', tenantSlug)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query.limit(limit);
      if (error || !data) return [];
      return data.map(mapRow);
    },

    async insertPending(
      record: Omit<OutboxRecord, 'createdAt' | 'updatedAt'> & {
        createdAt?: string;
        updatedAt?: string;
      }
    ): Promise<OutboxRecord> {
      const now = new Date().toISOString();
      const { data, error } = await outboxTable()
        .insert({
          id: record.id,
          tenant_slug: record.tenantSlug,
          to_phone: record.toPhone,
          body: record.body,
          status: 'pending_approval',
          external_conversation_id: record.externalConversationId ?? null,
          parent_message_id: record.parentMessageId ?? null,
          created_at: record.createdAt ?? now,
          updated_at: now,
        })
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? 'Failed to insert WhatsApp outbox row');
      }
      return mapRow(data);
    },

    async markApproved(id: string): Promise<OutboxRecord | null> {
      const existing = await store.getById(id);
      if (!existing) return null;
      if (existing.status === 'sent' || existing.status === 'sending') return existing;

      const { data, error } = await outboxTable()
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (error || !data) return null;
      return mapRow(data);
    },

    async markSending(id: string): Promise<void> {
      await outboxTable()
        .update({ status: 'sending', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
    },

    async markSent(id: string, externalId: string): Promise<void> {
      await outboxTable()
        .update({
          status: 'sent',
          external_id: externalId,
          updated_at: new Date().toISOString(),
          error: null,
        })
        .eq('id', id)
        .select('*')
        .maybeSingle();
    },

    async markFailed(id: string, errorMessage: string): Promise<void> {
      await outboxTable()
        .update({
          status: 'failed',
          error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .maybeSingle();
    },
  };

  return store;
}
