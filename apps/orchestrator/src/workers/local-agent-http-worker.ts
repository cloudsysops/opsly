/**
 * LocalAgentHTTPWorker - Unified worker for all local agent types
 *
 * Listens on 'local-agents' queue for jobs with names derived from LocalAgentKind:
 * - local_cursor, local_claude, local_copilot, local_opencode
 * - local_codex, local_openai, local_hermes, local_decepticon
 *
 * Routes to appropriate HTTP endpoint based on job.name
 * Integrates with ValidationOrchestrator for validation → decision → commit flow
 */

import { Job, Worker, UnrecoverableError } from 'bullmq';
import { promises as fsp } from 'node:fs';
import * as path from 'node:path';
import { getAgentServiceRegistry } from '../lib/agent/agent-service-registry.js';
import {
  agentForLocalJobType,
  jobTypeForLocalAgent,
  LOCAL_AGENT_KINDS,
  localAgentKindToWorkerConcurrencyKey,
  type LocalAgentKind,
  externalCliLabelForOpslyLocalAgent,
} from '../lib/local-worker-utils.js';
import {
  logWorkerInfo,
  logWorkerWarn,
  logWorkerError,
  logWorkerLifecycle,
} from '../observability/worker-log.js';
import { getWorkerConcurrency, type WorkerConcurrencyKey } from '../worker-concurrency.js';
import { createValidationOrchestrator } from '../lib/validation/validation-orchestrator.js';
import { writeValidationGuard } from '../lib/validation/validation-utils.js';

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

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

async function readJsonRecord(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  if (raw.trim().length === 0) {
    return {};
  }

  const parsed: unknown = JSON.parse(raw);
  return asRecord(parsed);
}

function stringField(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function responseTextFromResult(result: Record<string, unknown>): string | null {
  return stringField(result, [
    'response_content',
    'content',
    'message',
    'output',
    'text',
    'code',
    'suggestions',
    'feedback',
  ]);
}

function buildResponseFileContent(
  agent: LocalAgentKind,
  jobId: string,
  agentRole: string,
  responseText: string
): string {
  const external = externalCliLabelForOpslyLocalAgent(agent);
  return `---
job_id: ${jobId}
agent_role: ${agentRole}
opsly_agent_id: ${agent}
external_cli: ${external}
created_at: ${new Date().toISOString()}
---

# ${agent} (${external}) Response

${responseText}
`;
}

function concurrencyKeyForLocalAgent(agent: LocalAgentKind): WorkerConcurrencyKey {
  return localAgentKindToWorkerConcurrencyKey(agent);
}

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
    const agent = agentForLocalJobType(jobType);
    const service = await registry.getService(agent);
    const serviceUrl = await registry.getServiceUrl(agent);
    let responsePath: string | null = null;

    if (!service || !serviceUrl) {
      throw new Error(`Service not configured or disabled for ${agent}`);
    }

    logWorkerInfo('local-agents', `${agent}: invoking ${serviceUrl}/execute`);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const bridgeToken = process.env.OPSLY_CLI_AGENT_TOKEN?.trim();
    if (bridgeToken) {
      headers.Authorization = `Bearer ${bridgeToken}`;
    }
    const response = await fetch(`${serviceUrl.replace(/\/+$/, '')}/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt_content,
        agent_role,
        max_steps,
        job_id,
      }),
      signal: AbortSignal.timeout(service.timeout_ms),
    });

    if (!response.ok) {
      throw new Error(`${agent} service error: ${response.status}`);
    }

    const result = await readJsonRecord(response);
    if (result.success === false) {
      throw new Error(
        stringField(result, ['error', 'message']) ?? `${agent} service returned success=false`
      );
    }

    responsePath = stringField(result, ['response_path']);
    const responseText = responseTextFromResult(result);
    if (!responsePath && responseText) {
      const responsesDir = path.join(cursorDir, 'responses');
      await fsp.mkdir(responsesDir, { recursive: true });
      responsePath = path.join(responsesDir, `response-${job_id}.md`);
      await fsp.writeFile(
        responsePath,
        buildResponseFileContent(agent, job_id, agent_role, responseText),
        'utf-8'
      );
    }

    // Validate response and decide next action (validation orchestration)
    if (responsePath) {
      logWorkerInfo('local-agents', `Starting validation orchestration for ${responsePath}`);
      const decision = await validationOrchestrator.validateAndDecide(
        job_id,
        agent_role,
        responsePath,
        1, // iteration count
        3 // max iterations
      );

      logWorkerInfo('local-agents', `Validation decision: ${decision.action} - ${decision.reason}`);

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
    logWorkerError('local-agents', `Job ${job_id} error: ${errorMsg}`);

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

  const localConcurrency = LOCAL_AGENT_KINDS.map((agent) => ({
    agent,
    concurrency: getWorkerConcurrency(concurrencyKeyForLocalAgent(agent)),
  }));
  const totalConcurrency = localConcurrency.reduce((sum, item) => sum + item.concurrency, 0);

  logWorkerInfo(
    'local-agents',
    `Unified worker: ${localConcurrency.map((item) => `${item.agent}=${item.concurrency}`).join(' + ')} = ${totalConcurrency}`
  );
  const validJobTypes = new Set(LOCAL_AGENT_KINDS.map((agent) => jobTypeForLocalAgent(agent)));

  const worker = new Worker(
    'local-agents',
    async (job: Job) => {
      const jobType = job.name; // Should be local_cursor, local_claude, etc.
      const data = job.data as { payload?: LocalAgentPayload };

      if (!validJobTypes.has(jobType)) {
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

      logWorkerInfo('local-agents', `Processing ${jobType} job ${job.id}`);
      logWorkerLifecycle('start', 'local-agents', job);

      try {
        const result = await processLocalAgentJob(
          jobType,
          prompt_content,
          job_id,
          agent_role,
          registry,
          max_steps
        );

        const elapsed = Date.now() - t0;
        logWorkerLifecycle('complete', 'local-agents', job, { duration_ms: elapsed });

        if (result.success) {
          logWorkerInfo('local-agents', `${jobType} job ${job.id} completed in ${elapsed}ms`, {
            success: true,
          });
        } else {
          logWorkerError('local-agents', `${jobType} job ${job.id} failed: ${result.error}`);
        }

        return result;
      } catch (err) {
        const elapsed = Date.now() - t0;
        const errorMsg = err instanceof Error ? err.message : String(err);

        if (err instanceof UnrecoverableError) {
          logWorkerError(
            'local-agents',
            `Unrecoverable error in ${jobType} job ${job.id}: ${errorMsg}`
          );
          logWorkerLifecycle('fail', 'local-agents', job, {
            duration_ms: elapsed,
            error: errorMsg,
          });
        } else {
          logWorkerError('local-agents', `${jobType} job ${job.id} error: ${errorMsg}`);
          logWorkerLifecycle('fail', 'local-agents', job, {
            duration_ms: elapsed,
            error: errorMsg,
          });
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
    logWorkerInfo('local-agents', 'Unified worker closed');
    unifiedWorkerClosed = true;
    unifiedWorkerInstance = null;
  });

  worker.on('error', (err) => {
    logWorkerError('local-agents', 'Worker error', { error: String(err) });
  });

  logWorkerInfo('local-agents', 'Unified worker ready on local-agents queue');
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
