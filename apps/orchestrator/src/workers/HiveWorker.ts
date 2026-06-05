import { Job } from 'bullmq';
import { QueenBee } from '../hive/queen-bee.js';
import { createWorker } from './create-worker.js';
import type { OrchestratorJob } from '../types.js';

interface HiveObjectivePayload {
  objective: string;
  tenant_slug: string;
  request_id?: string;
}

export function startHiveWorker(connection: object) {
  const queen = new QueenBee();
  return createWorker({
    jobName: 'hive_objective',
    workerName: 'hive',
    concurrencyKey: 'hive',
    connection,
    async processFn(job: Job) {
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
      return await queen.processObjective(payload);
    },
  });
}
