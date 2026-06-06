import type { EventLogRow, OpslyEvent, TenantSlug } from '../types/index.js';

export interface EventLogStore {
  append(event: OpslyEvent): Promise<void>;
  listByTenant(tenantSlug: TenantSlug, limit?: number): Promise<readonly OpslyEvent[]>;
}

export function eventToRow(event: OpslyEvent): EventLogRow {
  return {
    id: event.id,
    request_id: event.requestId,
    tenant_slug: event.tenantSlug,
    intent: event.intent,
    payload: { ...event.payload },
    status: event.status,
    created_at: event.createdAt,
    metadata: event.metadata ? { ...event.metadata } : null,
  };
}

export function rowToEvent(row: EventLogRow): OpslyEvent {
  return {
    id: row.id,
    requestId: row.request_id,
    tenantSlug: row.tenant_slug,
    intent: row.intent,
    payload: row.payload,
    status: row.status as OpslyEvent['status'],
    createdAt: row.created_at,
    metadata: row.metadata ?? undefined,
  };
}

/** In-memory store — tests and local demo only. */
export class InMemoryEventLogStore implements EventLogStore {
  private readonly events: OpslyEvent[] = [];

  async append(event: OpslyEvent): Promise<void> {
    this.events.push(event);
  }

  async listByTenant(
    tenantSlug: TenantSlug,
    limit = 50,
  ): Promise<readonly OpslyEvent[]> {
    return this.events
      .filter((event) => event.tenantSlug === tenantSlug)
      .slice(-limit);
  }

  clear(): void {
    this.events.length = 0;
  }
}

interface SupabaseResult<TData> {
  data: TData | null;
  error: { message: string } | null;
}

type SupabaseInsertResult = PromiseLike<SupabaseResult<unknown>>;
type SupabaseSelectResult = PromiseLike<SupabaseResult<EventLogRow[]>>;

export interface SupabaseEventLogClient {
  from(table: string): {
    insert(row: EventLogRow): SupabaseInsertResult;
    select(columns: string): {
      eq(column: string, value: string): {
        order(column: string, options: { ascending: boolean }): {
          limit(count: number): SupabaseSelectResult;
        };
      };
    };
  };
}

export interface SupabaseEventLogStoreOptions {
  client: SupabaseEventLogClient;
  tableName?: string;
}

/** Production-oriented adapter — inject Supabase client from apps/api. */
export class SupabaseEventLogStore implements EventLogStore {
  private readonly tableName: string;

  constructor(private readonly options: SupabaseEventLogStoreOptions) {
    this.tableName = options.tableName ?? 'opsly_event_log';
  }

  async append(event: OpslyEvent): Promise<void> {
    const { error } = await this.options.client
      .from(this.tableName)
      .insert(eventToRow(event));

    if (error) {
      throw new Error(`Supabase event log insert failed: ${error.message}`);
    }
  }

  async listByTenant(
    tenantSlug: TenantSlug,
    limit = 50,
  ): Promise<readonly OpslyEvent[]> {
    const { data, error } = await this.options.client
      .from(this.tableName)
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Supabase event log select failed: ${error.message}`);
    }

    return (data ?? []).map(rowToEvent);
  }
}
