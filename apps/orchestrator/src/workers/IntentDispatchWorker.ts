/**
 * Procesa jobs `intent_dispatch` en la cola `openclaw` (p. ej. OAR `oar_react` encolados desde MCP).
 */
import { Job, Worker } from 'bullmq';
import { processIntent } from '../engine.js';
import { runOpenClawController } from '../openclaw/controller.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import type { IntentRequest, OrchestratorJob } from '../types.js';

export function startIntentDispatchWorker(connection: object): Worker {
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'intent_dispatch') {
        return;
      }
      const t0 = Date.now();
      logWorkerLifecycle('start', 'intent_dispatch', job);
      try {
        const data = job.data as OrchestratorJob;
        if (data.type !== 'intent_dispatch') {
          return;
        }
        const raw = data.payload.intent_request;
        if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
          throw new TypeError('intent_dispatch: payload.intent_request must be an object');
        }
        const req = raw as IntentRequest;
        const control = runOpenClawController(req);
        if (control.intent !== 'oar_react') {
          throw new Error('intent_dispatch: only intent oar_react is supported');
        }
        const result = await processIntent(req, { invokedFromIntentDispatchWorker: true });
        logWorkerLifecycle('complete', 'intent_dispatch', job, {
          duration_ms: Date.now() - t0,
        });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'intent_dispatch', job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      }
    },
    { connection, concurrency: 1 }
  );
}
