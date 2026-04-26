import type { HermesTask, HermesTaskState, HermesTaskType } from '@intcloudsysops/types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getTenantContext } from '../lib/tenant-context.js';

function rowToTask(row: {
  task_id: string;
  name: string;
  task_type: string;
  state: string;
  assignee: string | null;
  effort: string;
  agent: string | null;
  payload: Record<string, unknown>;
  idempotency_key: string | null;
  request_id: string | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}): HermesTask {
  return {
    id: row.task_id,
    name: row.name,
    type: (row.task_type as HermesTaskType) ?? 'unknown',
    state: row.state as HermesTaskState,
    assignee: row.assignee ?? undefined,
    effort:
      row.effort === 'S' || row.effort === 'M' || row.effort === 'L' || row.effort === 'XL'
        ? row.effort
        : 'unknown',
    idempotency_key: row.idempotency_key ?? undefined,
    request_id: row.request_id ?? undefined,
    tenant_id: row.tenant_id ?? undefined,
    payload: row.payload,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Lecturas tenant-scoped sobre `platform.hermes_state` (patrón repositorio; alineado a TenantContext ALS).
 */
export class HermesStateRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  private get platform() {
    return this.supabase.schema('platform');
  }

  /**
   * Una fila por `task_id` y `tenant_id` del contexto ALS actual.
   */
  async findByTaskId(taskId: string): Promise<HermesTask | null> {
    const { tenantId } = getTenantContext();
    const { data, error } = await this.platform
      .from('hermes_state')
      .select('*')
      .eq('task_id', taskId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`hermes_state findByTaskId: ${error.message}`);
    }
    if (!data) {
      return null;
    }
    return rowToTask(data as Parameters<typeof rowToTask>[0]);
  }
}
