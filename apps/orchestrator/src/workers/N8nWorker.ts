import { Job, Worker } from 'bullmq';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

export function startN8nWorker(connection: object) {
  const concurrency = getWorkerConcurrency('n8n');
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'n8n') {
        return;
      }
      const t0 = Date.now();
      logWorkerLifecycle('start', 'n8n', job);
      try {
        const webhookUrl = process.env.N8N_WEBHOOK_URL || '';
        if (!webhookUrl) {
          throw new Error('N8N_WEBHOOK_URL is required');
        }

        const payload = job.data.payload as Record<string, unknown>;
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`N8n webhook failed with status ${response.status}`);
        }

        logWorkerLifecycle('complete', 'n8n', job, { duration_ms: Date.now() - t0 });
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'n8n', job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      }
    },
    { connection, concurrency }
  );
}
