import { Job, Worker, UnrecoverableError } from 'bullmq';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { getAgentServiceRegistry } from '../lib/agent/agent-service-registry.js';
import { createValidationOrchestrator, ValidationDecision } from '../lib/validation/validation-orchestrator.js';
import { logWorkerLifecycle, logWorkerInfo, logWorkerWarn, logWorkerError } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import { waitForFile } from '../lib/local-worker-utils.js';
import { writeValidationGuard } from '../lib/validation/validation-utils.js';

export interface CursorExecutionResponse {
  success: boolean;
  response_path?: string;
  error?: string;
  execution_time_ms?: number;
  validation_decision?: {
    action: 'commit' | 'iterate' | 'escalate';
    reason: string;
    nextPrompt?: string;
  };
}

interface CursorServiceResponse {
  success: boolean;
  response_path?: string;
  error?: string;
}

/**
 * LocalCursorWorker
 *
 * Listens on 'local-cursor' queue for jobs with agent_role='cursor'
 * Invokes the Cursor IDE agent service (running on MacBook, port 5001)
 * Flow:
 * 1. Receives job with prompt content
 * 2. Looks up Cursor service endpoint from AgentServiceRegistry
 * 3. POSTs prompt to CursorAgent Service HTTP endpoint
 * 4. Waits for response in .cursor/responses/ folder
 * 5. Calls ValidationOrchestrator.validateAndDecide()
 * 6. Returns validation decision (commit/iterate/escalate)
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
  intent: string,
  registry: ReturnType<typeof getAgentServiceRegistry>
): Promise<CursorExecutionResponse> {
  const startTime = Date.now();
  const cursorDir = path.join(process.cwd(), '.cursor');
  const validationOrchestrator = createValidationOrchestrator(cursorDir);

  logWorkerInfo('local-cursor', 'Processing job', { jobId, agentRole, intent });

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
      intent,
      model_tier: 'balanced',
    };

    logWorkerInfo('local-cursor', 'Invoking Cursor', { url: `${cursorUrl}/execute` });

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

    const result = (await response.json()) as CursorServiceResponse;

    if (!result.success) {
      throw new Error(`Cursor service error: ${result.error || 'Unknown error'}`);
    }

    logWorkerInfo('local-cursor', 'Cursor service responded successfully');

    // Wait for response file from Cursor Service
    const responsesDir = path.join(cursorDir, 'responses');
    await fsp.mkdir(responsesDir, { recursive: true });

    const expectedResponsePath = path.join(responsesDir, `response-${jobId}.md`);

    logWorkerInfo('local-cursor', 'Waiting for response file', { path: expectedResponsePath });

    const responseContent = await waitForFile(expectedResponsePath, cursorService.timeout_ms);

    if (!responseContent) {
      throw new Error(`Response file not found after timeout: ${expectedResponsePath}`);
    }

    logWorkerInfo('local-cursor', 'Response file received', { bytes: responseContent.length });

    // Validate response and decide next action
    logWorkerInfo('local-cursor', 'Starting validation', { jobId });

    const decision = await validationOrchestrator.validateAndDecide(
      jobId,
      agentRole,
      expectedResponsePath,
      1, // initial iteration
      3, // max iterations
    );

    logWorkerInfo('local-cursor', 'Validation decision', { action: decision.action, reason: decision.reason });

    // Write validation guard to prevent double-commits
    const validationDir = path.join(cursorDir, '.validation');
    await fsp.mkdir(validationDir, { recursive: true });
    await writeValidationGuard(jobId, decision.action, validationDir);

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      response_path: expectedResponsePath,
      execution_time_ms: executionTime,
      validation_decision: {
        action: decision.action,
        reason: decision.reason,
        nextPrompt: decision.nextPrompt,
      },
    };
  } catch (err) {
    const executionTime = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    logWorkerError('local-cursor', 'Job failed', { jobId, error: errorMsg });

    return {
      success: false,
      error: errorMsg,
      execution_time_ms: executionTime,
    };
  }
}

let workerInstance: Worker | null = null;
let workerClosed = false;

export function startLocalCursorWorker(connection: object): Worker {
  // Return existing instance if already created
  if (workerInstance && !workerClosed) {
    return workerInstance;
  }

  const concurrency = getWorkerConcurrency('local-cursor') || 2;
  const registry = getAgentServiceRegistry();

  logWorkerInfo('local-cursor', 'Initialized', { concurrency });

  const worker = new Worker(
    'local-cursor',
    async (job: Job) => {
      const t0 = Date.now();
      logWorkerLifecycle('start', 'local-cursor', job);

      const payload = job.data as {
        payload?: {
          prompt_content?: string;
          agent_role?: string;
          max_steps?: number;
          job_id?: string;
          intent?: string;
        };
      };

      // Validate payload
      if (!payload.payload) {
        throw new UnrecoverableError('Missing payload in job data');
      }

      const data = payload.payload;
      const prompt_content = data.prompt_content || '';
      const agent_role = data.agent_role || 'executor';
      const max_steps = data.max_steps || 5;
      const job_id = data.job_id || job.id?.toString() || '';
      const intent = data.intent || 'execute';

      // Validate required fields
      if (!prompt_content) {
        throw new UnrecoverableError('Missing prompt_content');
      }

      logWorkerInfo('local-cursor', 'Processing job', { jobId: job.id, intent });

      try {
        await registry.loadConfig();

        const result = await processLocalCursorJob(
          prompt_content,
          job_id,
          agent_role,
          max_steps,
          intent,
          registry
        );

        const elapsed = Date.now() - t0;
        logWorkerLifecycle('complete', 'local-cursor', job, { duration_ms: elapsed });

        if (result.success) {
          logWorkerInfo('local-cursor', 'Job completed', { jobId: job.id, duration_ms: elapsed, decision: result.validation_decision?.action });
        } else {
          logWorkerError('local-cursor', 'Job failed', { jobId: job.id, error: result.error });
        }

        return result;
      } catch (err) {
        const elapsed = Date.now() - t0;
        const errorMsg = err instanceof Error ? err.message : String(err);

        if (err instanceof UnrecoverableError) {
          logWorkerError('local-cursor', 'Unrecoverable error in job', { jobId: job.id, error: errorMsg });
          logWorkerLifecycle('fail', 'local-cursor', job, {
            duration_ms: elapsed,
            error: errorMsg,
          });
        } else {
          logWorkerError('local-cursor', 'Job error', { jobId: job.id, error: errorMsg });
          logWorkerLifecycle('fail', 'local-cursor', job, { duration_ms: elapsed, error: errorMsg });
        }

        throw err;
      }
    },
    {
      connection,
      concurrency,
    }
  );

  worker.on('completed', (job) => {
    logWorkerInfo('local-cursor', 'Job completed', { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    logWorkerError('local-cursor', 'Job failed', { jobId: job?.id, error: err.message });
  });

  workerInstance = worker;

  return worker;
}

/**
 * Export class for manual instantiation if needed
 */
export class LocalCursorWorkerClass extends Worker {
  constructor(connection: object) {
    const concurrency = getWorkerConcurrency('local-cursor') || 2;
    const registry = getAgentServiceRegistry();

    super(
      'local-cursor',
      async (job: Job) => {
        const data = job.data as {
          payload?: {
            prompt_content?: string;
            agent_role?: string;
            max_steps?: number;
            job_id?: string;
            intent?: string;
          };
        };

        if (!data.payload) {
          throw new UnrecoverableError('Missing payload');
        }

        const payload = data.payload;
        await registry.loadConfig();

        return processLocalCursorJob(
          payload.prompt_content || '',
          payload.job_id || job.id?.toString() || '',
          payload.agent_role || 'executor',
          payload.max_steps || 5,
          payload.intent || 'execute',
          registry
        );
      },
      {
        connection,
        concurrency,
      }
    );
  }
}
