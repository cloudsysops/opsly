import type { AgentTaskEnvelopeV1 } from '@intcloudsysops/types';
import type {
  ExternalAgentRegistryFile,
  ExternalWorkerEntry,
  ExternalWorkerId,
} from './types.js';

export type RuntimeCostClass = 'zero' | 'free' | 'paid';
export type RuntimeLatencyClass = 'fast' | 'balanced' | 'slow';
export type RuntimeLocality = 'local' | 'remote_private' | 'external';

export type RuntimeAvailabilityV1 = {
  worker_id: ExternalWorkerId;
  node_id: string;
  node_type: 'mac' | 'gamer' | 'vps' | 'github' | string;
  available: boolean;
  locality: RuntimeLocality;
  tenant_scope?: string[];
  cost_class: RuntimeCostClass;
  estimated_cost_usd?: number;
  latency_class?: RuntimeLatencyClass;
  models?: string[];
  additional_capabilities?: string[];
};

export type RouteRejectCode =
  | 'RUNTIME_DISABLED'
  | 'RUNTIME_UNAVAILABLE'
  | 'TASK_TYPE_UNSUPPORTED'
  | 'CAPABILITY_MISMATCH'
  | 'OPEN_SOURCE_REQUIRED'
  | 'WRITE_NOT_ALLOWED'
  | 'NODE_PLACEMENT_MISMATCH'
  | 'TENANT_LOCALITY_MISMATCH'
  | 'COST_LIMIT_EXCEEDED'
  | 'PAID_FALLBACK_FORBIDDEN';

export type ModelRouteReasonCode =
  | 'CAPABILITY_MATCH'
  | 'LOCAL_FIRST'
  | 'FREE_FIRST'
  | 'REQUESTED_RUNTIME'
  | 'NODE_PLACEMENT_MATCH'
  | 'TENANT_LOCALITY_MATCH'
  | 'DETERMINISTIC_TIE_BREAK'
  | 'PAID_ESCALATION_REQUIRES_APPROVAL'
  | 'NO_ELIGIBLE_RUNTIME';

export type ModelRouteDecisionV1 = {
  schema_version: 'ModelRouteDecisionV1';
  request_id: string;
  status: 'selected' | 'blocked' | 'approval_required';
  selected_worker_id: ExternalWorkerId | null;
  selected_job_type: string | null;
  selected_model: string | null;
  selected_node_id: string | null;
  selected_cost_class: RuntimeCostClass | null;
  reason_codes: ModelRouteReasonCode[];
  rejected_candidates: Array<{
    worker_id: ExternalWorkerId;
    node_id: string;
    reason: RouteRejectCode;
  }>;
  escalation_candidate?: {
    worker_id: ExternalWorkerId;
    node_id: string;
    model: string;
    estimated_cost_usd?: number;
  };
};

export type RouteModelV1Input = {
  task: AgentTaskEnvelopeV1;
  availability: RuntimeAvailabilityV1[];
  required_capabilities?: string[];
  required_node_type?: string;
  tenant_sensitive?: boolean;
  allow_paid_fallback?: boolean;
  escalation_policy?: 'block' | 'allow_paid_with_approval';
};

type EligibleCandidate = {
  workerId: string;
  entry: ExternalWorkerEntry;
  availability: RuntimeAvailabilityV1;
  score: number;
};

function supportedTask(entry: ExternalWorkerEntry, task: AgentTaskEnvelopeV1): boolean {
  return (
    entry.supported_task_types.length === 0 ||
    entry.supported_task_types.includes(task.task_type)
  );
}

function capabilitiesFor(
  entry: ExternalWorkerEntry,
  availability: RuntimeAvailabilityV1
): Set<string> {
  return new Set([
    ...entry.capabilities,
    ...(availability.additional_capabilities ?? []),
  ]);
}

