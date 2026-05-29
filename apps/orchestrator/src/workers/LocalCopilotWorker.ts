import { Job, Worker } from 'bullmq';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { getAgentServiceRegistry } from '../lib/agent/agent-service-registry.js';
import {
  logWorkerLifecycle,
  logWorkerInfo,
  logWorkerWarn,
  logWorkerError,
} from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import { createValidationOrchestrator } from '../lib/validation/validation-orchestrator.js';
import { writeValidationGuard } from '../lib/validation/validation-utils.js';

interface CopilotExecutionResponse {
  success: boolean;
  response_path?: string;
  error?: string;
  execution_time_ms?: number;
  validation_decision?: {
    action: 'commit' | 'iterate' | 'escalate';
    reason: string;
  };
}

/**
 * LocalCopilotWorker (DEPRECATED)
 *
 * DEPRECATED: Use startLocalAgentsUnifiedWorker from local-agent-http-worker.ts instead
 *
 * This implementation is maintained for reference and backward compatibility.
 * The unified worker handles all local agents (Cursor, Claude, Copilot, OpenCode) in one process.
 *
 * Listens on 'local-agents' queue for jobs with name='local_copilot'
 * Invokes GitHub Copilot Chat API or falls back to Claude
 * Flow:
 * 1. Receives job with prompt content
 * 2. Calls GitHub Copilot Chat API
 * - Endpoint: https://copilot-chat.github.com/api/chat or via authenticated GitHub Copilot
 * - Auth: GitHub token from env (GITHUB_TOKEN)
 * 3. Formats response to markdown
 * 4. Writes to .cursor/responses/response-{job_id}.md
 * 5. Calls ValidationOrchestrator.validateAndDecide()
 * 6. Returns { success: true, decision }
 *
 * If Copilot API unavailable, falls back to Claude via LLM Gateway
 * Handles rate limits, auth errors, timeouts with exponential backoff
 *
 * Depends on:
 * - GITHUB_TOKEN env var (for Copilot API auth)
 * - LLM_GATEWAY_URL for fallback (default: http://localhost:3010)
 * - .cursor/responses/ directory for result files
 */

async function processLocalCopilotJob(
  promptContent: string,
  jobId: string,
  agentRole: string,
  modelTier: string,
  _registry: ReturnType<typeof getAgentServiceRegistry>
): Promise<CopilotExecutionResponse> {
  const startTime = Date.now();
  const cursorDir = path.join(process.cwd(), '.cursor');
  const responsesDir = path.join(cursorDir, 'responses');
  const validationOrchestrator = createValidationOrchestrator(cursorDir);

  logWorkerInfo('local-copilot', 'Processing job', { jobId, agentRole });

  try {
    // Check for GitHub token
    const githubToken = process.env.GITHUB_TOKEN?.trim() || process.env.GITHUB_TOKEN_N8N?.trim();
    if (!githubToken) {
      logWorkerWarn('local-copilot', 'GITHUB_TOKEN not configured, falling back to Claude');
      return await fallbackToClaudeViaGateway(
        promptContent,
        jobId,
        agentRole,
        cursorDir,
        validationOrchestrator
      );
    }

    // Prepare request for GitHub Copilot Chat API
    const copilotRequest = {
      messages: [
        {
          role: 'user',
          content: promptContent,
        },
      ],
      model: 'gpt-4',
    };

    logWorkerInfo('local-copilot', 'Calling GitHub Copilot Chat API');

    // Attempt to call Copilot API with timeout and retry logic
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let response: Response;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        response = await fetch('https://copilot-chat.github.com/api/chat', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Opsly-Copilot-Worker/1.0',
          },
          body: JSON.stringify(copilotRequest),
          signal: controller.signal,
        });

        break;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Copilot API request timeout');
        }

        retryCount++;
        if (retryCount >= maxRetries) {
          throw err;
        }

        const backoffMs = Math.pow(2, retryCount) * 1000; // exponential backoff: 2s, 4s
        logWorkerWarn('local-copilot', 'Retrying after backoff', {
          retry: retryCount,
          maxRetries,
          backoffMs,
        });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    clearTimeout(timeout);

    // Handle rate limiting (429)
    if (response!.status === 429) {
      const retryAfter = response!.headers.get('Retry-After');
      logWorkerWarn('local-copilot', 'Rate limited (429)', { retryAfter });
      throw new Error(`GitHub Copilot API rate limited. Retry after ${retryAfter}s`);
    }

    // Handle authentication errors
    if (response!.status === 401 || response!.status === 403) {
      logWorkerWarn('local-copilot', 'Authentication failed, falling back to Claude', {
        status: response!.status,
      });
      return await fallbackToClaudeViaGateway(
        promptContent,
        jobId,
        agentRole,
        cursorDir,
        validationOrchestrator
      );
    }

    // Handle other HTTP errors
    if (!response!.ok) {
      throw new Error(`Copilot API error: ${response!.status} ${response!.statusText}`);
    }

    const result = (await response!.json()) as any;
    const responseText =
      result.choices?.[0]?.message?.content || result.content || result.message || '';

    if (!responseText) {
      throw new Error('Empty response from Copilot API');
    }

    // Ensure responses directory exists
    await fsp.mkdir(responsesDir, { recursive: true });

    // Write response to file with metadata
    const responsePath = path.join(responsesDir, `response-${jobId}.md`);
    const responseContent = `---
job_id: ${jobId}
agent_role: ${agentRole}
model: github-copilot
model_tier: ${modelTier}
source: copilot-api
created_at: ${new Date().toISOString()}
---

# GitHub Copilot Response

${responseText}
`;

    await fsp.writeFile(responsePath, responseContent, 'utf-8');

    logWorkerInfo('local-copilot', 'Response written', { path: responsePath });

    // Validate response and get decision
    const decision = await validationOrchestrator.validateAndDecide(
      jobId,
      agentRole,
      responsePath,
      1,
      3
    );

    logWorkerInfo('local-copilot', 'Validation decision', {
      action: decision.action,
      reason: decision.reason,
    });

    // Write validation guard to prevent double-commits
    await writeValidationGuard(jobId, decision.action, path.join(cursorDir, '.validation'));

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      response_path: responsePath,
      execution_time_ms: executionTime,
      validation_decision: {
        action: decision.action,
        reason: decision.reason,
      },
    };
  } catch (err) {
    const executionTime = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    logWorkerError('local-copilot', 'Job failed', { jobId, error: errorMsg });

    // Final fallback to Claude if Copilot fails
    logWorkerWarn('local-copilot', 'Copilot failed, attempting Claude fallback');
    try {
      return await fallbackToClaudeViaGateway(
        promptContent,
        jobId,
        agentRole,
        cursorDir,
        validationOrchestrator
      );
    } catch (fallbackErr) {
      const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      logWorkerError('local-copilot', 'Claude fallback also failed', { error: fallbackMsg });

      return {
        success: false,
        error: `Copilot failed: ${errorMsg}. Fallback failed: ${fallbackMsg}`,
        execution_time_ms: executionTime,
      };
    }
  }
}

