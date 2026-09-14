function ratio(a, b) {
  return b > 0 ? Number((a / b).toFixed(4)) : null;
}

export function buildFactoryTelemetry({ workstreams = {}, reconciliation = {}, policy = {} }) {
  const prs = Array.isArray(workstreams.pull_requests) ? workstreams.pull_requests : [];
  const reconciliationPrs = Array.isArray(reconciliation.pullRequests)
    ? reconciliation.pullRequests
    : [];
  const liveSessions = (workstreams.runtime_sessions || []).filter(
    (session) => session.status === 'running' || session.status === 'waiting_approval',
  ).length;

  const verified = prs.filter((pr) => pr.verifier && pr.verifier !== 'UNKNOWN').length;
  const ready = prs.filter((pr) => pr.merge_readiness === 'READY').length;
  const blocked = prs.filter((pr) => pr.merge_readiness === 'BLOCKED').length;

  const lanes = {};
  for (const pr of reconciliationPrs) lanes[pr.lane] = (lanes[pr.lane] || 0) + 1;

  const metrics = {
    active_claims: (workstreams.active_claims || []).length,
    completed_claim_tombstones: Number(workstreams.completed_claim_tombstones || 0),
    live_runtime_sessions: liveSessions,
    evidenced_pull_requests: prs.length,
    verifier_coverage: ratio(verified, prs.length),
    merge_ready: ready,
    blocked: blocked,
    blocked_ratio: ratio(blocked, prs.length),
    reconciliation: {
      total_open_prs: reconciliationPrs.length,
      merge_ready: lanes.MERGE_READY || 0,
      behind: lanes.BEHIND || 0,
      conflicted: lanes.CONFLICTED || 0,
      check_failed: lanes.CHECK_FAILED || 0,
      check_pending: lanes.CHECK_PENDING || 0,
      review_blocked: lanes.REVIEW_BLOCKED || 0,
      superseded: lanes.SUPERSEDED || 0,
      protected: lanes.PROTECTED || 0,
      unknown: lanes.UNKNOWN || 0,
    },
  };

  const recommendations = [];
  const target = Number(policy.verifier_coverage_target ?? 0.9);
  if (metrics.verifier_coverage !== null && metrics.verifier_coverage < target) {
    recommendations.push({
      id: 'raise-verifier-coverage',
      priority: 'high',
      reason: `verifier coverage ${metrics.verifier_coverage} is below target ${target}`,
      next_action: 'route unverified merge-capable work through the independent verifier',
    });
  }
  if ((metrics.blocked_ratio || 0) >= Number(policy.blocked_ratio_warn ?? 0.2)) {
    recommendations.push({
      id: 'reduce-blocked-work',
      priority: 'high',
      reason: `blocked ratio is ${metrics.blocked_ratio}`,
      next_action: 'classify blockers and route safe ones to repair/reconciliation',
    });
  }
  if (metrics.reconciliation.conflicted >= Number(policy.conflicted_pr_warn ?? 1)) {
    recommendations.push({
      id: 'resolve-conflicts',
      priority: 'medium',
      reason: `${metrics.reconciliation.conflicted} conflicted PR(s)`,
      next_action: 'assign owned conflict-resolution slices; never resolve on protected branches blindly',
    });
  }
  if (metrics.reconciliation.behind >= Number(policy.behind_pr_warn ?? 3)) {
    recommendations.push({
      id: 'reduce-behind-backlog',
      priority: 'medium',
      reason: `${metrics.reconciliation.behind} PR(s) behind base`,
      next_action: 'reconcile behind branches one at a time with fresh head evidence',
    });
  }
  if (metrics.reconciliation.check_failed >= Number(policy.failed_check_warn ?? 1)) {
    recommendations.push({
      id: 'repair-failing-checks',
      priority: 'high',
      reason: `${metrics.reconciliation.check_failed} PR(s) have failed checks`,
      next_action: 'classify failure class; auto-rerun only bounded INFRA/TRANSIENT failures',
    });
  }
  if (metrics.reconciliation.merge_ready >= Number(policy.merge_ready_backlog_warn ?? 5)) {
    recommendations.push({
      id: 'drain-merge-ready',
      priority: 'medium',
      reason: `${metrics.reconciliation.merge_ready} PR(s) are merge-ready`,
      next_action: 'advance governed merge wave and regenerate reconciliation inventory after each merge',
    });
  }

  const canonicalTaskIdsVisible = prs.filter(
    (pr) => typeof pr.request_id === 'string' && pr.request_id.trim().length > 0,
  ).length;
  if (prs.length > 0 && canonicalTaskIdsVisible < prs.length) {
    recommendations.push({
      id: 'propagate-canonical-learning-identity',
      priority: 'high',
      reason: `${prs.length - canonicalTaskIdsVisible} evidenced PR(s) lack AgentTaskEnvelopeV1.request_id in the factory read model`,
      next_action: 'propagate canonical request_id through execution evidence; never substitute work_id or PR number',
    });
  }

  return {
    schema_version: 'SoftwareFactoryTelemetrySnapshotV1',
    generated_at: new Date().toISOString(),
    sources: {
      claims_observed: workstreams.claims_observed === true,
      runtime_sessions_observed: workstreams.runtime_sessions_observed === true,
      github_observed: workstreams.github_observed === true,
      reconciliation_observed: reconciliation.mode === 'READ_ONLY',
    },
    metrics,
    recommendations,
    learning_state: {
      canonical_owner: '@intcloudsysops/agent-learning',
      canonical_task_identity: 'AgentTaskEnvelopeV1.request_id',
      canonical_task_ids_visible: canonicalTaskIdsVisible,
      persistent_history: false,
      continuous_durable_export: false,
      mission_control_scorecards: false,
      adaptive_routing: false,
      status: 'OBSERVE_AND_RECOMMEND',
      note: 'V1 computes evidence-backed recommendations. Learning evidence belongs to agent-learning and must use canonical request_id; no routing policy self-modification occurs.',
    },
  };
}
