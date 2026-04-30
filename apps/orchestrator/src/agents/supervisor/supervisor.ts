import { BacklogReaderTool } from '../tools/backlog-reader.tool.js';
import { enqueueJob } from '../../queue.js';
import type { OrchestratorJob } from '../../types.js';

interface Task {
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'blocked' | 'done';
  scope?: string;
  description?: string;
}

interface BacklogResult {
  ok: boolean;
  tasks: Task[];
  total_tasks: number;
  error?: string;
}

type AgentRole = 'dev-api' | 'dev-ui' | 'devops';

function mapScopeToRole(scope?: string): AgentRole {
  if (!scope) return 'dev-api';
  const scopeLower = scope.toLowerCase();
  if (scopeLower === 'api') return 'dev-api';
  if (scopeLower === 'ui') return 'dev-ui';
  if (scopeLower === 'devops') return 'devops';
  return 'dev-api';
}

async function enqueuePendingTasks(): Promise<void> {
  try {
    const backlogResult = (await BacklogReaderTool.execute(undefined)) as BacklogResult;

    if (!backlogResult.ok) {
      console.log('[Supervisor] No tasks in backlog or error reading tasks:', backlogResult.error);
      return;
    }

    const pendingTasks = backlogResult.tasks.filter((t) => t.status === 'pending');
    if (pendingTasks.length === 0) {
      console.log('[Supervisor] All tasks are complete or in-progress');
      return;
    }

    const criticalTasks = pendingTasks.filter((t) => t.priority === 'critical').slice(0, 2);
    const highTasks = pendingTasks.filter((t) => t.priority === 'high').slice(0, 2);
    const tasksToEnqueue = [...criticalTasks, ...highTasks];

    console.log(
      `[Supervisor] Enqueueing ${tasksToEnqueue.length} tasks (${criticalTasks.length} critical, ${highTasks.length} high)`
    );

    for (const task of tasksToEnqueue) {
      const role = mapScopeToRole(task.scope);
      const job: OrchestratorJob = {
        type: 'agent_farm',
        payload: {
          role,
          task: task.title,
          max_steps: 30,
          tenant_slug: 'opsly-internal',
        },
        tenant_slug: 'opsly-internal',
        initiated_by: 'system',
        agent_role: 'executor',
        metadata: {
          supervisor_enqueued: new Date().toISOString(),
          original_priority: task.priority,
          original_scope: task.scope,
        },
      };

      try {
        const enqueued = await enqueueJob(job);
        console.log(`[Supervisor] ✓ Enqueued task: ${task.title.slice(0, 50)}... (job ${enqueued.id})`);
      } catch (err) {
        console.error(`[Supervisor] Failed to enqueue task: ${task.title}`, err);
      }
    }
  } catch (err) {
    console.error('[Supervisor] Error in enqueuePendingTasks:', err);
  }
}

export class Supervisor {
  private tickIntervalMs: number;
  private tickTimer: NodeJS.Timeout | null = null;

  constructor(tickIntervalMs: number = 300000) {
    this.tickIntervalMs = tickIntervalMs;
  }

  start(): void {
    console.log(
      `[Supervisor] Starting with ${this.tickIntervalMs}ms tick (${(this.tickIntervalMs / 1000 / 60).toFixed(1)} minutes)`
    );

    void enqueuePendingTasks();

    this.tickTimer = setInterval(async () => {
      await enqueuePendingTasks();
    }, this.tickIntervalMs);
  }

  stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
      console.log('[Supervisor] Stopped');
    }
  }
}
