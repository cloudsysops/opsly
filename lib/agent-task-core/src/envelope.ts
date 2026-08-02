import { randomUUID } from 'node:crypto';
import {
  agentTaskEnvelopeV1Schema,
  type AgentExecutionMode,
  type AgentTaskEnvelopeV1,
  type AgentTaskType,
} from '@intcloudsysops/types/agent-task';

export type BuildAgentTaskEnvelopeInput = {
  task: string;
  tenantSlug: string;
  taskType: AgentTaskType;
  selectedAgent: string;
  requestId?: string;
  correlationId?: string;
  requestedAgent?: string | null;
  skills?: string[];
  fallbackAgents?: string[];
  executionMode?: AgentExecutionMode;
  openSourceOnly?: boolean;
  localOnly?: boolean;
  writeAllowed?: boolean;
  networkAllowed?: boolean;
  browserAllowed?: boolean;
  timeoutMs?: number;
  maxAttempts?: number;
  maxTokens?: number;
  maxCostUsd?: number;
  source?: string;
  actor?: string;
  metadata?: Record<string, unknown>;
};

export function parseAgentTaskEnvelope(input: unknown): AgentTaskEnvelopeV1 {
  return agentTaskEnvelopeV1Schema.parse(input);
}

export function safeParseAgentTaskEnvelope(input: unknown) {
  return agentTaskEnvelopeV1Schema.safeParse(input);
}

export function buildAgentTaskEnvelope(input: BuildAgentTaskEnvelopeInput): AgentTaskEnvelopeV1 {
  const requestId = input.requestId?.trim() || randomUUID();
  const correlationId = input.correlationId?.trim() || requestId;
  const now = new Date().toISOString();
  return parseAgentTaskEnvelope({
    schema_version: 'AgentTaskEnvelopeV1',
    request_id: requestId,
    correlation_id: correlationId,
    tenant_slug: input.tenantSlug.trim(),
    task_type: input.taskType,
    task: input.task.trim(),
    requested_agent: input.requestedAgent ?? null,
    selected_agent: input.selectedAgent,
    skills: (input.skills ?? ['opsly-context']).slice(0, 3),
    constraints: {
      open_source_only: input.openSourceOnly ?? false,
      local_only: input.localOnly ?? true,
      browser_allowed: input.browserAllowed ?? input.taskType === 'browser',
      network_allowed: input.networkAllowed ?? false,
      write_allowed: input.writeAllowed ?? false,
      file_scope: [],
      max_tokens: input.maxTokens ?? 1_600,
    },
    execution_mode: input.executionMode ?? 'dry_run',
    source: input.source ?? 'opsly-cli',
    actor: input.actor ?? 'system',
    created_at: now,
    timeout_ms: input.timeoutMs ?? 120_000,
    max_attempts: input.maxAttempts ?? 2,
    budget: {
      max_tokens: input.maxTokens ?? 1_600,
      max_cost_usd: input.maxCostUsd,
    },
    metadata: input.metadata ?? {},
    fallback_agents: input.fallbackAgents ?? [],
  });
}

export function compactAgentTaskPrompt(envelope: AgentTaskEnvelopeV1): string {
  return [
    'OPSly TASK ENVELOPE AgentTaskEnvelopeV1',
    JSON.stringify(envelope),
    '',
    'Execute only this task. Use the listed skills when available.',
    'Return a concise result, changed files, checks run, and blockers.',
  ].join('\n');
}
