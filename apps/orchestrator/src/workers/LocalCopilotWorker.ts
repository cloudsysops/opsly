import type { Worker } from 'bullmq';
import { startLocalAgentHttpWorker } from './local-agent-http-worker.js';

export function startLocalCopilotWorker(connection: object): Worker {
  return startLocalAgentHttpWorker('copilot', connection);
}
