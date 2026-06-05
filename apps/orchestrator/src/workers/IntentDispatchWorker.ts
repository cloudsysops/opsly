/**
 * Procesa jobs `intent_dispatch` en la cola `openclaw` (p. ej. OAR `oar_react` encolados desde MCP).
 */
import { Job } from 'bullmq';
import { processIntent } from '../engine.js';
import { runOpenClawController } from '../openclaw/controller.js';
import { recordOpenClawCompletion, recordOpenClawStage } from '../openclaw/runtime-events.js';
import { createWorker } from './create-worker.js';
import type { IntentRequest, OrchestratorJob } from '../types.js';

export function startIntentDispatchWorker(connection: object) {
  return createWorker({
    queueName: 'openclaw',
    jobName: 'intent_dispatch',
    workerName: 'intent_dispatch',
    connection,
    processFn: async (job: Job) => {
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
      try {
        if (typeof requestId === 'string' && requestId.length > 0) {
          await recordOpenClawStage({
            requestId,
            stage: 'planner',
            status: 'running',
            detail: 'intent accepted by intent_dispatch worker',
          });
        }
        const control = await runOpenClawController(req);
        if (control.intent !== 'oar_react') {
          throw new Error('intent_dispatch: only intent oar_react is supported');
        }

        if (typeof requestId === 'string' && requestId.length > 0) {
          await recordOpenClawStage({
            requestId,
            stage: 'planner',
            status: 'completed',
            detail: `routing intent=${control.intent} (agent=${control.agent.role} tier=${control.agent.model_tier})`,
          });
          await recordOpenClawStage({
            requestId,
            stage: 'skeptic',
            status: 'running',
            detail: `executing oar_react pipeline with agent=${control.agent.role} tier=${control.agent.model_tier}`,
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
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (typeof requestId === 'string' && requestId.length > 0) {
          await recordOpenClawStage({
            requestId,
            stage: 'validator',
            status: 'failed',
            detail: msg,
          });
          await recordOpenClawCompletion({
            requestId,
            status: 'failed',
            latencyMs: Date.now() - startedAt,
            costUsd: 0,
            error: msg,
          });
        }
        throw err;
      }
    },
  });
}
