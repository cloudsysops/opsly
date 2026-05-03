import { Job, Worker } from 'bullmq';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { getAgentServiceRegistry } from '../lib/agent-service-registry.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

export interface CursorExecutionResponse {
  success: boolean;
  response_path?: string;
  error?: string;
  execution_time_ms?: number;
}

/**
 * LocalCursorWorker
 *
 * Listens on 'openclaw' queue for jobs with name='local-cursor'
 * Invokes the Cursor IDE agent service (running on MacBook, port 5001)
 * Flow:
 * 1. Receives job with prompt content
 * 2. Looks up Cursor service endpoint from AgentServiceRegistry
 * 3. POSTs prompt to CursorAgent Service HTTP endpoint
 * 4. Waits for response in .cursor/responses/ folder
 * 5. Returns response path to orchestrator
 *
 * Depends on:
 * - config/agent-services.yaml (cursor: http://localhost:5001)
 * - scripts/cursor-agent-service.ts running on MacBook
 * - .cursor/responses/ directory for result files
 */

async function processLocalCursorJob(
  promptContent: string,
  jobId: string,
  agentRole: string,
  maxSteps: number,
  registry: ReturnType<typeof getAgentServiceRegistry>
): Promise<CursorExecutionResponse> {
  const startTime = Date.now();

  console.log(`[LocalCursorWorker] Processing job ${jobId}: ${agentRole}`);

  try {
    // Get Cursor service endpoint from registry
    const cursorService = await registry.getService('cursor');
    if (!cursorService) {
      throw new Error('Cursor service not configured or disabled');
    }

    const cursorUrl = await registry.getServiceUrl('cursor');
    if (!cursorUrl) {
      throw new Error('Cursor service URL not found');
    }

    // Check if service is healthy
    const isHealthy = await registry.isServiceHealthy('cursor');
    if (!isHealthy) {
      throw new Error('Cursor service is not responding to health checks');
    }

    // Prepare execution request
    const request = {
      prompt_content: promptContent,
      job_id: jobId,
      agent_role: agentRole,
      max_steps: maxSteps,
    };

    console.log(`[LocalCursorWorker] Invoking Cursor at ${cursorUrl}/execute`);

    // Call Cursor Agent Service via HTTP
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      cursorService.timeout_ms
    );

    const response = await fetch(`${cursorUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = (await response.json()) as CursorExecutionResponse;

    if (!result.success) {
      throw new Error(`Cursor service error: ${result.error}`);
    }

    const executionTime = Date.now() - startTime;

    console.log(
      `[LocalCursorWorker] ✅ Job ${jobId} completed in ${executionTime}ms`
    );
    console.log(`[LocalCursorWorker] Response: ${result.response_path}`);

    return {
      success: true,
      response_path: result.response_path,
      execution_time_ms: executionTime,
    };
  } catch (err) {
    const executionTime = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    console.error(`[LocalCursorWorker] ❌ Job ${jobId} failed:`, errorMsg);

    return {
      success: false,
      error: errorMsg,
      execution_time_ms: executionTime,
    };
  }
}

export function startLocalCursorWorker(connection: object) {
  const concurrency = getWorkerConcurrency('local-cursor') || 2;
  const registry = getAgentServiceRegistry();

  console.log(`[LocalCursorWorker] Initialized with concurrency=${concurrency}`);

  return new Worker(
    'openclaw',
    async (job: Job) => {
      // Debug: log ALL jobs to see what we're receiving
      console.log(`[LocalCursorWorker] Received job: name='${job.name}', id='${job.id}', data.type='${(job.data as any)?.type}'`);

      if (job.name !== 'local-cursor') {
        console.log(`[LocalCursorWorker] Skipping: expected 'local-cursor' but got '${job.name}'`);
        return;
      }

      console.log(`[LocalCursorWorker] ✅ Processing local-cursor job ${job.id}`);

      const t0 = Date.now();
      logWorkerLifecycle('start', 'local-cursor', job);

      const payload = job.data.payload as {
        prompt_content?: string;
        agent_role?: string;
        max_steps?: number;
        job_id?: string;
      };

      const prompt_content = payload.prompt_content || '';
      const agent_role = payload.agent_role || 'executor';
      const max_steps = payload.max_steps || 5;
      const job_id = payload.job_id || job.id?.toString() || '';

      try {
        await registry.loadConfig();

        const result = await processLocalCursorJob(
          prompt_content,
          job_id,
          agent_role,
          max_steps,
          registry
        );

        const elapsed = Date.now() - t0;
        logWorkerLifecycle('complete', 'local-cursor', job, { duration_ms: elapsed });

        return result;
      } catch (err) {
        const elapsed = Date.now() - t0;
        const errorMsg = err instanceof Error ? err.message : String(err);

        console.error(`[LocalCursorWorker] ❌ Job ${job.id} error:`, errorMsg);
        logWorkerLifecycle('fail', 'local-cursor', job, { duration_ms: elapsed, error: errorMsg });

        throw err;
      }
    },
    {
      connection,
      concurrency,
    }
  );
}
