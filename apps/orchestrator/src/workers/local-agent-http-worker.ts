import { readFile } from 'node:fs/promises';
import { Job, Worker } from 'bullmq';
import { resolveAgentService } from '../lib/agent-service-registry.js';
import {
  formatLocalWorkerResponse,
  localAgentForJobType,
  readPromptInput,
  type LocalAgentExecuteRequest,
  type LocalAgentExecuteResponse,
  type LocalAgentKind,
  writeLocalWorkerResponse,
} from '../lib/local-worker-utils.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import type { OrchestratorJob } from '../types.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

type LocalAgentJobType = 'local_cursor' | 'local_claude' | 'local_copilot' | 'local_opencode';

function jobTypeForAgent(agent: LocalAgentKind): LocalAgentJobType {
  switch (agent) {
    case 'claude':
      return 'local_claude';
    case 'copilot':
      return 'local_copilot';
    case 'opencode':
      return 'local_opencode';
    case 'cursor':
      return 'local_cursor';
  }
}

function responseIsObject(value: unknown): value is LocalAgentExecuteResponse {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function postWithRetries(
  agent: LocalAgentKind,
  url: string,
  request: LocalAgentExecuteRequest,
  timeoutMs: number,
  retries: number
): Promise<LocalAgentExecuteResponse> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${url}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      const parsed: unknown = await res.json().catch(() => ({}));
      if (!responseIsObject(parsed)) {
        throw new Error(`${agent} agent returned non-object JSON`);
      }
      if (!res.ok || parsed.success === false) {
        throw new Error(parsed.error || `${agent} agent failed with HTTP ${res.status}`);
      }
      return parsed;
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function resolveResponseBody(response: LocalAgentExecuteResponse): Promise<string> {
  if (typeof response.response_content === 'string' && response.response_content.trim().length > 0) {
    return response.response_content;
  }
  if (typeof response.response_path === 'string' && response.response_path.trim().length > 0) {
    return readFile(response.response_path, 'utf-8');
  }
  return 'Agent completed without response content.';
}

export function startLocalAgentHttpWorker(agent: LocalAgentKind, connection: object): Worker {
  const jobType = jobTypeForAgent(agent);
  const concurrency = getWorkerConcurrency(jobType);
  return new Worker(
    'local-agents',
    async (job: Job) => {
      if (job.name !== jobType) {
        return;
      }

      const t0 = Date.now();
      logWorkerLifecycle('start', jobType, job);
      try {
        const data = job.data as OrchestratorJob;
        const actualAgent = localAgentForJobType(data.type);
        if (actualAgent !== agent) {
          return;
        }

        const payload = data.payload;
        const promptPath =
          typeof payload.prompt_path === 'string' ? payload.prompt_path.trim() : undefined;
        const promptContent =
          typeof payload.prompt_content === 'string' ? payload.prompt_content : undefined;
        const parsed = await readPromptInput({ promptPath, promptContent });
        const maxStepsRaw = payload.max_steps;
        const maxSteps =
          typeof maxStepsRaw === 'number' && Number.isFinite(maxStepsRaw)
            ? Math.max(1, Math.floor(maxStepsRaw))
            : 5;
        const agentRole =
          typeof payload.agent_role === 'string' && payload.agent_role.trim().length > 0
            ? payload.agent_role.trim()
            : 'executor';
        const metadata =
          typeof data.metadata === 'object' && data.metadata !== null ? data.metadata : {};
        const service = await resolveAgentService(agent);
        const jobId = job.id != null ? String(job.id) : data.request_id || `${Date.now()}`;

        const request: LocalAgentExecuteRequest = {
          job_id: jobId,
          request_id: data.request_id,
          tenant_slug: data.tenant_slug,
          prompt_path: parsed.promptPath,
          prompt_content: parsed.content,
          agent,
          agent_role: agentRole,
          max_steps: maxSteps,
          metadata: { ...metadata, prompt_metadata: parsed.metadata },
        };

        const response = await postWithRetries(
          agent,
          service.url,
          request,
          service.timeoutMs,
          service.retries
        );
        const body = await resolveResponseBody(response);
        const responsePath = await writeLocalWorkerResponse({
          jobId,
          agent,
          content: formatLocalWorkerResponse({
            agent,
            jobId,
            requestId: data.request_id,
            sourcePath: parsed.promptPath,
            body,
          }),
        });

        logWorkerLifecycle('complete', jobType, job, { duration_ms: Date.now() - t0 });
        return {
          success: true,
          job_id: jobId,
          request_id: data.request_id,
          agent,
          response_path: responsePath,
          service_url: service.url,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', jobType, job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      }
    },
    { connection, concurrency }
  );
}
