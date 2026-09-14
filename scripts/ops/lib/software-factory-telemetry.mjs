const RECONCILIATION_LANES = new Set([
  'MERGE_READY',
  'BEHIND',
  'CONFLICTED',
  'CHECK_FAILED',
  'CHECK_PENDING',
  'REVIEW_BLOCKED',
  'SUPERSEDED',
  'PROTECTED',
  'UNKNOWN',
]);

function ratio(a, b) {
  return typeof a === 'number' && typeof b === 'number' && b > 0
    ? Number((a / b).toFixed(4))
    : null;
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function threshold(policy, key, fallback, { ratioValue = false } = {}) {
  const raw = policy?.[key] ?? fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || (ratioValue && value > 1)) {
    throw new Error(`invalid telemetry policy threshold: ${key}`);
  }
  return value;
}

function validateReconciliation(reconciliation) {
  if (reconciliation?.mode !== 'READ_ONLY' || !Array.isArray(reconciliation?.pullRequests)) {
    return { observed: false, pullRequests: [], error: 'reconciliation evidence unavailable' };
  }
  for (const item of reconciliation.pullRequests) {
    if (!item || typeof item !== 'object' || !RECONCILIATION_LANES.has(item.lane)) {
      return {
        observed: false,
        pullRequests: [],
        error: 'reconciliation evidence contains malformed lane data',
      };
    }
  }
  return { observed: true, pullRequests: reconciliation.pullRequests, error: null };
}

function validateWorkstreamArray(workstreams, key) {
  const value = workstreams?.[key];
  return Array.isArray(value) ? value : [];
}

