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
 * Integrates with ValidationOrchestrator for validation → decision → commit flow
 */

import { Job, Worker, UnrecoverableError } from 'bullmq';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { getAgentServiceRegistry } from '../lib/agent-service-registry.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import { createValidationOrchestrator } from '../lib/validation-orchestrator.js';
import { writeValidationGuard, extractJobIdFromPath } from '../lib/validation-utils.js';

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
  validation_decision?: {
    action: 'commit' | 'iterate' | 'escalate';
    reason: string;
  };
}

let unifiedWorkerInstance: Worker | null = null;
let unifiedWorkerClosed = false;

async function processLocalAgentJob(
  jobType: string,
  prompt_content: string,
  job_id: string,
  agent_role: string,
  registry: ReturnType<typeof getAgentServiceRegistry>,
  max_steps: number = 5
): Promise<LocalAgentResponse> {
  const startTime = Date.now();
  const cursorDir = path.join(process.cwd(), '.cursor');
  const validationOrchestrator = createValidationOrchestrator(cursorDir);

  try {
    await registry.loadConfig();

    // Route to appropriate service based on job type
    let serviceUrl: string | null = null;
    let llmGatewayUrl = process.env.LLM_GATEWAY_URL || 'http://localhost:3010';
    let responsePath: string | null = null;

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
      responsePath = result.response_path;
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
      const responsesDir = path.join(cursorDir, 'responses');
      await fsp.mkdir(responsesDir, { recursive: true });

      responsePath = path.join(responsesDir, `response-${job_id}.md`);
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
    } else if (jobType === 'local_copilot') {
      const service = await registry.getService('copilot');
      serviceUrl = service?.url ?? 'https://api.copilot.github.com';

      console.log(`[LocalAgentWorker] Copilot: invoking ${serviceUrl}/validate`);
      const response = await fetch(`${serviceUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GITHUB_COPILOT_TOKEN || ''}`,
        },
        body: JSON.stringify({
          code: prompt_content,
          agent_role,
          job_id,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        throw new Error(`Copilot service error: ${response.status}`);
      }

      const result = await response.json() as any;
      const validationText = result.suggestions || result.feedback || '';

      // Write response to file
      const responsesDir = path.join(cursorDir, 'responses');
      await fsp.mkdir(responsesDir, { recursive: true });

      responsePath = path.join(responsesDir, `validation-${job_id}.md`);
      const responseContent = `---
job_id: ${job_id}
agent_role: ${agent_role}
service: copilot
created_at: ${new Date().toISOString()}
---

# Copilot Validation

${validationText}
`;

      await fsp.writeFile(responsePath, responseContent, 'utf-8');
    } else if (jobType === 'local_opencode') {
      const service = await registry.getService('opencode');
      serviceUrl = service?.url ?? 'https://api.v0.dev';

      console.log(`[LocalAgentWorker] OpenCode: invoking ${serviceUrl}/generate`);
      const response = await fetch(`${serviceUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt_content,
          agent_role,
          max_steps,
          job_id,
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        throw new Error(`OpenCode service error: ${response.status}`);
      }

      const result = await response.json() as any;
      const generatedCode = result.code || result.output || '';

      // Write response to file
      const responsesDir = path.join(cursorDir, 'responses');
      await fsp.mkdir(responsesDir, { recursive: true });

      responsePath = path.join(responsesDir, `generated-${job_id}.tsx`);
      const responseContent = `/**
 * Generated by OpenCode
 * job_id: ${job_id}
 * agent_role: ${agent_role}
 * created_at: ${new Date().toISOString()}
 */

${generatedCode}
`;

      await fsp.writeFile(responsePath, responseContent, 'utf-8');
    } else {
      throw new UnrecoverableError(`Unknown job type: ${jobType}`);
    }

    // Validate response and decide next action (validation orchestration)
    if (responsePath) {
      console.log(`[LocalAgentWorker] Starting validation orchestration for ${responsePath}`);
      const decision = await validationOrchestrator.validateAndDecide(
        job_id,
        agent_role,
        responsePath,
        1, // iteration count
        3, // max iterations
      );

      console.log(`[LocalAgentWorker] Validation decision: ${decision.action} - ${decision.reason}`);

      // Write validation guard to prevent double-commits
      await writeValidationGuard(job_id, decision.action, path.join(cursorDir, '.validation'));

      return {
        success: true,
        response_path: responsePath,
        execution_time_ms: Date.now() - startTime,
        validation_decision: {
          action: decision.action,
          reason: decision.reason,
        },
      };
    }

    return {
      success: true,
      response_path: responsePath || undefined,
      execution_time_ms: Date.now() - startTime,
    };
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
