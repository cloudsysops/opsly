import type { Worker } from 'bullmq';
import { startLocalAgentsUnifiedWorker } from './local-agent-http-worker.js';

/** @deprecated Prefer importing `startLocalAgentsUnifiedWorker` from `./local-agent-http-worker.js`. */
export function startLocalClaudeWorker(connection: object): Worker {
  return startLocalAgentsUnifiedWorker(connection);
}
