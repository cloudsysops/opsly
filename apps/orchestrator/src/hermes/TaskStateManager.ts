import type { HermesTask, HermesTaskState, HermesTaskType } from '@intcloudsysops/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logHermesEvent } from './hermes-log.js';
import { isValidHermesTransition } from './task-state-transitions.js';

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

export class TaskStateManager {
  constructor(private readonly supabase: SupabaseClient) {}

  private get platform() {
    return this.supabase.schema('platform');
  }

  async getTask(taskId: string): Promise<HermesTask | null> {
    const { data, error } = await this.platform
      .from('hermes_state')
      .select('*')
      .eq('task_id', taskId)
      .maybeSingle();
    if (error) {
      throw new Error(`hermes_state get: ${error.message}`);
    }
    if (!data) {
      return null;
    }
    return rowToTask(data as Parameters<typeof rowToTask>[0]);
  }

  async listTasksByStatus(status: HermesTaskState): Promise<HermesTask[]> {
    const { data, error } = await this.platform
      .from('hermes_state')
      .select('*')
      .eq('state', status);
    if (error) {
      throw new Error(`hermes_state list: ${error.message}`);
    }
    return (data ?? []).map((r) => rowToTask(r as Parameters<typeof rowToTask>[0]));
  }

  async updateTaskState(
    taskId: string,
    currentState: HermesTaskState,
    newState: HermesTaskState,
    patch: {
      agent?: string | null;
      result?: Record<string, unknown> | null;
      started_at?: string | null;
      completed_at?: string | null;
    } = {}
  ): Promise<void> {
    if (!isValidHermesTransition(currentState, newState)) {
      throw new Error(`Invalid Hermes transition ${currentState} → ${newState} for ${taskId}`);
    }
    const now = new Date().toISOString();
    const { error } = await this.platform
      .from('hermes_state')
      .update({
        state: newState,
        updated_at: now,
        agent: patch.agent,
        result: patch.result,
        started_at: patch.started_at,
        completed_at: patch.completed_at,
      })
      .eq('task_id', taskId)
      .eq('state', currentState);
    if (error) {
      throw new Error(`hermes_state update: ${error.message}`);
    }
    logHermesEvent('hermes_task_state', {
      task_id: taskId,
      from: currentState,
      to: newState,
    });
  }

  async recordExecution(
    taskId: string,
    agent: string,
    result: Record<string, unknown>
  ): Promise<void> {
    const { error } = await this.platform.from('hermes_audit').insert({
      event_type: 'execution',
      task_id: taskId,
      agent,
      change: result,
    });
    if (error) {
      throw new Error(`hermes_audit insert: ${error.message}`);
    }
  }
}
