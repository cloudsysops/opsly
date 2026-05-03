import { Worker } from 'bullmq';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { getAgentServiceRegistry } from '../lib/agent-service-registry';

export interface LocalClaudeWorkerPayload {
  prompt_path: string;
  prompt_content: string;
  agent_role: string;
  max_steps: number;
  job_id: string;
  model?: string;
}

interface LLMRequest {
  model: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  max_tokens: number;
}

/**
 * LocalClaudeWorker
 *
 * Invokes Claude API directly for architecture, planning, and code review tasks
 * Flow:
 * 1. Receives job with prompt content
 * 2. Calls Claude API with the prompt
 * 3. Writes response to .cursor/responses/ folder
 * 4. Returns response path to orchestrator
 *
 * Depends on:
 * - ANTHROPIC_API_KEY environment variable
 * - config/agent-services.yaml (claude service config)
 * - .cursor/responses/ directory for result files
 */
export class LocalClaudeWorker {
  private worker: Worker<LocalClaudeWorkerPayload> | null = null;
  private registry = getAgentServiceRegistry();
  private responsesDir: string;
  private llmGatewayUrl: string;

  constructor(
    private queueName: string = 'local-claude',
    private redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379',
  ) {
    this.responsesDir = path.join(process.cwd(), '.cursor', 'responses');
    this.llmGatewayUrl = process.env.LLM_GATEWAY_URL || 'http://localhost:3010';
  }

  /**
   * Start the worker to listen for jobs
   */
  async start(): Promise<void> {
    await this.registry.loadConfig();

    this.worker = new Worker<LocalClaudeWorkerPayload>(this.queueName, this.processJob.bind(this), {
      connection: {
        url: this.redisUrl,
      },
    });

    this.worker.on('completed', (job) => {
      console.log(`[LocalClaudeWorker] ✅ Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[LocalClaudeWorker] ❌ Job ${job?.id} failed:`, err);
    });

    console.log(`[LocalClaudeWorker] 🚀 Started on queue: ${this.queueName}`);
  }

  /**
   * Process a job: call Claude API and save response
   */
  private async processJob(job: any): Promise<{ success: boolean; response_path?: string; error?: string; execution_time_ms?: number }> {
    const startTime = Date.now();
    const payload = job.data as LocalClaudeWorkerPayload;
    const { prompt_content, agent_role, job_id, model = 'claude-opus-4' } = payload;

    console.log(`[LocalClaudeWorker] Processing job ${job_id} with model ${model}`);

    try {
      // Record telemetry
      console.log(`[LocalClaudeWorker] Starting job ${job_id} with model ${model}`);

      // Call LLM Gateway
      console.log(`[LocalClaudeWorker] Calling LLM Gateway at ${this.llmGatewayUrl}...`);
      const llmRequest: LLMRequest = {
        model,
        messages: [
          {
            role: 'user',
            content: prompt_content,
          },
        ],
        max_tokens: 4096,
      };

      const response = await fetch(`${this.llmGatewayUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(llmRequest),
      });

      if (!response.ok) {
        throw new Error(`LLM Gateway error: ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as any;
      const responseText = result.content || result.message || '';

      // Write response to file
      const responsePath = path.join(this.responsesDir, `response-${job_id}.md`);

      // Ensure responses directory exists
      await fsp.mkdir(this.responsesDir, { recursive: true });

      // Create response file with metadata
      const responseContent = `---
job_id: ${job_id}
agent_role: ${agent_role}
model: ${model}
created_at: ${new Date().toISOString()}
---

# Claude Response

${responseText}
`;

      await fsp.writeFile(responsePath, responseContent, 'utf-8');

      const executionTime = Date.now() - startTime;

      // Record success
      const outputTokens = result.tokens_out || result.usage?.output_tokens || 0;
      console.log(`[LocalClaudeWorker] Job ${job_id} completed. Tokens: ${outputTokens}`);

      console.log(`[LocalClaudeWorker] ✅ Job ${job_id} completed in ${executionTime}ms`);
      console.log(`[LocalClaudeWorker] Response: ${responsePath}`);

      return {
        success: true,
        response_path: responsePath,
        execution_time_ms: executionTime,
      };
    } catch (err) {
      const executionTime = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);

      console.error(`[LocalClaudeWorker] ❌ Job ${job_id} failed:`, errorMsg);

      console.error(`[LocalClaudeWorker] Job ${job_id} error: ${errorMsg}`);

      return {
        success: false,
        error: errorMsg,
        execution_time_ms: executionTime,
      };
    }
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      console.log('[LocalClaudeWorker] Stopped');
    }
  }
}

/**
 * Create and start a LocalClaudeWorker instance
 */
export async function startLocalClaudeWorker(): Promise<LocalClaudeWorker> {
  const worker = new LocalClaudeWorker();
  await worker.start();
  return worker;
}
