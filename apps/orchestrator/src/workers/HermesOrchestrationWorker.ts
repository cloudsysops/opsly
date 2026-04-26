import { Job, Worker } from 'bullmq';
import { createHermesOrchestrator } from '../hermes/HermesOrchestrator.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';

export function startHermesOrchestrationWorker(connection: object): Worker {
  return new Worker(
    'hermes-orchestration',
    async (job: Job) => {
      if (job.name !== 'hermes-tick') {
        return;
      }
      const t0 = Date.now();
      logWorkerLifecycle('start', 'hermes-orchestration', job);
      try {
        const orchestrator = createHermesOrchestrator();
        await orchestrator.initialize();
        await orchestrator.runTick();
        logWorkerLifecycle('complete', 'hermes-orchestration', job, {
          duration_ms: Date.now() - t0,
        });
      } catch (err) {
        logWorkerLifecycle('fail', 'hermes-orchestration', job, {
          duration_ms: Date.now() - t0,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
    { connection }
  );
}
