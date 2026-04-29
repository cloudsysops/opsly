/**
 * Procesa jobs `intent_dispatch` en la cola `openclaw` (p. ej. OAR `oar_react` encolados desde MCP).
 */
import { Job, Worker } from 'bullmq';
import { processIntent } from '../engine.js';
import { runOpenClawController } from '../openclaw/controller.js';
import {
  recordOpenClawCompletion,
  recordOpenClawStage,
} from '../openclaw/runtime-events.js';
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
        const requestId = req.request_id;
        const startedAt = Date.now();
        if (typeof requestId === 'string' && requestId.length > 0) {
          await recordOpenClawStage({
            requestId,
            stage: 'planner',
            status: 'running',
            detail: 'intent accepted by intent_dispatch worker',
          });
        }
        const control = runOpenClawController(req);
        if (control.intent !== 'oar_react') {
          throw new Error('intent_dispatch: only intent oar_react is supported');
        }
        if (typeof requestId === 'string' && requestId.length > 0) {
          await recordOpenClawStage({
            requestId,
            stage: 'planner',
            status: 'completed',
            detail: `routing intent=${control.intent}`,
          });
          await recordOpenClawStage({
            requestId,
            stage: 'skeptic',
            status: 'running',
            detail: 'executing oar_react pipeline',
          });
        }
        const result = await processIntent(req, { invokedFromIntentDispatchWorker: true });
        if (typeof requestId === 'string' && requestId.length > 0) {
          await recordOpenClawStage({
            requestId,
            stage: 'skeptic',
            status: 'completed',
            detail: 'oar_react finished',
          });
          await recordOpenClawStage({
            requestId,
            stage: 'validator',
            status: 'running',
            detail: 'validating execution result',
          });
          await recordOpenClawStage({
            requestId,
            stage: 'validator',
            status: 'completed',
            detail:
              result.oar?.state === 'completed'
                ? `oar completed: ${result.oar.final_answer ?? 'success'}`
                : 'validation ok',
          });
          await recordOpenClawCompletion({
            requestId,
            status: 'completed',
            latencyMs: Date.now() - startedAt,
            costUsd: 0,
          });
        }
        logWorkerLifecycle('complete', 'intent_dispatch', job, {
          duration_ms: Date.now() - t0,
        });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const requestId = (() => {
          const data = job.data as OrchestratorJob;
          const raw = data.payload.intent_request;
          if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
            return null;
          }
          const req = raw as IntentRequest;
          return typeof req.request_id === 'string' && req.request_id.length > 0 ? req.request_id : null;
        })();
        if (requestId !== null) {
          await recordOpenClawStage({
            requestId,
            stage: 'validator',
            status: 'failed',
            detail: msg,
          });
          await recordOpenClawCompletion({
            requestId,
            status: 'failed',
            latencyMs: Date.now() - t0,
            costUsd: 0,
            error: msg,
          });
        }
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
