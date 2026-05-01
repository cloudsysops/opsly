import { Job, Worker } from 'bullmq';
import { processIntent } from '../engine.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import type { OpenClawQueueTask } from '../queue.js';

function buildPlannerIntentRequest(task: OpenClawQueueTask) {
  return {
    intent: 'remote_plan' as const,
    context: {
      query: task.objective,
      openclaw_role: 'planner',
      openclaw_source_queue: 'queue-planner',
    },
    tenant_slug: task.tenant_slug,
    tenant_id: task.tenant_id,
    initiated_by: task.initiated_by,
    plan: task.plan,
    request_id: task.request_id,
    agent_role: 'planner' as const,
    metadata: task.metadata,
  };
}

export function startOpenClawPlannerWorker(connection: object): Worker<OpenClawQueueTask> {
  return new Worker<OpenClawQueueTask>(
    'queue-planner',
    async (job: Job<OpenClawQueueTask>) => {
      const t0 = Date.now();
      logWorkerLifecycle('start', 'openclaw-planner', job);
      try {
        const req = buildPlannerIntentRequest(job.data);
        const result = await processIntent(req);
        logWorkerLifecycle('complete', 'openclaw-planner', job, { duration_ms: Date.now() - t0 });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logWorkerLifecycle('fail', 'openclaw-planner', job, {
          duration_ms: Date.now() - t0,
          error: message,
        });
        throw error;
      }
    },
    { connection, concurrency: 2 }
  );
}
