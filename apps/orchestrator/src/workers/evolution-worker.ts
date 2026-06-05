import { Job } from 'bullmq';
import { createWorker } from './create-worker.js';

export interface EvolutionJobPayload {
  type: 'detect-gaps' | 'research-gap' | 'propose-solution';
  tenant_slug: string;
  request_id: string;
  objective?: string;
  metadata?: Record<string, unknown>;
}

async function processEvolutionJob(job: Job) {
  const data = job.data as { payload?: EvolutionJobPayload };
  const payload = data.payload;
  if (!payload || typeof payload !== 'object') {
    throw new Error('evolution job: payload required');
  }

  return {
    status: 'stub',
    stage: payload.type,
    tenant_slug: payload.tenant_slug,
    request_id: payload.request_id,
    note: 'SAFE-AEF phase 1: no autonomous write/deploy actions enabled.',
  };
}

export function startEvolutionWorker(connection: object) {
  return createWorker({
    jobName: 'evolution',
    workerName: 'evolution',
    concurrencyKey: 'evolution',
    connection,
    processFn: processEvolutionJob,
  });
}
