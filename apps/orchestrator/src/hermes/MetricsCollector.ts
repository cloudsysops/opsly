import type { HermesTask } from '@intcloudsysops/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logHermesEvent } from './hermes-log.js';

export interface TaskResultStub {
  ok: boolean;
  duration_ms: number;
  agent: string;
}

export class MetricsCollector {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly sprint: number
  ) {}

  private get platform() {
    return this.supabase.schema('platform');
  }

  async recordTaskCompletion(task: HermesTask, result: TaskResultStub): Promise<void> {
    if (!result.ok) {
      await this.platform.from('hermes_metrics').insert({
        agent: result.agent,
        sprint: this.sprint,
        tasks_completed: 0,
        tasks_failed: 1,
        avg_duration_ms: result.duration_ms,
        success_rate: 0,
      });
      logHermesEvent('hermes_metric', {
        task_id: task.id,
        agent: result.agent,
        outcome: 'failed',
      });
      return;
    }
    await this.platform.from('hermes_metrics').insert({
      agent: result.agent,
      sprint: this.sprint,
      tasks_completed: 1,
      tasks_failed: 0,
      avg_duration_ms: result.duration_ms,
      success_rate: 1,
    });
    logHermesEvent('hermes_metric', {
      task_id: task.id,
      agent: result.agent,
      outcome: 'completed',
    });
  }

  async getAgentMetrics(agent: string): Promise<{
    tasks_completed: number;
    tasks_failed: number;
  }> {
    const { data, error } = await this.platform
      .from('hermes_metrics')
      .select('tasks_completed, tasks_failed')
      .eq('agent', agent)
      .eq('sprint', this.sprint);
    if (error) {
      throw new Error(`hermes_metrics: ${error.message}`);
    }
    let tasks_completed = 0;
    let tasks_failed = 0;
    for (const row of data ?? []) {
      tasks_completed += Number(row.tasks_completed ?? 0);
      tasks_failed += Number(row.tasks_failed ?? 0);
    }
    return { tasks_completed, tasks_failed };
  }

  /** Métricas de consultas NotebookLM (tabla `hermes_metrics`, agente lógico `notebooklm`). */
  async recordNotebookLmCall(ok: boolean, latency_ms: number): Promise<void> {
    await this.platform.from('hermes_metrics').insert({
      agent: 'notebooklm',
      sprint: this.sprint,
      tasks_completed: ok ? 1 : 0,
      tasks_failed: ok ? 0 : 1,
      avg_duration_ms: latency_ms,
      success_rate: ok ? 1 : 0,
    });
    logHermesEvent('hermes_notebooklm_metric', { ok, latency_ms });
  }
}
