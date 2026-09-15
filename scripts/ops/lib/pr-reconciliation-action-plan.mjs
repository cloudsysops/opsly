export function planReconciliationAction(record) {
  const base = {
    pr_number: record.number,
    lane: record.lane,
    head_sha: record.headSha || null,
    protected: record.protected === true,
    action: 'HOLD',
    safe_to_automate: false,
    reason: null,
  };

  if (record.protected) {
    return { ...base, action: 'ESCALATE', reason: 'protected surface' };
  }

  switch (record.lane) {
    case 'MERGE_READY':
      return {
        ...base,
        action: 'QUEUE_GOVERNED_MERGE',
        safe_to_automate: false,
        reason: 'merge candidate; exact-head merge must run through canonical governed merge path',
      };
    case 'BEHIND':
      return {
        ...base,
        action: 'UPDATE_BRANCH_CANDIDATE',
        safe_to_automate: false,
        reason: 'branch update requires fresh head/base verification',
      };
    case 'CHECK_FAILED':
      return {
        ...base,
        action: 'REPAIR',
        safe_to_automate: false,
        reason: 'delegate to Safe Repair policy; do not mutate from reconciliation',
      };
    case 'CONFLICTED':
      return {
        ...base,
        action: 'HUMAN_OR_AGENT_REBASE',
        reason: 'conflict resolution needs owned branch context',
      };
    case 'CHECK_PENDING':
      return { ...base, action: 'WAIT', reason: 'checks still running' };
    case 'REVIEW_BLOCKED':
      return { ...base, action: 'WAIT_REVIEW', reason: 'material review blocker' };
    case 'SUPERSEDED':
      return { ...base, action: 'CLEANUP_CANDIDATE', reason: 'superseded work; cleanup after proof' };
    default:
      return { ...base, action: 'HOLD', reason: 'insufficient evidence' };
  }
}

export function buildReconciliationPlan(inventory) {
  return {
    schema_version: 'ReconciliationActionPlanV1',
    generated_at: new Date().toISOString(),
    inventory_generated_at: inventory.generatedAt || null,
    repository: inventory.repository || null,
    actions: (inventory.pullRequests || []).map(planReconciliationAction),
  };
}
