import { Job, Worker } from 'bullmq';
import { processIntent } from '../engine.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import type { IntentRequest } from '../types.js';

interface SkepticWorkerPayload {
  intent_request: IntentRequest;
}

export function startOpenClawSkepticWorker(connection: object): Worker {
  return new Worker(
    'queue:skeptic',
    async (job: Job) => {
      const t0 = Date.now();
      logWorkerLifecycle('start', 'openclaw-skeptic', job);
      try {
        const payload = job.data as SkepticWorkerPayload;
        const req = payload.intent_request;
        if (req.intent !== 'notify' && req.intent !== 'remote_plan') {
          throw new Error('openclaw skeptic only supports notify or remote_plan intents');
        }
        const result = await processIntent(req);
        logWorkerLifecycle('complete', 'openclaw-skeptic', job, {
          duration_ms: Date.now() - t0,
        });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'openclaw-skeptic', job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      }
    },
    { connection, concurrency: 1 }
  );
}