function candidateScore(entry: ExternalWorkerEntry, runtime: RuntimeAvailabilityV1): number {
  const cost = runtime.cost_class === 'zero' ? 0 : runtime.cost_class === 'free' ? 10 : 100;
  const locality =
    runtime.locality === 'local' ? 0 : runtime.locality === 'remote_private' ? 5 : 50;
  const latency =
    runtime.latency_class === 'fast' ? 0 : runtime.latency_class === 'slow' ? 10 : 5;
  return cost + locality + latency + entry.priority;
}

function firstModel(entry: ExternalWorkerEntry, runtime: RuntimeAvailabilityV1): string {
  return runtime.models?.[0]?.trim() || entry.default_model;
}

function maxCost(task: AgentTaskEnvelopeV1): number | undefined {
  return task.budget.max_cost_usd ?? task.constraints.max_cost;
}

function rejectReason(
  entry: ExternalWorkerEntry | undefined,
  runtime: RuntimeAvailabilityV1,
  input: RouteModelV1Input
): RouteRejectCode | null {
  const { task } = input;
  if (!entry?.enabled) return 'RUNTIME_DISABLED';
  if (!runtime.available) return 'RUNTIME_UNAVAILABLE';
  if (!supportedTask(entry, task)) return 'TASK_TYPE_UNSUPPORTED';
  if (task.constraints.open_source_only && !entry.open_source) return 'OPEN_SOURCE_REQUIRED';
  if (task.constraints.write_allowed && !entry.write_access) return 'WRITE_NOT_ALLOWED';

  const capabilities = capabilitiesFor(entry, runtime);
  for (const capability of input.required_capabilities ?? []) {
    if (!capabilities.has(capability)) return 'CAPABILITY_MISMATCH';
  }

  if (input.required_node_type && runtime.node_type !== input.required_node_type) {
    return 'NODE_PLACEMENT_MISMATCH';
  }

  if (input.tenant_sensitive) {
    if (runtime.locality === 'external') return 'TENANT_LOCALITY_MISMATCH';
    if (
      runtime.tenant_scope &&
      runtime.tenant_scope.length > 0 &&
      !runtime.tenant_scope.includes(task.tenant_slug)
    ) {
      return 'TENANT_LOCALITY_MISMATCH';
    }
  }

  const limit = maxCost(task);
  if (
    limit !== undefined &&
    runtime.estimated_cost_usd !== undefined &&
    runtime.estimated_cost_usd > limit
  ) {
    return 'COST_LIMIT_EXCEEDED';
  }

  if (runtime.cost_class === 'paid' && input.allow_paid_fallback !== true) {
    return 'PAID_FALLBACK_FORBIDDEN';
  }

  return null;
}

export function buildRuntimeCapabilityMatrixV1(
  registry: ExternalAgentRegistryFile,
  availability: RuntimeAvailabilityV1[]
): Array<{
  worker_id: string;
  job_type: string;
  capabilities: string[];
  write_access: boolean;
  local: boolean;
  open_source: boolean;
  nodes: RuntimeAvailabilityV1[];
}> {
  return Object.entries(registry.workers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([workerId, entry]) => ({
      worker_id: workerId,
      job_type: entry.opsly_job_type,
      capabilities: [...entry.capabilities].sort(),
      write_access: entry.write_access,
      local: entry.local,
      open_source: entry.open_source,
      nodes: availability
        .filter((runtime) => runtime.worker_id === workerId)
        .sort((a, b) => a.node_id.localeCompare(b.node_id)),
    }));
}

/**
 * Deterministic, policy-driven runtime/model selection.
 * Never calls an LLM and never silently selects a paid runtime.
 */
