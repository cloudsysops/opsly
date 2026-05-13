import { Job, Worker } from 'bullmq';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { getAgentServiceRegistry } from '../lib/agent/agent-service-registry.js';
import { logWorkerLifecycle, logWorkerInfo, logWorkerWarn, logWorkerError } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import { createValidationOrchestrator } from '../lib/validation/validation-orchestrator.js';
import { writeValidationGuard } from '../lib/validation/validation-utils.js';

interface OpenCodeExecutionResponse {
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
 * LocalOpenCodeWorker (DEPRECATED)
 *
 * DEPRECATED: Use startLocalAgentsUnifiedWorker from local-agent-http-worker.ts instead
 *
 * This implementation is maintained for reference and backward compatibility.
 * The unified worker handles all local agents (Cursor, Claude, Copilot, OpenCode) in one process.
 *
 * Listens on 'local-agents' queue for jobs with name='local_opencode' or 'local_refiner'
 * Invokes Vercel OpenCode/v0 API to generate UI components and code refinements
 * Flow:
 * 1. Receives job with prompt content (UI generation or refactoring task)
 * 2. Calls Vercel v0 API or OpenCode API
 * - Endpoint: https://api.v0.dev/generate or similar
 * - Auth: Vercel token from env (VERCEL_TOKEN)
 * 3. Formats generated code/component response to markdown
 * 4. Writes to .cursor/responses/response-{job_id}.md
 * 5. Calls ValidationOrchestrator.validateAndDecide()
 * 6. Returns { success: true, decision }
 *
 * Purpose: Generate UI components + code refinements
 * Handles: Rate limits, invalid prompts, API errors, timeouts
 *
 * Falls back to Claude if OpenCode is unavailable
 *
 * Depends on:
 * - VERCEL_TOKEN env var (for v0/OpenCode API auth)
 * - LLM_GATEWAY_URL for fallback (default: http://localhost:3010)
 * - .cursor/responses/ directory for result files
 */

async function processLocalOpenCodeJob(
  promptContent: string,
  jobId: string,
  agentRole: string,
  modelTier: string,
  registry: ReturnType<typeof getAgentServiceRegistry>
): Promise<OpenCodeExecutionResponse> {
  const startTime = Date.now();
  const cursorDir = path.join(process.cwd(), '.cursor');
  const responsesDir = path.join(cursorDir, 'responses');
  const validationOrchestrator = createValidationOrchestrator(cursorDir);

  logWorkerInfo('local-opencode', 'Processing job', { jobId, agentRole });

  try {
    // Check for Vercel token
    const vercelToken = process.env.VERCEL_TOKEN?.trim();
    if (!vercelToken) {
      logWorkerWarn('local-opencode', 'VERCEL_TOKEN not configured, falling back to Claude');
      return await fallbackToClaudeViaGateway(
        promptContent,
        jobId,
        agentRole,
        cursorDir,
        validationOrchestrator
      );
    }

    logWorkerInfo('local-opencode', 'Calling Vercel v0 API');

    // Prepare request for Vercel v0 API
    const openCodeRequest = {
      prompt: promptContent,
      model: 'v0',
      temperature: 0.7,
      maxTokens: 4096,
    };

    // Attempt to call v0 API with timeout and retry logic
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for code generation

    let response: Response;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount < maxRetries) {
      try {
        response = await fetch('https://api.v0.dev/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Opsly-OpenCode-Worker/1.0',
          },
          body: JSON.stringify(openCodeRequest),
          signal: controller.signal,
        });

        break;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Vercel v0 API request timeout');
        }

        retryCount++;
        if (retryCount >= maxRetries) {
          throw err;
        }

        const backoffMs = Math.pow(2, retryCount) * 1000; // exponential backoff: 2s, 4s
        logWorkerWarn('local-opencode', 'Retrying after backoff', { retry: retryCount, maxRetries, backoffMs });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    clearTimeout(timeout);

    // Handle rate limiting (429)
    if (response!.status === 429) {
      const retryAfter = response!.headers.get('Retry-After');
      logWorkerWarn('local-opencode', 'Rate limited (429)', { retryAfter });
      throw new Error(`Vercel v0 API rate limited. Retry after ${retryAfter}s`);
    }

    // Handle authentication errors
    if (response!.status === 401 || response!.status === 403) {
      logWorkerWarn('local-opencode', 'Authentication failed, falling back to Claude', { status: response!.status });
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
      throw new Error(
        `Vercel v0 API error: ${response!.status} ${response!.statusText}`
      );
    }

    const result = (await response!.json()) as any;

    // Extract code from response (v0 API returns different formats)
    let generatedCode =
      result.code ||
      result.component ||
      result.content ||
      result.generated_code ||
      '';

    if (!generatedCode) {
      throw new Error('Empty response from Vercel v0 API');
    }

    // Ensure responses directory exists
    await fsp.mkdir(responsesDir, { recursive: true });

    // Write response to file with metadata and code formatting
    const responsePath = path.join(responsesDir, `response-${jobId}.md`);

    // Format generated code with language detection
    let codeBlock = `\`\`\`tsx\n${generatedCode}\n\`\`\``;
    if (generatedCode.includes('function ') || generatedCode.includes('export ')) {
      codeBlock = `\`\`\`tsx\n${generatedCode}\n\`\`\``;
    } else if (generatedCode.includes('<')) {
      codeBlock = `\`\`\`jsx\n${generatedCode}\n\`\`\``;
    }

    const responseContent = `---
job_id: ${jobId}
agent_role: ${agentRole}
model: vercel-v0
model_tier: ${modelTier}
source: opencode-api
created_at: ${new Date().toISOString()}
---

# Vercel OpenCode / v0 Generated Component

${codeBlock}

## Generation Details

- **Source**: Vercel v0 API
- **Model**: ${modelTier}
- **Intent**: ${agentRole}
- **Timestamp**: ${new Date().toISOString()}
`;

    await fsp.writeFile(responsePath, responseContent, 'utf-8');

    logWorkerInfo('local-opencode', 'Response written', { path: responsePath });

    // Validate response and get decision
    const decision = await validationOrchestrator.validateAndDecide(
      jobId,
      agentRole,
      responsePath,
      1,
      3
    );

    logWorkerInfo('local-opencode', 'Validation decision', { action: decision.action, reason: decision.reason });

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

    logWorkerError('local-opencode', 'Job failed', { jobId, error: errorMsg });

    // Fallback to Claude if OpenCode fails
    logWorkerWarn('local-opencode', 'OpenCode failed, attempting Claude fallback');
    try {
      return await fallbackToClaudeViaGateway(
        promptContent,
        jobId,
        agentRole,
        cursorDir,
        validationOrchestrator
      );
    } catch (fallbackErr) {
      const fallbackMsg =
        fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      logWorkerError('local-opencode', 'Claude fallback also failed', { error: fallbackMsg });

      return {
        success: false,
        error: `OpenCode failed: ${errorMsg}. Fallback failed: ${fallbackMsg}`,
        execution_time_ms: executionTime,
      };
    }
  }
}

