import { Job } from 'bullmq';
import { processIntent } from '../engine.js';
import { createWorker } from './create-worker.js';
import type { IntentRequest } from '../types.js';

interface SkepticWorkerPayload {
  intent_request: IntentRequest;
}

export function startOpenClawSkepticWorker(connection: object) {
  return createWorker({
    queueName: 'queue-skeptic',
    workerName: 'openclaw-skeptic',
    concurrencyKey: 'openclaw-skeptic',
    connection,
    processFn: async (job: Job) => {
      const payload = job.data as SkepticWorkerPayload;
      const req = payload.intent_request;
      if (req.intent !== 'notify' && req.intent !== 'remote_plan') {
        throw new Error('openclaw skeptic only supports notify or remote_plan intents');
      }
      return processIntent(req);
    },
  });
}
