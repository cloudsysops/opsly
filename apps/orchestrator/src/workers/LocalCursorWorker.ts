import type { Worker } from 'bullmq';
import { startLocalAgentHttpWorker } from './local-agent-http-worker.js';

export function startLocalCursorWorker(connection: object): Worker {
  return startLocalAgentHttpWorker('cursor', connection);
}
