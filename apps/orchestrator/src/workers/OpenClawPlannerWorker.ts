import { Job } from 'bullmq';
import { processIntent } from '../engine.js';
import { createWorker } from './create-worker.js';
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

export function startOpenClawPlannerWorker(connection: object) {
  return createWorker({
    queueName: 'queue-planner',
    workerName: 'openclaw-planner',
    concurrencyKey: 'openclaw-planner',
    connection,
    processFn: async (job: Job) => {
      const req = buildPlannerIntentRequest(job.data as OpenClawQueueTask);
      return processIntent(req);
    },
  });
}
