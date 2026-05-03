import { Job, Worker } from 'bullmq';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { getAgentServiceRegistry } from '../lib/agent-service-registry.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

interface LLMRequest {
  model: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  max_tokens: number;
}

/**
 * LocalClaudeWorker
 *
 * Listens on 'openclaw' queue for jobs with name='local-claude'
 * Invokes Claude API via LLM Gateway service (http://localhost:3010)
 * Flow:
 * 1. Receives job with prompt content
 * 2. Calls LLM Gateway with prompt
 * 3. Writes response to .cursor/responses/
 * 4. Returns response path to orchestrator
 *
 * Depends on:
 * - LLM Gateway service running (http://localhost:3010)
 * - config/agent-services.yaml (claude: http://localhost:5002)
 * - .cursor/responses/ directory for result files
 */

async function processLocalClaudeJob(
  promptContent: string,
  jobId: string,
  agentRole: string,
  model: string,
  registry: ReturnType<typeof getAgentServiceRegistry>
): Promise<{ success: boolean; response_path?: string; error?: string; execution_time_ms?: number }> {
  const startTime = Date.now();
  const responsesDir = path.join(process.cwd(), '.cursor', 'responses');
  const llmGatewayUrl = process.env.LLM_GATEWAY_URL || 'http://localhost:3010';

  console.log(`[LocalClaudeWorker] Processing job ${jobId} with model ${model}`);

  try {
    // Call LLM Gateway
    console.log(`[LocalClaudeWorker] Calling LLM Gateway at ${llmGatewayUrl}...`);
    const llmRequest: LLMRequest = {
      model,
      messages: [
        {
          role: 'user',
          content: promptContent,
        },
      ],
      max_tokens: 4096,
    };

    const response = await fetch(`${llmGatewayUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(llmRequest),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      throw new Error(`LLM Gateway error: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as any;
    const responseText = result.content || result.message || '';

    // Write response to file
    const responsePath = path.join(responsesDir, `response-${jobId}.md`);

    // Ensure responses directory exists
    await fsp.mkdir(responsesDir, { recursive: true });

    // Create response file with metadata
    const responseContent = `---
job_id: ${jobId}
agent_role: ${agentRole}
model: ${model}
created_at: ${new Date().toISOString()}
---

# Claude Response

${responseText}
`;

    await fsp.writeFile(responsePath, responseContent, 'utf-8');

    const executionTime = Date.now() - startTime;

    console.log(`[LocalClaudeWorker] ✅ Job ${jobId} completed in ${executionTime}ms`);
    console.log(`[LocalClaudeWorker] Response: ${responsePath}`);

    const outputTokens = result.tokens_out || result.usage?.output_tokens || 0;
    console.log(`[LocalClaudeWorker] Tokens: ${outputTokens}`);

    return {
      success: true,
      response_path: responsePath,
      execution_time_ms: executionTime,
    };
  } catch (err) {
    const executionTime = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    console.error(`[LocalClaudeWorker] ❌ Job ${jobId} failed:`, errorMsg);

    return {
      success: false,
      error: errorMsg,
      execution_time_ms: executionTime,
    };
  }
}

export function startLocalClaudeWorker(connection: object) {
  const concurrency = getWorkerConcurrency('local-claude') || 2;
  const registry = getAgentServiceRegistry();

  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'local-claude') {
        return;
      }

      const t0 = Date.now();
      logWorkerLifecycle('start', 'local-claude', job);

      const payload = job.data.payload as {
        prompt_content?: string;
        agent_role?: string;
        model?: string;
        job_id?: string;
      };

      const prompt_content = payload.prompt_content || '';
      const agent_role = payload.agent_role || 'architect';
      const model = payload.model || 'claude-opus-4';
      const job_id = payload.job_id || job.id?.toString() || '';

      try {
        await registry.loadConfig();

        const result = await processLocalClaudeJob(
          prompt_content,
          job_id,
          agent_role,
          model,
          registry
        );

        const elapsed = Date.now() - t0;
        logWorkerLifecycle('complete', 'local-claude', job, { duration_ms: elapsed });

        return result;
      } catch (err) {
        const elapsed = Date.now() - t0;
        const errorMsg = err instanceof Error ? err.message : String(err);

        console.error(`[LocalClaudeWorker] ❌ Job ${job.id} error:`, errorMsg);
        logWorkerLifecycle('fail', 'local-claude', job, { duration_ms: elapsed, error: errorMsg });

        throw err;
      }
    },
    {
      connection,
      concurrency,
    }
  );
}
