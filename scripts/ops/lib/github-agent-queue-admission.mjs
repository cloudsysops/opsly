export function resolveGovernedAgent(meta, registry) {
  const requested = String(meta?.agent ?? '').trim();
  if (!requested) throw new Error('missing required frontmatter field: agent');

  const workers = registry?.workers;
  if (!workers || typeof workers !== 'object') {
    throw new Error('external-agent-registry is missing a valid workers map');
  }

  let workerId = requested;
  let entry = workers[workerId];
  if (!entry) {
    // Resolve by opsly_job_type only when it names exactly one worker.
    // A duplicate opsly_job_type across entries makes "which worker actually
    // runs this" ambiguous — .find() would silently pick whichever happens
    // to be first, which is not a decision this admission gate is allowed
    // to make quietly. Fail closed instead.
    const matches = Object.entries(workers).filter(([, candidate]) => {
      return candidate?.opsly_job_type === requested;
    });
    if (matches.length === 0) {
      throw new Error(`agent "${requested}" is not registered in external-agent-registry`);
    }
    if (matches.length > 1) {
      const ids = matches.map(([id]) => id).join(', ');
      throw new Error(
        `agent "${requested}" (opsly_job_type) is registered by more than one worker (${ids}) — ambiguous, refusing to dispatch`
      );
    }
    [workerId, entry] = matches[0];
  }

  if (entry.enabled !== true) {
    throw new Error(`agent "${requested}" is registered but disabled`);
  }
  if (entry.local !== true) {
    throw new Error(`agent "${requested}" is not eligible for governed local dispatch`);
  }
  if (entry.kind !== 'external-binary') {
    throw new Error(`agent "${requested}" has unsupported runtime kind: ${entry.kind || 'unknown'}`);
  }
  if (entry.adapter !== 'agent-binary-http-bridge') {
    throw new Error(`agent "${requested}" has unsupported adapter: ${entry.adapter || 'unknown'}`);
  }
  if (typeof entry.opsly_job_type !== 'string' || !entry.opsly_job_type.startsWith('local_')) {
    throw new Error(`agent "${requested}" has invalid opsly_job_type`);
  }

  const policy = entry.github_queue;
  if (!policy || policy.eligible !== true) {
    throw new Error(`agent "${requested}" is not approved for GitHub Agent Queue`);
  }
  if (entry.write_access !== false || policy.read_only !== true) {
    throw new Error(`agent "${requested}" is write-capable and GitHub Agent Queue is read-only`);
  }
  if (policy.provider_approved !== true) {
    throw new Error(`agent "${requested}" provider is not approved for GitHub Agent Queue`);
  }
  if (!['free', 'free_with_quota'].includes(policy.cost_class)) {
    throw new Error(`agent "${requested}" has non-zero/unknown GitHub queue cost policy`);
  }

  const workpackCostClass = String(meta?.cost_class ?? '').trim();
  if (workpackCostClass === 'free' && policy.cost_class !== 'free') {
    throw new Error(`agent "${requested}" requires ${policy.cost_class}, incompatible with free workpack`);
  }
  if (
    workpackCostClass === 'free_with_quota' &&
    !['free', 'free_with_quota'].includes(policy.cost_class)
  ) {
    throw new Error(`agent "${requested}" cost policy is incompatible with free_with_quota workpack`);
  }

  const taskType = String(meta?.task_type ?? '').trim();
  if (!taskType) {
    throw new Error('missing required frontmatter field: task_type');
  }
  const supported = Array.isArray(entry.supported_task_types) ? entry.supported_task_types : [];
  if (!supported.includes(taskType)) {
    throw new Error(
      `agent "${requested}" does not support task_type "${taskType}"`
    );
  }

  return {
    workerId,
    opslyJobType: entry.opsly_job_type,
    taskType,
    provider: entry.provider,
    costClass: policy.cost_class,
  };
}

export async function loadGovernedAgentRegistry(root) {
  let canonical;
  try {
    canonical = await import('@intcloudsysops/external-agent-registry');
  } catch (error) {
    throw new Error(
      'canonical external-agent-registry package is unavailable; build workspace packages before dispatch'
    );
  }
  if (typeof canonical.loadExternalAgentRegistry !== 'function') {
    throw new Error('canonical external-agent-registry loader is unavailable');
  }
  return canonical.loadExternalAgentRegistry(root);
}


export async function buildReadOnlyQueueEnvelope({
  meta,
  governedAgent,
  task,
  requestId,
}) {
  let core;
  try {
    core = await import('@intcloudsysops/agent-task-core');
  } catch {
    throw new Error(
      'canonical agent-task-core package is unavailable; build workspace packages before dispatch'
    );
  }
  if (
    typeof core.buildAgentTaskEnvelope !== 'function' ||
    typeof core.evaluateAgentTaskPolicy !== 'function'
  ) {
    throw new Error('canonical AgentTaskEnvelopeV1 policy helpers are unavailable');
  }

  const envelope = core.buildAgentTaskEnvelope({
    task,
    tenantSlug: 'local',
    taskType: governedAgent.taskType,
    selectedAgent: governedAgent.opslyJobType,
    requestedAgent: governedAgent.workerId,
    requestId,
    correlationId: requestId,
    executionMode: 'enqueue',
    localOnly: true,
    writeAllowed: false,
    networkAllowed: false,
    browserAllowed: false,
    maxAttempts: 1,
    maxCostUsd: 0,
    source: 'github-agent-queue',
    actor: 'system',
    metadata: {
      workpack_id: String(meta.id),
      workstream: String(meta.workstream),
      conflict_key: String(meta.conflict_key),
      registry_worker_id: governedAgent.workerId,
      registry_provider: governedAgent.provider,
      registry_cost_class: governedAgent.costClass,
    },
  });

  const policy = core.evaluateAgentTaskPolicy(envelope, { tenantMaxCostUsd: 0 });
  if (policy.decision !== 'allow') {
    throw new Error(
      `AgentTaskEnvelopeV1 policy denied GitHub Agent Queue task: ${policy.decision} (${policy.reasons.join(',')})`,
    );
  }
  if (
    envelope.task_type !== governedAgent.taskType ||
    envelope.selected_agent !== governedAgent.opslyJobType ||
    envelope.constraints.write_allowed !== false ||
    envelope.constraints.network_allowed !== false ||
    envelope.constraints.browser_allowed !== false ||
    envelope.budget.max_cost_usd !== 0
  ) {
    throw new Error('AgentTaskEnvelopeV1 does not match governed read-only queue admission');
  }
  return envelope;
}
