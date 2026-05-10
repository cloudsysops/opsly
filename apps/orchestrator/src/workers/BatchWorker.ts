import { Worker as ProcessWorker, Job as BullJob } from 'bullmq';
import { connection } from '../queue.js';
import { enqueueJobBulk } from '../queue.js';
import type { BatchProcessPayload, OrchestratorJob } from '../types.js';

export function createBatchWorker() {
  const worker = new ProcessWorker(
    'openclaw',
    async (job: BullJob<BatchProcessPayload>) => {
      const startTime = Date.now();
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          service: 'orchestrator',
          event: 'worker_start',
          worker: 'batch_process',
          bullmq_job_id: String(job.id),
          batch_id: job.data.batch_id,
        })
      );

      const { jobs, chunk_size = 10 } = job.data;
      const results: { job: OrchestratorJob; bullJobId: string }[] = [];

      for (let i = 0; i < jobs.length; i += chunk_size) {
        const chunk = jobs.slice(i, i + chunk_size);
        const chunkResults = await enqueueJobBulk(chunk);
        results.push(...chunkResults);
        await job.updateProgress(Math.min(i + chunk_size, jobs.length) / jobs.length);
      }

      const duration_ms = Date.now() - startTime;
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          service: 'orchestrator',
          event: 'worker_complete',
          worker: 'batch_process',
          bullmq_job_id: String(job.id),
          status: 'completed',
          batch_id: job.data.batch_id,
          kpi_dimension: { success: true, tenant_slug: job.data.tenant_slug },
          duration_ms,
          extra: { total: jobs.length, enqueued: results.length },
        })
      );

      return { batch_id: job.data.batch_id, enqueued: results.length, results };
    },
    {
      connection,
      concurrency: 1,
      limiter: { max: 1, duration: 60000 },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[BatchWorker] completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[BatchWorker] failed: ${job?.id}`, err);
  });

  return worker;
}

export function startBatchWorker() {
  return createBatchWorker();
}
