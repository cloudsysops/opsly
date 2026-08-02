import type { AgentTaskEnvelopeV1 } from '@intcloudsysops/types';
import type {
  AgentRouteReasonCode,
  AgentTaskRoute,
  ExternalAgentRegistryFile,
  ExternalWorkerId,
} from './types.js';

function routingIntent(taskType: AgentTaskEnvelopeV1['task_type']): string {
  if (taskType === 'code') return 'implementation';
  if (taskType === 'browser' || taskType === 'qa') return 'tests';
  if (taskType === 'review') return 'review';
  if (taskType === 'planning') return 'planning';
  if (taskType === 'documentation') return 'architecture';
  if (taskType === 'infra') return 'assistant';
  return 'assistant';
}

function compatible(
  registry: ExternalAgentRegistryFile,
  id: ExternalWorkerId,
  task: AgentTaskEnvelopeV1
): { ok: true; reasons: AgentRouteReasonCode[] } | { ok: false; reason: AgentRouteReasonCode } {
  const entry = registry.workers[id];
  if (!entry?.enabled) return { ok: false, reason: 'AGENT_DISABLED' };
  if (task.constraints.open_source_only && !entry.open_source) {
    return { ok: false, reason: 'OPEN_SOURCE_REQUIRED' };
  }
  if (task.constraints.local_only && !entry.local) {
    return { ok: false, reason: 'NO_COMPATIBLE_AGENT' };
  }
  if (entry.supported_task_types.length > 0 && !entry.supported_task_types.includes(task.task_type)) {
    return { ok: false, reason: 'NO_COMPATIBLE_AGENT' };
  }
  if (task.constraints.write_allowed && !entry.write_access) {
    return { ok: false, reason: 'NO_COMPATIBLE_AGENT' };
  }
  return {
    ok: true,
    reasons: [
      'CAPABILITY_MATCH',
      ...(entry.local && task.constraints.local_only ? (['LOCAL_PREFERRED'] as const) : []),
    ],
  };
}

/** Deterministic task routing. It never calls an LLM. */
export function routeAgentTask(
  registry: ExternalAgentRegistryFile,
  task: AgentTaskEnvelopeV1
): AgentTaskRoute {
  const requested = task.requested_agent?.trim();
  const requestedRegistryId = requested
    ? registry.workers[requested]
      ? requested
      : Object.entries(registry.workers).find(([, entry]) => entry.opsly_job_type === requested)?.[0]
    : undefined;
  const intent = routingIntent(task.task_type);
  const configured = registry.routing_notes[intent];
  const candidates = [
    requestedRegistryId,
    configured,
    ...(configured ? registry.workers[configured]?.fallback_agents ?? [] : []),
    ...Object.entries(registry.workers)
      .sort(([, a], [, b]) => a.priority - b.priority)
      .map(([id]) => id),
  ].filter((id, index, all): id is string => Boolean(id) && all.indexOf(id) === index);

  const rejected_candidates: AgentTaskRoute['rejected_candidates'] = [];
  let selected_agent: string | null = null;
  let rationale_codes: AgentRouteReasonCode[] = ['NO_COMPATIBLE_AGENT'];

  for (const candidate of candidates) {
    const result = compatible(registry, candidate, task);
    if (!result.ok) {
      rejected_candidates.push({ agent: candidate, reason: result.reason });
      continue;
    }
    selected_agent = candidate;
    rationale_codes = [
      ...result.reasons,
      ...(candidate !== requestedRegistryId && requested ? (['FALLBACK_SELECTED'] as const) : []),
    ];
    break;
  }

  const fallback_chain = candidates.filter((candidate) => candidate !== selected_agent);
  return { selected_agent, fallback_chain, rationale_codes, rejected_candidates, task };
}
