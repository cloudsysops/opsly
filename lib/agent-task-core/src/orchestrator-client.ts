import type { AgentTaskEnvelopeV1 } from '@intcloudsysops/types';
import { compactAgentTaskPrompt } from './envelope.js';

export type OrchestratorClientOptions = {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export type EnqueueAgentTaskResult = {
  ok: boolean;
  status: number;
  job_id?: string | null;
  request_id: string;
  dry_run: boolean;
  body: unknown;
};

function resolveBaseUrl(options: OrchestratorClientOptions): string {
  return (options.baseUrl || process.env.OPSLY_ORCHESTRATOR_URL || 'http://127.0.0.1:3011').replace(
    /\/+$/,
    ''
  );
}

function resolveToken(options: OrchestratorClientOptions): string | undefined {
  return (
    options.token ||
    process.env.PLATFORM_ADMIN_TOKEN ||
    process.env.OPSLY_PLATFORM_ADMIN_TOKEN ||
    undefined
  );
}

/**
 * Thin HTTP client for local-agents submit. Never embeds secrets.
 * dry_run returns the payload without calling the network.
 */
export class OrchestratorAgentTaskClient {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OrchestratorClientOptions = {}) {
    this.baseUrl = resolveBaseUrl(options);
    this.token = resolveToken(options);
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  buildSubmitBody(envelope: AgentTaskEnvelopeV1): Record<string, unknown> {
    return {
      tenant_slug: envelope.tenant_slug,
      request_id: envelope.request_id,
      agent: envelope.selected_agent.startsWith('local_')
        ? envelope.selected_agent
        : undefined,
      agent_role: envelope.task_type === 'research' || envelope.task_type === 'planning'
        ? 'researcher'
        : 'executor',
      max_steps: Math.min(Math.max(envelope.max_attempts * 3, 3), 12),
      goal: envelope.task,
      context: {
        task_class: envelope.task_type,
        skills: envelope.skills,
        fallback_candidates: envelope.fallback_agents,
        correlation_id: envelope.correlation_id,
      },
      agent_task: envelope,
      prompt_content: compactAgentTaskPrompt(envelope),
    };
  }

  async enqueue(envelope: AgentTaskEnvelopeV1): Promise<EnqueueAgentTaskResult> {
    if (envelope.execution_mode === 'dry_run') {
      return {
        ok: true,
        status: 200,
        job_id: null,
        request_id: envelope.request_id,
        dry_run: true,
        body: { dry_run: true, payload: this.buildSubmitBody(envelope) },
      };
    }

    if (!this.token) {
      throw new Error('PLATFORM_ADMIN_TOKEN or OPSLY_PLATFORM_ADMIN_TOKEN is required for enqueue');
    }

    const response = await this.fetchImpl(`${this.baseUrl}/api/local/prompt-submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'x-autonomy-approved': 'true',
      },
      body: JSON.stringify(this.buildSubmitBody(envelope)),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    const body = await response.json().catch(() => ({}));
    const jobId =
      typeof body === 'object' && body !== null && 'job_id' in body
        ? (body as { job_id?: string | null }).job_id
        : null;

    if (!response.ok) {
      const err =
        typeof body === 'object' && body !== null && 'error' in body
          ? String((body as { error: unknown }).error)
          : `orchestrator returned HTTP ${response.status}`;
      throw new Error(err);
    }

    return {
      ok: true,
      status: response.status,
      job_id: jobId ?? null,
      request_id: envelope.request_id,
      dry_run: false,
      body,
    };
  }
}
