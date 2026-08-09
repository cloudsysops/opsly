import {
  loadExternalAgentRegistry,
  routeAgentTask,
  type ExternalAgentRegistryFile,
} from '@intcloudsysops/external-agent-registry';
import type { AgentTaskEnvelopeV1 } from '@intcloudsysops/types';
import { buildAgentTaskEnvelope, compactAgentTaskPrompt, type BuildAgentTaskEnvelopeInput } from './envelope.js';
import { inferTaskType } from './infer-task-type.js';
import { evaluateAgentTaskPolicy, type EvaluatePolicyOptions, type PolicyResult } from './policy.js';

export type AssignAgentTaskInput = {
  task: string;
  tenantSlug: string;
  taskType?: string;
  requestedAgent?: string;
  openSourceOnly?: boolean;
  localOnly?: boolean;
  writeAllowed?: boolean;
  skills?: string[];
  executionMode?: BuildAgentTaskEnvelopeInput['executionMode'];
  repoRoot?: string;
  registry?: ExternalAgentRegistryFile;
  policyOptions?: EvaluatePolicyOptions;
};

export type AssignAgentTaskResult = {
  envelope: AgentTaskEnvelopeV1;
  policy: PolicyResult;
  prompt: string;
  selected_agent: string | null;
  fallback_chain: string[];
  rationale_codes: string[];
  rejected_candidates: Array<{ agent: string; reason: string }>;
};

const DEFAULT_SKILLS: Record<string, string[]> = {
  research: ['opsly-context', 'opsly-brain-researcher'],
  code: ['opsly-context'],
  review: ['opsly-context', 'opsly-qa'],
  browser: ['opsly-context', 'opsly-qa'],
  infra: ['opsly-context', 'opsly-infra'],
  qa: ['opsly-context', 'opsly-qa'],
  planning: ['opsly-context'],
  documentation: ['opsly-context', 'opsly-documentation'],
};

/**
 * Full assign path: infer type → route against registry → build envelope → policy.
 * Does not enqueue unless caller uses OrchestratorAgentTaskClient.
 */
export async function assignAgentTask(input: AssignAgentTaskInput): Promise<AssignAgentTaskResult> {
  const registry =
    input.registry ?? (await loadExternalAgentRegistry(input.repoRoot ?? process.cwd()));
  const taskType = inferTaskType(input.task, input.taskType);
  const skills = [...(DEFAULT_SKILLS[taskType] ?? ['opsly-context']), ...(input.skills ?? [])].slice(
    0,
    3
  );

  const draft = buildAgentTaskEnvelope({
    task: input.task,
    tenantSlug: input.tenantSlug,
    taskType,
    selectedAgent: input.requestedAgent?.trim() || registry.default_worker_id,
    requestedAgent: input.requestedAgent ?? null,
    skills,
    openSourceOnly: input.openSourceOnly,
    localOnly: input.localOnly ?? true,
    writeAllowed: input.writeAllowed ?? false,
    browserAllowed: taskType === 'browser',
    executionMode: input.executionMode ?? 'dry_run',
  });

  const route = routeAgentTask(registry, draft);
  if (!route.selected_agent) {
    throw new Error(
      `No compatible agent for task_type=${taskType}: ${route.rationale_codes.join(',')}`
    );
  }

  const entry = registry.workers[route.selected_agent];
  const mergedSkills = [...new Set([...(entry?.skills ?? []), ...skills])].slice(0, 3);

  const envelope = buildAgentTaskEnvelope({
    task: input.task,
    tenantSlug: input.tenantSlug,
    taskType,
    selectedAgent: entry?.opsly_job_type ?? route.selected_agent,
    requestedAgent: input.requestedAgent ?? null,
    skills: mergedSkills,
    fallbackAgents: route.fallback_chain
      .map((id) => registry.workers[id]?.opsly_job_type ?? id)
      .slice(0, 5),
    openSourceOnly: input.openSourceOnly,
    localOnly: input.localOnly ?? true,
    writeAllowed: input.writeAllowed ?? false,
    browserAllowed: taskType === 'browser',
    executionMode: input.executionMode ?? 'dry_run',
    requestId: draft.request_id,
    correlationId: draft.correlation_id,
    metadata: {
      registry_worker_id: route.selected_agent,
      rationale_codes: route.rationale_codes,
    },
  });

  const policy = evaluateAgentTaskPolicy(envelope, input.policyOptions);
  return {
    envelope,
    policy,
    prompt: compactAgentTaskPrompt(envelope),
    selected_agent: route.selected_agent,
    fallback_chain: route.fallback_chain,
    rationale_codes: route.rationale_codes,
    rejected_candidates: route.rejected_candidates,
  };
}
