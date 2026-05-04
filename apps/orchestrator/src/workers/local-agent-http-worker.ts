/**
 * LocalAgentHTTPWorker - Unified worker for all local agent types
 *
 * Listens on 'local-agents' queue for jobs with names:
 * - local_cursor
 * - local_claude
 * - local_copilot
 * - local_opencode
 *
 * Routes to appropriate HTTP endpoint based on job.name
 */

import { Job, Worker, UnrecoverableError } from 'bullmq';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { getAgentServiceRegistry } from '../lib/agent-service-registry.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

interface LocalAgentPayload {
  prompt_content?: string;
  agent_role?: string;
  max_steps?: number;
  model?: string;
  job_id?: string;
  goal?: string;
  context?: Record<string, unknown>;
}

interface LocalAgentResponse {
  success: boolean;
  response_path?: string;
  error?: string;
  execution_time_ms?: number;
}

let unifiedWorkerInstance: Worker | null = null;
let unifiedWorkerClosed = false;

async function processLocalAgentJob(
  jobType: string,
  prompt_content: string,
  job_id: string,
  agent_role: string,
  registry: ReturnType<typeof getAgentServiceRegistry>
): Promise<LocalAgentResponse> {
  const startTime = Date.now();

  try {
    await registry.loadConfig();

    // Route to appropriate service based on job type
    let serviceUrl: string | null = null;
    let llmGatewayUrl = process.env.LLM_GATEWAY_URL || 'http://localhost:3010';

    if (jobType === 'local_cursor') {
      const service = await registry.getService('cursor');
      serviceUrl = service?.url ?? null;
      if (!serviceUrl) {
        throw new Error('Cursor service not configured');
      }

      console.log(`[LocalAgentWorker] Cursor: invoking ${serviceUrl}/execute`);
      const response = await fetch(`${serviceUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_content,
          agent_role,
          max_steps: 5,
          job_id,
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        throw new Error(`Cursor service error: ${response.status}`);
      }

      const result = await response.json() as any;
      return {
        success: true,
        response_path: result.response_path,
        execution_time_ms: Date.now() - startTime,
      };
    } else if (jobType === 'local_claude') {
      console.log(`[LocalAgentWorker] Claude: calling LLM Gateway at ${llmGatewayUrl}`);
      const response = await fetch(`${llmGatewayUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-opus-4',
          messages: [{ role: 'user', content: prompt_content }],
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`LLM Gateway error: ${response.status}`);
      }

      const result = await response.json() as any;
      const responseText = result.content || result.message || '';

      // Write response to file
      const responsesDir = path.join(process.cwd(), '.cursor', 'responses');
      await fsp.mkdir(responsesDir, { recursive: true });

      const responsePath = path.join(responsesDir, `response-${job_id}.md`);
      const responseContent = `---
job_id: ${job_id}
agent_role: ${agent_role}
model: claude-opus-4
created_at: ${new Date().toISOString()}
---

# Claude Response

${responseText}
`;

      await fsp.writeFile(responsePath, responseContent, 'utf-8');

      return {
        success: true,
        response_path: responsePath,
        execution_time_ms: Date.now() - startTime,
      };
    } else {
      throw new UnrecoverableError(`Unknown job type: ${jobType}`);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[LocalAgentWorker] Job ${job_id} error:`, errorMsg);

    return {
      success: false,
      error: errorMsg,
      execution_time_ms: Date.now() - startTime,
    };
  }
}

export function startLocalAgentsUnifiedWorker(connection: object): Worker {
  // Return existing instance if already created
  if (unifiedWorkerInstance && !unifiedWorkerClosed) {
    return unifiedWorkerInstance;
  }

  // Calculate total concurrency
  const cursorConcurrency = getWorkerConcurrency('local-cursor') || 2;
  const claudeConcurrency = getWorkerConcurrency('local-claude') || 2;
  const copilotConcurrency = getWorkerConcurrency('local-copilot') || 1;
  const opencodeConcurrency = getWorkerConcurrency('local-opencode') || 1;
  const totalConcurrency = cursorConcurrency + claudeConcurrency + copilotConcurrency + opencodeConcurrency;

  console.log(
    `[LocalAgentWorker] Unified worker: cursor=${cursorConcurrency} + claude=${claudeConcurrency} + copilot=${copilotConcurrency} + opencode=${opencodeConcurrency} = ${totalConcurrency}`
  );

  const worker = new Worker(
    'local-agents',
    async (job: Job) => {
      const jobType = job.name; // Should be local_cursor, local_claude, etc.
      const data = job.data as { payload?: LocalAgentPayload };

      // Validate job type
      const validTypes = ['local_cursor', 'local_claude', 'local_copilot', 'local_opencode'];
      if (!validTypes.includes(jobType)) {
        throw new UnrecoverableError(`Invalid job type: ${jobType}`);
      }

      // Validate payload
      if (!data.payload) {
        throw new UnrecoverableError('Missing payload in job data');
      }

      const payload = data.payload;
      const prompt_content = payload.prompt_content || '';
      const agent_role = payload.agent_role || 'executor';
      const max_steps = payload.max_steps || 5;
      const job_id = payload.job_id || job.id?.toString() || '';

      if (!prompt_content) {
        throw new UnrecoverableError('Empty prompt_content');
      }

      const registry = getAgentServiceRegistry();
      const t0 = Date.now();

      console.log(`[LocalAgentWorker] Processing ${jobType} job ${job.id}`);
      logWorkerLifecycle('start', 'local-agents', job);

      try {
        const result = await processLocalAgentJob(jobType, prompt_content, job_id, agent_role, registry);

        const elapsed = Date.now() - t0;
        logWorkerLifecycle('complete', 'local-agents', job, { duration_ms: elapsed });

        if (result.success) {
          console.log(`[LocalAgentWorker] ✅ ${jobType} job ${job.id} completed in ${elapsed}ms`);
        } else {
          console.error(`[LocalAgentWorker] ❌ ${jobType} job ${job.id} failed: ${result.error}`);
        }

        return result;
      } catch (err) {
        const elapsed = Date.now() - t0;
        const errorMsg = err instanceof Error ? err.message : String(err);

        if (err instanceof UnrecoverableError) {
          console.error(`[LocalAgentWorker] ⚠️ Unrecoverable error in ${jobType} job ${job.id}: ${errorMsg}`);
          logWorkerLifecycle('fail', 'local-agents', job, { duration_ms: elapsed, error: errorMsg });
        } else {
          console.error(`[LocalAgentWorker] ❌ ${jobType} job ${job.id} error: ${errorMsg}`);
          logWorkerLifecycle('fail', 'local-agents', job, { duration_ms: elapsed, error: errorMsg });
        }

        throw err;
      }
    },
    {
      connection,
      concurrency: totalConcurrency,
    }
  );

  worker.on('closed', () => {
    console.log('[LocalAgentWorker] Unified worker closed');
    unifiedWorkerClosed = true;
    unifiedWorkerInstance = null;
  });

  worker.on('error', (err) => {
    console.error('[LocalAgentWorker] Worker error:', err);
  });

  console.log('[LocalAgentWorker] Unified worker ready on local-agents queue');
  unifiedWorkerInstance = worker;
  unifiedWorkerClosed = false;

  return worker;
}

/**
 * @deprecated Use startLocalAgentsUnifiedWorker instead
 */
export function startLocalCursorWorker(connection: object): Worker {
  return startLocalAgentsUnifiedWorker(connection);
}

/**
 * @deprecated Use startLocalAgentsUnifiedWorker instead
 */
export function startLocalClaudeWorker(connection: object): Worker {
  return startLocalAgentsUnifiedWorker(connection);
}
