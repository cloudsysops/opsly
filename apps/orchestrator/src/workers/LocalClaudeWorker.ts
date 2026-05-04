import { Job, Worker } from 'bullmq';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import { ValidationOrchestrator } from '../lib/validation-orchestrator.js';

/**
 * LocalClaudeWorker
 *
 * Listens on 'local-agents' queue for jobs with name='local_claude'
 * Invokes Claude API directly (supports both LLM Gateway and direct API)
 * Flow:
 * 1. Receives job with prompt + model_tier
 * 2. Calls Claude API directly with retry logic
 * 3. Writes response to .cursor/responses/
 * 4. Calls ValidationOrchestrator to validate and decide
 * 5. Returns { success: true, decision }
 *
 * Environment:
 * - ANTHROPIC_API_KEY: Claude API key (required for direct API mode)
 * - LLM_GATEWAY_URL: Optional LLM Gateway URL (fallback)
 * - CLAUDE_API_URL: Optional custom Claude API endpoint (default: https://api.anthropic.com)
 */

interface LocalClaudeJobPayload {
  prompt: string;
  intent?: string;
  model_tier?: 'economy' | 'balanced' | 'premium';
  max_steps?: number;
  agent_role?: string;
  job_id?: string;
}

interface ValidationDecision {
  action: 'commit' | 'iterate' | 'escalate';
  nextPrompt?: string;
  reason: string;
  metadata: {
    iterationCount: number;
    validationTime: number;
    failedChecks?: string[];
  };
}

function selectModelByTier(tier: string = 'balanced'): string {
  switch (tier) {
    case 'economy':
      return 'claude-opus-4';
    case 'premium':
      return 'claude-opus-4-latest';
    case 'balanced':
    default:
      return 'claude-sonnet-4';
  }
}

async function callClaudeApiDirect(
  prompt: string,
  model: string,
  maxTokens: number = 2048,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const apiUrl = process.env.CLAUDE_API_URL || 'https://api.anthropic.com';

  try {
    console.log(`[LocalClaudeWorker] Calling Claude API with model ${model} (attempt ${retryCount + 1}/${maxRetries + 1})`);

    const response = await fetch(`${apiUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: AbortSignal.timeout(60000), // 60s timeout
    });

    if (!response.ok) {
      const errorData = await response.text();

      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < maxRetries) {
        const backoffMs = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        console.warn(`[LocalClaudeWorker] Rate limited. Retrying after ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return callClaudeApiDirect(prompt, model, maxTokens, retryCount + 1, maxRetries);
      }

      throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorData}`);
    }

    const result = (await response.json()) as any;
    const textContent = result.content?.find((c: any) => c.type === 'text');
    if (!textContent) {
      throw new Error('No text content in Claude API response');
    }

    return textContent.text;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Claude API call failed: ${errorMsg}`);
  }
}

export function startLocalClaudeWorker(connection: object) {
  const concurrency = getWorkerConcurrency('local-claude') || 2;
  const validationOrchestrator = new ValidationOrchestrator();

  return new Worker(
    'local-agents',
    async (job: Job) => {
      if (job.name !== 'local_claude') {
        return;
      }

      const t0 = Date.now();
      logWorkerLifecycle('start', 'local-claude', job);

      const payload = job.data.payload as LocalClaudeJobPayload;

      const prompt = payload.prompt || '';
      const intent = payload.intent || 'unknown';
      const model_tier = payload.model_tier || 'balanced';
      const max_steps = payload.max_steps || 3;
      const agent_role = payload.agent_role || 'architect';
      const job_id = payload.job_id || job.id?.toString() || '';

      try {
        // Select model based on tier
        const model = selectModelByTier(model_tier);

        // Call Claude API directly
        console.log(`[LocalClaudeWorker] Processing job ${job_id} with model ${model}`);
        const responseText = await callClaudeApiDirect(prompt, model, 2048);

        // Write response to file
        const responsesDir = path.join(process.cwd(), '.cursor', 'responses');
        await fsp.mkdir(responsesDir, { recursive: true });

        const responsePath = path.join(responsesDir, `response-${job_id}.md`);
        const responseContent = `---
job_id: ${job_id}
agent_role: ${agent_role}
model: ${model}
intent: ${intent}
created_at: ${new Date().toISOString()}
---

# Claude Response

${responseText}
`;

        await fsp.writeFile(responsePath, responseContent, 'utf-8');
        console.log(`[LocalClaudeWorker] ✅ Response written to ${responsePath}`);

        // Validate response and decide
        let decision: ValidationDecision | undefined;
        try {
          decision = await validationOrchestrator.validateAndDecide(
            job_id,
            agent_role,
            responsePath,
            1, // iteration count
            max_steps // max iterations
          );
          console.log(`[LocalClaudeWorker] Validation decision: ${decision.action}`);
        } catch (validationErr) {
          console.warn(`[LocalClaudeWorker] Validation error (non-blocking):`, validationErr);
          decision = {
            action: 'commit',
            reason: 'Validation orchestrator unavailable, proceeding with response',
            metadata: {
              iterationCount: 1,
              validationTime: 0,
            },
          };
        }

        const elapsed = Date.now() - t0;
        logWorkerLifecycle('complete', 'local-claude', job, { duration_ms: elapsed });

        return {
          success: true,
          response_path: responsePath,
          decision,
          execution_time_ms: elapsed,
        };
      } catch (err) {
        const elapsed = Date.now() - t0;
        const errorMsg = err instanceof Error ? err.message : String(err);

        console.error(`[LocalClaudeWorker] ❌ Job ${job_id} error:`, errorMsg);
        logWorkerLifecycle('fail', 'local-claude', job, { duration_ms: elapsed, error: errorMsg });

        return {
          success: false,
          error: errorMsg,
          execution_time_ms: elapsed,
        };
      }
    },
    {
      connection,
      concurrency,
    }
  );
}
