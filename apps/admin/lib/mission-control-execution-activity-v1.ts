export type ExecutionTransportV1 = 'autonomous' | 'human_relay';

export type ExecutionSourceCapabilityV1 = {
  source_id: string;
  transport: ExecutionTransportV1;
  available: boolean;
  confidence: 'REAL' | 'UNKNOWN';
  detail: string;
};

export type ExecutionActivityStateV1 =
  | 'CLAIMED'
  | 'RUNNING'
  | 'REVIEW'
  | 'MERGE_READY'
  | 'IDLE'
  | 'ERROR'
  | 'BLOCKED'
  | 'UNKNOWN';

export type MissionControlExecutionActivityV1 = {
  work_id: string;
  agent_id: string;
  transport: ExecutionTransportV1;
  session_type: 'orchestrated_runtime' | 'interactive_subscription';
  state: ExecutionActivityStateV1;
  machine: string | null;
  workstream: string | null;
  conflict_key: string | null;
  branch: string | null;
  pr_url: string | null;
  verifier: 'PASS' | 'FAIL' | 'BLOCKED' | 'UNKNOWN';
  merge_readiness: 'READY' | 'BLOCKED' | 'UNKNOWN';
  blocker: string | null;
  source_id: string;
  confidence: 'REAL' | 'UNKNOWN';
};

export type ExecutionSourcesInputV1 = {
  registry_driven_admission: boolean;
  handoff_available: boolean;
  registered_workers: Array<{
    id: string;
    enabled: boolean;
    opsly_job_type: string | null;
  }>;
};

export type FactoryRuntimeSessionInputV1 = {
  session_id: string;
  work_id: string | null;
  agent_id: string;
  status:
    | 'created'
    | 'running'
    | 'checkpointed'
    | 'waiting_approval'
    | 'stopped'
    | 'failed'
    | 'resumable'
    | 'unknown';
  branch: string | null;
  last_seen_at: string | null;
};

export type FactoryClaimInputV1 = {
  claim_id: string;
  work_id: string;
  workstream: string | null;
  owner: string | null;
  state: 'active';
  conflict_key: string | null;
  semantic_scope: string | null;
  affected_paths: string[];
};

export type FactoryPullRequestInputV1 = {
  work_id: string;
  agent_id: string | null;
  workstream: string | null;
  conflict_key: string | null;
  transport: 'autonomous' | 'human_relay' | 'unknown';
  pr_number: number;
  pr_url: string;
  branch: string;
  head_sha: string;
  title: string;
  draft: boolean;
  verifier: 'PASS' | 'FAIL' | 'BLOCKED' | 'UNKNOWN';
  merge_readiness: 'READY' | 'BLOCKED' | 'UNKNOWN';
  check_state: 'PASS' | 'FAIL' | 'PENDING' | 'UNKNOWN';
  mergeable: boolean | null;
  blocker: string | null;
};

export type MissionControlExecutionProjectionV1 = {
  schema_version: 'MissionControlExecutionProjectionV1';
  sources: ExecutionSourceCapabilityV1[];
  activities: MissionControlExecutionActivityV1[];
};

function githubState(
  pr: FactoryPullRequestInputV1,
): Extract<ExecutionActivityStateV1, 'REVIEW' | 'MERGE_READY' | 'BLOCKED'> {
  if (
    pr.merge_readiness === 'BLOCKED' ||
    pr.verifier === 'BLOCKED' ||
    pr.verifier === 'FAIL' ||
    pr.check_state === 'FAIL'
  ) {
    return 'BLOCKED';
  }
  if (pr.merge_readiness === 'READY') return 'MERGE_READY';
  return 'REVIEW';
}

function appendSource(current: string, source: string): string {
  const values = new Set(current.split('+').filter(Boolean));
  values.add(source);
  return [...values].join('+');
}

