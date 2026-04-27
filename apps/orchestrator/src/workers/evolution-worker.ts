import { Job, Worker } from 'bullmq';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

export interface EvolutionJobPayload {
  type: 'detect-gaps' | 'research-gap' | 'propose-solution';
  tenant_slug: string;
  request_id: string;
  objective?: string;
  metadata?: Record<string, unknown>;
}

/**
 * SAFE-AEF Phase 1 stub.
 *
 * Worker intentionally returns "stub" outputs and does not execute
 * autonomous mutations or destructive actions.
 */
export function startEvolutionWorker(connection: object): Worker {
  const concurrency = getWorkerConcurrency('evolution');
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'evolution') {
        return;
      }
      const t0 = Date.now();
      logWorkerLifecycle('start', 'evolution', job);

      const data = job.data as { payload?: EvolutionJobPayload };
      const payload = data.payload;
      if (!payload || typeof payload !== 'object') {
        logWorkerLifecycle('fail', 'evolution', job, {
          duration_ms: Date.now() - t0,
          error: 'missing payload',
        });
        throw new Error('evolution job: payload required');
      }

      const result = {
        status: 'stub',
        stage: payload.type,
        tenant_slug: payload.tenant_slug,
        request_id: payload.request_id,
        note: 'SAFE-AEF phase 1: no autonomous write/deploy actions enabled.',
      };

      logWorkerLifecycle('complete', 'evolution', job, {
        duration_ms: Date.now() - t0,
      });
      return result;
    },
    { connection, concurrency }
  );
}