export function routeModelV1(
  registry: ExternalAgentRegistryFile,
  input: RouteModelV1Input
): ModelRouteDecisionV1 {
  const rejected: ModelRouteDecisionV1['rejected_candidates'] = [];
  const eligible: EligibleCandidate[] = [];
  const paidEscalation: EligibleCandidate[] = [];

  for (const runtime of input.availability) {
    const entry = registry.workers[runtime.worker_id];
    const reason = rejectReason(entry, runtime, input);

    if (reason) {
      rejected.push({
        worker_id: runtime.worker_id,
        node_id: runtime.node_id,
        reason,
      });

      if (
        reason === 'PAID_FALLBACK_FORBIDDEN' &&
        entry?.enabled &&
        input.escalation_policy === 'allow_paid_with_approval'
      ) {
        paidEscalation.push({
          workerId: runtime.worker_id,
          entry,
          availability: runtime,
          score: candidateScore(entry, runtime),
        });
      }
      continue;
    }

    if (!entry) continue;
    eligible.push({
      workerId: runtime.worker_id,
      entry,
      availability: runtime,
      score: candidateScore(entry, runtime),
    });
  }

  eligible.sort(
    (a, b) =>
      a.score - b.score ||
      a.workerId.localeCompare(b.workerId) ||
      a.availability.node_id.localeCompare(b.availability.node_id)
  );

  const requested = input.task.requested_agent?.trim();
  if (requested) {
    eligible.sort((a, b) => {
      const aRequested =
        a.workerId === requested || a.entry.opsly_job_type === requested ? 0 : 1;
      const bRequested =
        b.workerId === requested || b.entry.opsly_job_type === requested ? 0 : 1;
      return (
        aRequested - bRequested ||
        a.score - b.score ||
        a.workerId.localeCompare(b.workerId) ||
        a.availability.node_id.localeCompare(b.availability.node_id)
      );
    });
  }

  const selected = eligible[0];
  if (selected) {
    const reasons: ModelRouteReasonCode[] = ['CAPABILITY_MATCH'];
    if (selected.availability.locality === 'local') reasons.push('LOCAL_FIRST');
    if (selected.availability.cost_class !== 'paid') reasons.push('FREE_FIRST');
    if (
      requested &&
      (selected.workerId === requested || selected.entry.opsly_job_type === requested)
    ) {
      reasons.push('REQUESTED_RUNTIME');
    }
    if (input.required_node_type) reasons.push('NODE_PLACEMENT_MATCH');
    if (input.tenant_sensitive) reasons.push('TENANT_LOCALITY_MATCH');
    reasons.push('DETERMINISTIC_TIE_BREAK');

    return {
      schema_version: 'ModelRouteDecisionV1',
      request_id: input.task.request_id,
      status: 'selected',
      selected_worker_id: selected.workerId,
      selected_job_type: selected.entry.opsly_job_type,
      selected_model: firstModel(selected.entry, selected.availability),
      selected_node_id: selected.availability.node_id,
      selected_cost_class: selected.availability.cost_class,
      reason_codes: reasons,
      rejected_candidates: rejected,
    };
  }

  if (
    input.escalation_policy === 'allow_paid_with_approval' &&
    paidEscalation.length > 0
  ) {
    paidEscalation.sort(
      (a, b) =>
        a.score - b.score ||
        a.workerId.localeCompare(b.workerId) ||
        a.availability.node_id.localeCompare(b.availability.node_id)
    );
    const candidate = paidEscalation[0]!;
    return {
      schema_version: 'ModelRouteDecisionV1',
      request_id: input.task.request_id,
      status: 'approval_required',
      selected_worker_id: null,
      selected_job_type: null,
      selected_model: null,
      selected_node_id: null,
      selected_cost_class: null,
      reason_codes: ['PAID_ESCALATION_REQUIRES_APPROVAL'],
      rejected_candidates: rejected,
      escalation_candidate: {
        worker_id: candidate.workerId,
        node_id: candidate.availability.node_id,
        model: firstModel(candidate.entry, candidate.availability),
        estimated_cost_usd: candidate.availability.estimated_cost_usd,
      },
    };
  }

  return {
    schema_version: 'ModelRouteDecisionV1',
    request_id: input.task.request_id,
    status: 'blocked',
    selected_worker_id: null,
    selected_job_type: null,
    selected_model: null,
    selected_node_id: null,
    selected_cost_class: null,
    reason_codes: ['NO_ELIGIBLE_RUNTIME'],
    rejected_candidates: rejected,
  };
}
