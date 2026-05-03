import type { Worker } from 'bullmq';
import { startLocalAgentHttpWorker } from './local-agent-http-worker.js';

export function startLocalClaudeWorker(connection: object): Worker {
  return startLocalAgentHttpWorker('claude', connection);
}
