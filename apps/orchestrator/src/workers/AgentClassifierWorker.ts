import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { classifyTaskCategory } from '@intcloudsysops/ml';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

/** Hash Redis para predicciones sandbox (namespace opsly:sandbox:*). */
const SANDBOX_PREDICTIONS_KEY = 'opsly:sandbox:classifier:predictions';

export interface AgentClassifierJobPayload {
  taskDescription: string;
  tenantSlug?: string;
  request_id?: string;
}

function parsePayload(job: Job): AgentClassifierJobPayload {
  const data = job.data as Partial<AgentClassifierJobPayload> & {
    payload?: Partial<AgentClassifierJobPayload>;
  };
  const taskDescription =
    typeof data.taskDescription === 'string'
      ? data.taskDescription
      : typeof data.payload?.taskDescription === 'string'
        ? data.payload.taskDescription
        : '';
  const tenantSlug =
    typeof data.tenantSlug === 'string'
      ? data.tenantSlug
      : typeof data.payload?.tenantSlug === 'string'
        ? data.payload.tenantSlug
        : 'intcloudsysops';
  const request_id =
    typeof data.request_id === 'string'
      ? data.request_id
      : typeof data.payload?.request_id === 'string'
        ? data.payload.request_id
        : undefined;
  return { taskDescription: taskDescription.trim(), tenantSlug, request_id };
}

/**
 * Cola dedicada `agent-classifier` (distinta de `openclaw`).
 * Requiere Python + modelo en runtime (ver `apps/ml/agents/classifier`).
 * Activar solo con OPSLY_AGENT_CLASSIFIER_WORKER_ENABLED=true.
 */
export function startAgentClassifierWorker(connection: object): {
  worker: Worker;
  closeRedis: () => Promise<void>;
} {
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379');
  const concurrency = getWorkerConcurrency('agent-classifier');

  const worker = new Worker<AgentClassifierJobPayload>(
    'agent-classifier',
    async (job: Job<AgentClassifierJobPayload>) => {
      const t0 = Date.now();
      logWorkerLifecycle('start', 'agent-classifier', job);
      const { taskDescription, tenantSlug, request_id } = parsePayload(job);
      if (taskDescription.length === 0) {
        logWorkerLifecycle('fail', 'agent-classifier', job, {
          duration_ms: Date.now() - t0,
          error: 'taskDescription required',
        });
        throw new Error('agent-classifier: taskDescription required');
      }

      const slug = tenantSlug ?? 'intcloudsysops';

      try {
        const out = await classifyTaskCategory({
          taskDescription,
          tenantSlug: slug,
        });
        const executionTimeMs = Date.now() - t0;

        const record = JSON.stringify({
          category: out.category,
          confidence: out.confidence,
          executionTimeMs,
          request_id,
          job_id: String(job.id),
        });
        await redis.hset(SANDBOX_PREDICTIONS_KEY, `${Date.now()}-${String(job.id)}`, record);

        logWorkerLifecycle('complete', 'agent-classifier', job, {
          duration_ms: executionTimeMs,
        });

        return {
          category: out.category,
          confidence: out.confidence,
          executionTimeMs,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'agent-classifier', job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      }
    },
    { connection, concurrency }
  );

  return {
    worker,
    closeRedis: async () => {
      await redis.quit();
    },
  };
}
