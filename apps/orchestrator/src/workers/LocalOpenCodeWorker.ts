import type { Worker } from 'bullmq';
import { startLocalAgentHttpWorker } from './local-agent-http-worker.js';

export function startLocalOpenCodeWorker(connection: object): Worker {
  return startLocalAgentHttpWorker('opencode', connection);
}