/**
 * Fallback to Claude via LLM Gateway when OpenCode is unavailable
 */
async function fallbackToClaudeViaGateway(
  promptContent: string,
  jobId: string,
  agentRole: string,
  cursorDir: string,
  validationOrchestrator: ReturnType<typeof createValidationOrchestrator>
): Promise<OpenCodeExecutionResponse> {
  const llmGatewayUrl = process.env.LLM_GATEWAY_URL || 'http://localhost:3010';
  const responsesDir = path.join(cursorDir, 'responses');

  logWorkerInfo('local-opencode', 'Falling back to Claude via LLM Gateway', { url: llmGatewayUrl });

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
    throw new Error(
      `Claude fallback error: ${response.status} ${response.statusText}`
    );
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
source: opencode-fallback
created_at: ${new Date().toISOString()}
---

# Claude Response (OpenCode Fallback)

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

  await writeValidationGuard(
    jobId,
    decision.action,
    path.join(cursorDir, '.validation')
  );

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

export function startLocalOpenCodeWorker(connection: object) {
  const concurrency = getWorkerConcurrency('local-opencode') || 1;
  const registry = getAgentServiceRegistry();

  logWorkerInfo('local-opencode', 'Initialized', { concurrency });

  return new Worker(
    'local-agents',
    async (job: Job) => {
      // Process jobs named 'local_opencode' or 'local_refiner'
      if (job.name !== 'local_opencode' && job.name !== 'local_refiner') {
        return;
      }

      logWorkerInfo('local-opencode', 'Processing job', { jobId: job.id });

      const t0 = Date.now();
      logWorkerLifecycle('start', 'local-opencode', job);

      const payload = job.data.payload as {
        prompt_content?: string;
        agent_role?: string;
        model_tier?: string;
        job_id?: string;
      };

      const prompt_content = payload.prompt_content || '';
      const agent_role = payload.agent_role || 'refiner';
      const model_tier = payload.model_tier || 'standard';
      const job_id = payload.job_id || job.id?.toString() || '';

      try {
        await registry.loadConfig();

        const result = await processLocalOpenCodeJob(
          prompt_content,
          job_id,
          agent_role,
          model_tier,
          registry
        );

        const elapsed = Date.now() - t0;
        logWorkerLifecycle('complete', 'local-opencode', job, {
          duration_ms: elapsed,
        });

        return result;
      } catch (err) {
        const elapsed = Date.now() - t0;
        const errorMsg = err instanceof Error ? err.message : String(err);

        logWorkerError('local-opencode', 'Job error', { jobId: job.id, error: errorMsg });
        logWorkerLifecycle('fail', 'local-opencode', job, {
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
