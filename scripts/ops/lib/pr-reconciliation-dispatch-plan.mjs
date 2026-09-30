export function planReconciliationDispatch(workpack) {
  const base = {
    prNumber: workpack.prNumber,
    expectedHeadSha: workpack.expectedHeadSha,
    protected: workpack.protected === true,
    operation: workpack.operation,
    action: 'HOLD',
    mutatesBranch: false,
    reason: null,
    parallelLane: workpack.parallelLane ?? 'reconciliation',
    sharedGate: workpack.sharedGate ?? null,
  };

  if (workpack.operation === 'REQUEST_INDEPENDENT_REVIEW') {
    return {
      ...base,
      action: 'DISPATCH_INDEPENDENT_REVIEW',
      reason: 'missing/stale independent review; reviewer is read-only',
    };
  }

  if (workpack.operation === 'REPAIR' && workpack.protected !== true) {
    return {
      ...base,
      action: 'DISPATCH_PR_DOCTOR',
      mutatesBranch: true,
      reason: 'real technical check failure on non-protected surface',
    };
  }

  if (workpack.operation === 'REPAIR_REVIEW_BLOCKER' && workpack.protected !== true) {
    return {
      ...base,
      action: 'DISPATCH_PR_DOCTOR_REVIEW',
      mutatesBranch: true,
      reason: 'exact-head CHANGES_REQUESTED on non-protected surface',
    };
  }

  if (workpack.protected === true) {
    return {
      ...base,
      action: 'HOLD_PROTECTED',
      reason: 'protected surface; autonomous branch mutation forbidden',
    };
  }

  return {
    ...base,
    action: 'HOLD',
    reason: 'no canonical automated action for this lane yet',
  };
}

export function buildReconciliationDispatchPlan(source) {
  const rawActions = (source.workpacks || []).map(planReconciliationDispatch);
  const seenSharedGates = new Set();
  const actions = rawActions.map((action) => {
    if (
      action.action === 'DISPATCH_INDEPENDENT_REVIEW' &&
      action.sharedGate
    ) {
      if (seenSharedGates.has(action.sharedGate)) {
        return {
          ...action,
          action: 'HOLD_SHARED_GATE',
          reason: `shared gate ${action.sharedGate} already has a probe in this sweep`,
        };
      }
      seenSharedGates.add(action.sharedGate);
    }
    return action;
  });
  return {
    schema_version: 'ReconciliationDispatchPlanV1',
    generated_at: new Date().toISOString(),
    repository: source.repository || null,
    actions,
    summary: actions.reduce((acc, action) => {
      acc[action.action] = (acc[action.action] || 0) + 1;
      return acc;
    }, {}),
  };
}