export function buildFactoryTelemetry({ workstreams = {}, reconciliation = {}, policy = {} }) {
  const thresholds = {
    verifierCoverageTarget: threshold(policy, 'verifier_coverage_target', 0.9, { ratioValue: true }),
    blockedRatioWarn: threshold(policy, 'blocked_ratio_warn', 0.2, { ratioValue: true }),
    conflictedPrWarn: threshold(policy, 'conflicted_pr_warn', 1),
    behindPrWarn: threshold(policy, 'behind_pr_warn', 3),
    failedCheckWarn: threshold(policy, 'failed_check_warn', 1),
    mergeReadyBacklogWarn: threshold(policy, 'merge_ready_backlog_warn', 5),
  };

  const claimsObserved =
    workstreams?.claims_observed === true && Array.isArray(workstreams?.active_claims);
  const runtimeObserved =
    workstreams?.runtime_sessions_observed === true &&
    Array.isArray(workstreams?.runtime_sessions);
  const githubObserved =
    workstreams?.github_observed === true &&
    workstreams?.github_evidence_complete === true &&
    Array.isArray(workstreams?.pull_requests);

  const claims = claimsObserved ? validateWorkstreamArray(workstreams, 'active_claims') : [];
  const sessions = runtimeObserved ? validateWorkstreamArray(workstreams, 'runtime_sessions') : [];
  const prs = githubObserved ? validateWorkstreamArray(workstreams, 'pull_requests') : [];

  const reconciliationState = validateReconciliation(reconciliation);
  const reconciliationPrs = reconciliationState.pullRequests;

  const liveSessions = runtimeObserved
    ? sessions.filter((session) =>
        ['running', 'waiting_approval', 'checkpointed'].includes(String(session?.status || '')),
      ).length
    : null;

  const verified = githubObserved
    ? prs.filter((pr) => ['PASS', 'FAIL', 'BLOCKED'].includes(String(pr?.verifier || ''))).length
    : null;
  const ready = githubObserved
    ? prs.filter((pr) => pr?.merge_readiness === 'READY').length
    : null;
  const blocked = githubObserved
    ? prs.filter(
        (pr) =>
          pr?.merge_readiness === 'BLOCKED' ||
          ['FAIL', 'BLOCKED'].includes(String(pr?.verifier || '')) ||
          pr?.check_state === 'FAIL',
      ).length
    : null;

  const lanes = {};
  if (reconciliationState.observed) {
    for (const pr of reconciliationPrs) lanes[pr.lane] = (lanes[pr.lane] || 0) + 1;
  }

  const evidencedPullRequests = githubObserved ? prs.length : null;
  const metrics = {
    active_claims: claimsObserved ? claims.length : null,
    completed_claim_tombstones:
      claimsObserved && finiteNumber(workstreams.completed_claim_tombstones)
        ? workstreams.completed_claim_tombstones
        : null,
    live_runtime_sessions: liveSessions,
    evidenced_pull_requests: evidencedPullRequests,
    verifier_coverage: githubObserved ? ratio(verified, prs.length) : null,
    merge_ready: ready,
    merge_ready_ratio: githubObserved ? ratio(ready, prs.length) : null,
    blocked,
    blocked_ratio: githubObserved ? ratio(blocked, prs.length) : null,
    reconciliation: reconciliationState.observed
      ? {
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
        }
      : null,
  };

  const recommendations = [];
  if (
    githubObserved &&
    metrics.verifier_coverage !== null &&
    metrics.verifier_coverage < thresholds.verifierCoverageTarget
  ) {
    recommendations.push({
      id: 'raise-verifier-coverage',
      priority: 'high',
      reason: `verifier coverage ${metrics.verifier_coverage} is below target ${thresholds.verifierCoverageTarget}`,
      next_action: 'route unverified merge-capable work through the independent verifier',
    });
  }
  if (
    githubObserved &&
    metrics.blocked_ratio !== null &&
    metrics.blocked_ratio >= thresholds.blockedRatioWarn
  ) {
    recommendations.push({
      id: 'reduce-blocked-work',
      priority: 'high',
      reason: `blocked ratio is ${metrics.blocked_ratio}`,
      next_action: 'classify blockers and route safe ones to repair/reconciliation',
    });
  }

  if (metrics.reconciliation) {
    if (metrics.reconciliation.conflicted >= thresholds.conflictedPrWarn) {
      recommendations.push({
        id: 'resolve-conflicts',
        priority: 'medium',
        reason: `${metrics.reconciliation.conflicted} conflicted PR(s)`,
        next_action: 'assign owned conflict-resolution slices; never resolve on protected branches blindly',
      });
    }
    if (metrics.reconciliation.behind >= thresholds.behindPrWarn) {
      recommendations.push({
        id: 'reduce-behind-backlog',
        priority: 'medium',
        reason: `${metrics.reconciliation.behind} PR(s) behind base`,
        next_action: 'reconcile behind branches one at a time with fresh head evidence',
      });
    }
    if (metrics.reconciliation.check_failed >= thresholds.failedCheckWarn) {
      recommendations.push({
        id: 'repair-failing-checks',
        priority: 'high',
        reason: `${metrics.reconciliation.check_failed} PR(s) have failed checks`,
        next_action: 'classify failure from trusted evidence; auto-rerun only bounded verified transient failures',
      });
    }
    if (metrics.reconciliation.merge_ready >= thresholds.mergeReadyBacklogWarn) {
      recommendations.push({
        id: 'drain-merge-ready',
        priority: 'medium',
        reason: `${metrics.reconciliation.merge_ready} PR(s) are merge-ready`,
        next_action: 'advance governed merge wave and regenerate reconciliation inventory after each merge',
      });
    }
  }

  const canonicalTaskIdsVisible = githubObserved
    ? prs.filter(
        (pr) => typeof pr?.request_id === 'string' && pr.request_id.trim().length > 0,
      ).length
    : null;
  if (
    githubObserved &&
    prs.length > 0 &&
    canonicalTaskIdsVisible !== null &&
    canonicalTaskIdsVisible < prs.length
  ) {
    recommendations.push({
      id: 'propagate-canonical-learning-identity',
      priority: 'high',
      reason: `${prs.length - canonicalTaskIdsVisible} evidenced PR(s) lack AgentTaskEnvelopeV1.request_id in the factory read model`,
      next_action: 'propagate canonical request_id through execution evidence; never substitute work_id or PR number',
    });
  }

  const sources = {
    claims_observed: claimsObserved,
    runtime_sessions_observed: runtimeObserved,
    github_observed: githubObserved,
    reconciliation_observed: reconciliationState.observed,
  };
  const complete = Object.values(sources).every(Boolean);

  return {
    schema_version: 'SoftwareFactoryTelemetrySnapshotV1',
    generated_at: new Date().toISOString(),
    confidence: complete ? 'COMPLETE' : 'PARTIAL',
    sources,
    source_errors: [
      ...(claimsObserved ? [] : ['claims evidence unavailable or malformed']),
      ...(runtimeObserved ? [] : ['runtime-session evidence unavailable or malformed']),
      ...(githubObserved ? [] : ['GitHub evidence unavailable, partial, or malformed']),
      ...(reconciliationState.error ? [reconciliationState.error] : []),
    ],
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
      note: 'V1 computes recommendations only from sources whose evidence is explicitly complete. No routing policy self-modification occurs.',
    },
  };
}
