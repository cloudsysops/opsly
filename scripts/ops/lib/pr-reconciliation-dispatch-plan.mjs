export function planReconciliationDispatch(workpack) {
  const base = {
    prNumber: workpack.prNumber,
    expectedHeadSha: workpack.expectedHeadSha,
    protected: workpack.protected === true,
    operation: workpack.operation,
    action: 'HOLD',
    mutatesBranch: false,
    reason: null,
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
  const actions = (source.workpacks || []).map(planReconciliationDispatch);
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