/**
 * Fallback to Claude via LLM Gateway when Copilot is unavailable
 */
async function fallbackToClaudeViaGateway(
  promptContent: string,
  jobId: string,
  agentRole: string,
  cursorDir: string,
  validationOrchestrator: ReturnType<typeof createValidationOrchestrator>
): Promise<CopilotExecutionResponse> {
  const llmGatewayUrl = process.env.LLM_GATEWAY_URL || 'http://localhost:3010';
  const responsesDir = path.join(cursorDir, 'responses');

  logWorkerInfo('local-copilot', 'Falling back to Claude via LLM Gateway', { url: llmGatewayUrl });

  const response = await fetch(`${llmGatewayUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-opus-4',
      messages: [{ role: 'user', content: promptContent }],
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Claude fallback error: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as any;
  const responseText = result.content || result.message || '';

  // Ensure responses directory exists
  await fsp.mkdir(responsesDir, { recursive: true });

  const responsePath = path.join(responsesDir, `response-${jobId}.md`);
  const responseContent = `---
job_id: ${jobId}
agent_role: ${agentRole}
model: claude-opus-4
source: copilot-fallback
created_at: ${new Date().toISOString()}
---

# Claude Response (Copilot Fallback)

${responseText}
`;

  await fsp.writeFile(responsePath, responseContent, 'utf-8');

  const decision = await validationOrchestrator.validateAndDecide(
    jobId,
    agentRole,
    responsePath,
    1,
    3
  );

  await writeValidationGuard(jobId, decision.action, path.join(cursorDir, '.validation'));

  return {
    success: true,
    response_path: responsePath,
    execution_time_ms: 0,
    validation_decision: {
      action: decision.action,
      reason: decision.reason,
    },
  };
}

export function startLocalCopilotWorker(connection: object) {
  const concurrency = getWorkerConcurrency('local-copilot') || 1;
  const registry = getAgentServiceRegistry();

  logWorkerInfo('local-copilot', 'Initialized', { concurrency });

  return new Worker(
    'local-agents',
    async (job: Job) => {
      // Only process jobs named 'local_copilot'
      if (job.name !== 'local_copilot') {
        return;
      }

      logWorkerInfo('local-copilot', 'Processing job', { jobId: job.id });

      const t0 = Date.now();
      logWorkerLifecycle('start', 'local-copilot', job);

      const payload = job.data.payload as {
        prompt_content?: string;
        agent_role?: string;
        model_tier?: string;
        job_id?: string;
      };

      const prompt_content = payload.prompt_content || '';
      const agent_role = payload.agent_role || 'executor';
      const model_tier = payload.model_tier || 'standard';
      const job_id = payload.job_id || job.id?.toString() || '';

      try {
        await registry.loadConfig();

        const result = await processLocalCopilotJob(
          prompt_content,
          job_id,
          agent_role,
          model_tier,
          registry
        );

        const elapsed = Date.now() - t0;
        logWorkerLifecycle('complete', 'local-copilot', job, {
          duration_ms: elapsed,
        });

        return result;
      } catch (err) {
        const elapsed = Date.now() - t0;
        const errorMsg = err instanceof Error ? err.message : String(err);

        logWorkerError('local-copilot', 'Job error', { jobId: job.id, error: errorMsg });
        logWorkerLifecycle('fail', 'local-copilot', job, {
          duration_ms: elapsed,
          error: errorMsg,
        });

        throw err;
      }
    },
    {
      connection,
      concurrency,
    }
  );
}