export function buildMissionControlExecutionProjectionV1(input: {
  execution_sources?: ExecutionSourcesInputV1;
  active_claims?: FactoryClaimInputV1[];
  runtime_sessions?: FactoryRuntimeSessionInputV1[];
  pull_requests?: FactoryPullRequestInputV1[];
}): MissionControlExecutionProjectionV1 {
  const sourceInput = input.execution_sources;

  const sources: ExecutionSourceCapabilityV1[] = [
    {
      source_id: 'autonomous_harness',
      transport: 'autonomous',
      available: sourceInput?.registry_driven_admission === true,
      confidence: sourceInput ? 'REAL' : 'UNKNOWN',
      detail: sourceInput
        ? sourceInput.registry_driven_admission
          ? 'GitHub Agent Queue admission is registry-driven in this checkout.'
          : 'Registry exists, but registry-driven queue admission is not present in this checkout.'
        : 'Execution source probe unavailable.',
    },
    {
      source_id: 'human_relay_harness',
      transport: 'human_relay',
      available: sourceInput?.handoff_available === true,
      confidence: sourceInput ? 'REAL' : 'UNKNOWN',
      detail: sourceInput
        ? sourceInput.handoff_available
          ? 'Interactive subscription handoff adapter is present in this checkout.'
          : 'Interactive subscription handoff adapter is not present in this checkout.'
        : 'Execution source probe unavailable.',
    },
  ];

  const byWork = new Map<string, MissionControlExecutionActivityV1>();

  for (const claim of input.active_claims ?? []) {
    byWork.set(claim.work_id, {
      work_id: claim.work_id,
      agent_id: claim.owner ?? 'autonomous-worker',
      transport: 'autonomous',
      session_type: 'orchestrated_runtime',
      // Ownership is real evidence of admission, not evidence that a runtime is executing.
      state: 'CLAIMED',
      machine: null,
      workstream: claim.workstream,
      conflict_key: claim.conflict_key,
      branch: null,
      pr_url: null,
      verifier: 'UNKNOWN',
      merge_readiness: 'UNKNOWN',
      blocker: null,
      source_id: 'dispatch_claims',
      confidence: 'REAL',
    });
  }

  for (const session of input.runtime_sessions ?? []) {
    if (session.status !== 'running' && session.status !== 'waiting_approval') continue;

    const workId = session.work_id ?? `session:${session.session_id}`;
    const existing = byWork.get(workId);
    const state: ExecutionActivityStateV1 =
      session.status === 'running' ? 'RUNNING' : 'BLOCKED';
    const blocker =
      session.status === 'waiting_approval' ? 'runtime session is waiting for approval' : null;

    if (existing) {
      existing.agent_id = session.agent_id;
      existing.state = state;
      existing.branch = existing.branch ?? session.branch;
      existing.blocker = blocker ?? existing.blocker;
      existing.source_id = appendSource(existing.source_id, 'runtime_sessions');
      continue;
    }

    byWork.set(workId, {
      work_id: workId,
      agent_id: session.agent_id,
      transport: 'autonomous',
      session_type: 'orchestrated_runtime',
      state,
      machine: null,
      workstream: null,
      conflict_key: null,
      branch: session.branch,
      pr_url: null,
      verifier: 'UNKNOWN',
      merge_readiness: 'UNKNOWN',
      blocker,
      source_id: 'runtime_sessions',
      confidence: 'REAL',
    });
  }

  for (const pr of input.pull_requests ?? []) {
    const existing = byWork.get(pr.work_id);

    if (existing) {
      existing.branch = pr.branch || null;
      existing.pr_url = pr.pr_url || null;
      existing.workstream = existing.workstream ?? pr.workstream;
      existing.conflict_key = existing.conflict_key ?? pr.conflict_key;
      existing.verifier = pr.verifier;
      existing.merge_readiness = pr.merge_readiness;
      existing.blocker = pr.blocker;
      existing.source_id = appendSource(existing.source_id, 'github');

      const lifecycleState = githubState(pr);
      if (lifecycleState === 'BLOCKED') {
        existing.state = 'BLOCKED';
      } else if (
        existing.state !== 'RUNNING' &&
        existing.state !== 'ERROR' &&
        existing.state !== 'BLOCKED'
      ) {
        existing.state = lifecycleState;
      }
      continue;
    }

    // An unmarked/generic PR is useful enrichment for a known claim, but by itself it
    // must never fabricate a human relay or autonomous execution record.
    if (pr.transport === 'unknown') continue;

    byWork.set(pr.work_id, {
      work_id: pr.work_id,
      agent_id:
        pr.agent_id ??
        (pr.transport === 'human_relay' ? 'human-relay' : 'autonomous-worker'),
      transport: pr.transport,
      session_type:
        pr.transport === 'human_relay'
          ? 'interactive_subscription'
          : 'orchestrated_runtime',
      state: githubState(pr),
      machine: null,
      workstream: pr.workstream,
      conflict_key: pr.conflict_key,
      branch: pr.branch || null,
      pr_url: pr.pr_url || null,
      verifier: pr.verifier,
      merge_readiness: pr.merge_readiness,
      blocker: pr.blocker,
      source_id: 'github',
      confidence: 'REAL',
    });
  }

  const activities = [...byWork.values()].sort((a, b) => {
    const workstream = (a.workstream ?? '').localeCompare(b.workstream ?? '');
    if (workstream !== 0) return workstream;
    return a.work_id.localeCompare(b.work_id);
  });

  return {
    schema_version: 'MissionControlExecutionProjectionV1',
    sources,
    activities,
  };
}
