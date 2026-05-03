import { Worker } from 'bullmq';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { getAgentServiceRegistry } from '../lib/agent-service-registry';

export interface LocalCursorWorkerPayload {
  prompt_path: string;
  prompt_content: string;
  agent_role: string;
  max_steps: number;
  job_id: string;
}

export interface CursorExecutionRequest {
  prompt_path: string;
  prompt_content: string;
  agent_role: string;
  max_steps: number;
  job_id: string;
}

export interface CursorExecutionResponse {
  success: boolean;
  response_path?: string;
  error?: string;
  output?: string;
  execution_time_ms?: number;
}

/**
 * LocalCursorWorker
 *
 * Invokes the Cursor IDE agent service (running on MacBook, port 5001)
 * Flow:
 * 1. Receives job with prompt_path and content
 * 2. Looks up Cursor service endpoint from AgentServiceRegistry
 * 3. POSTs prompt to CursorAgent Service HTTP endpoint
 * 4. Polls for response in .cursor/responses/ folder
 * 5. Returns response path to orchestrator
 *
 * Depends on:
 * - config/agent-services.yaml (curl: http://localhost:5001)
 * - scripts/cursor-agent-service.ts running on MacBook
 * - .cursor/responses/ directory for result files
 */
export class LocalCursorWorker {
  private worker: Worker<LocalCursorWorkerPayload> | null = null;
  private registry = getAgentServiceRegistry();
  private responsePollInterval = 1000; // ms between polling for response
  private responsePollTimeout = 60000; // max 60 sec to wait for response

  constructor(
    private queueName: string = 'local-cursor',
    private redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379',
  ) {}

  /**
   * Start the worker to listen for jobs
   */
  async start(): Promise<void> {
    await this.registry.loadConfig();

    this.worker = new Worker<LocalCursorWorkerPayload>(this.queueName, this.processJob.bind(this), {
      connection: {
        url: this.redisUrl,
      },
    });

    this.worker.on('completed', (job) => {
      console.log(`[LocalCursorWorker] ✅ Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[LocalCursorWorker] ❌ Job ${job?.id} failed:`, err);
    });

    console.log(`[LocalCursorWorker] 🚀 Started on queue: ${this.queueName}`);
  }

  /**
   * Process a job: invoke Cursor service and wait for response
   */
  private async processJob(job: any): Promise<CursorExecutionResponse> {
    const startTime = Date.now();
    const payload = job.data as LocalCursorWorkerPayload;
    const { prompt_path, prompt_content, agent_role, max_steps, job_id } = payload;

    console.log(`[LocalCursorWorker] Processing job ${job_id}: ${prompt_path}`);

    try {
      console.log(`[LocalCursorWorker] Starting job ${job_id} with agent role: ${agent_role}`);

      // Get Cursor service endpoint from registry
      const cursorService = await this.registry.getService('cursor');
      if (!cursorService) {
        throw new Error('Cursor service not configured or disabled');
      }

      const cursorUrl = await this.registry.getServiceUrl('cursor');
      if (!cursorUrl) {
        throw new Error('Cursor service URL not found');
      }

      // Check if service is healthy
      const isHealthy = await this.registry.isServiceHealthy('cursor');
      if (!isHealthy) {
        throw new Error('Cursor service is not responding to health checks');
      }

      // Prepare execution request
      const request: CursorExecutionRequest = {
        prompt_path,
        prompt_content,
        agent_role,
        max_steps,
        job_id,
      };

      console.log(`[LocalCursorWorker] Invoking Cursor at ${cursorUrl}/execute`);

      // Call Cursor Agent Service via HTTP
      const response = await this.invokeCursorService(cursorUrl, request, cursorService.timeout_ms);

      if (!response.success) {
        throw new Error(`Cursor service error: ${response.error}`);
      }

      const executionTime = Date.now() - startTime;

      console.log(`[LocalCursorWorker] Job ${job_id} completed in ${executionTime}ms`);

      console.log(`[LocalCursorWorker] ✅ Job ${job_id} completed in ${executionTime}ms`);
      console.log(`[LocalCursorWorker] Response: ${response.response_path}`);

      return {
        success: true,
        response_path: response.response_path,
        execution_time_ms: executionTime,
      };
    } catch (err) {
      const executionTime = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);

      console.error(`[LocalCursorWorker] ❌ Job ${job_id} failed:`, errorMsg);

      console.error(`[LocalCursorWorker] Job ${job_id} error: ${errorMsg}`);

      return {
        success: false,
        error: errorMsg,
        execution_time_ms: executionTime,
      };
    }
  }

  /**
   * Make HTTP request to CursorAgent Service
   */
  private async invokeCursorService(
    serviceUrl: string,
    request: CursorExecutionRequest,
    timeoutMs: number,
  ): Promise<CursorExecutionResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${serviceUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = (await response.json()) as CursorExecutionResponse;
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      console.log('[LocalCursorWorker] Stopped');
    }
  }
}

/**
 * Create and start a LocalCursorWorker instance
 */
export async function startLocalCursorWorker(): Promise<LocalCursorWorker> {
  const worker = new LocalCursorWorker();
  await worker.start();
  return worker;
}
