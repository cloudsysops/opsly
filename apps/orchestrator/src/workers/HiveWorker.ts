import { Job, Worker } from 'bullmq';
import { QueenBee } from '../hive/queen-bee.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import type { OrchestratorJob } from '../types.js';

interface HiveObjectivePayload {
  objective: string;
  tenant_slug: string;
  request_id?: string;
}

export function startHiveWorker(connection: object): Worker {
  const queen = new QueenBee();
  const concurrency = getWorkerConcurrency('hive');
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'hive_objective') return;
      const t0 = Date.now();
      logWorkerLifecycle('start', 'hive', job);
      try {
        const data = job.data as OrchestratorJob;
        if (data.type !== 'hive_objective') return;
        const rawPayload = data.payload as Record<string, unknown>;
        const objective = typeof rawPayload.objective === 'string' ? rawPayload.objective.trim() : '';
        const tenantSlug =
          typeof rawPayload.tenant_slug === 'string' ? rawPayload.tenant_slug.trim() : '';
        if (objective.length === 0 || tenantSlug.length === 0) {
          throw new Error('hive_objective: payload.objective and payload.tenant_slug are required');
        }
        const payload: HiveObjectivePayload = {
          objective,
          tenant_slug: tenantSlug,
          request_id: typeof rawPayload.request_id === 'string' ? rawPayload.request_id : undefined,
        };
        const result = await queen.processObjective(payload);
        logWorkerLifecycle('complete', 'hive', job, { duration_ms: Date.now() - t0 });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'hive', job, { duration_ms: Date.now() - t0, error: msg });
        throw err;
      }
    },
    { connection, concurrency }
  );
}
