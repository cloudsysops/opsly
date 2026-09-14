export const AUTO_FAILURE_CLASS = 'INFRA_TRANSIENT';

export function normalizedFailureClass(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function containsProtectedSurface(values, protectedPatterns) {
  const haystack = (values || []).map((value) => String(value || '').toLowerCase());
  return (protectedPatterns || []).some((pattern) => {
    const normalized = String(pattern || '').toLowerCase();
    return normalized && haystack.some((value) => value.includes(normalized));
  });
}

export function evaluateRepairRequest(request, policy, evidence = {}) {
  const reasons = [];
  const failureClass = normalizedFailureClass(request?.failure_class);
  const action = String(request?.action || '').trim();
  const expectedHeadSha = String(request?.expected_head_sha || '').trim();
  const runAttempt = Number(evidence?.run_attempt ?? 1);

  if (!request?.work_id) reasons.push('missing work_id');
  if (!Number.isInteger(Number(request?.pr_number)) || Number(request?.pr_number) <= 0) {
    reasons.push('invalid pr_number');
  }
  if (!expectedHeadSha) reasons.push('missing expected_head_sha');
  if (!action) reasons.push('missing action');
  if (!Number.isInteger(runAttempt) || runAttempt <= 0) {
    reasons.push('invalid workflow run_attempt evidence');
  } else if (runAttempt > Number(policy?.max_auto_attempts ?? 0)) {
    reasons.push('auto repair attempt limit reached');
  }

  const allowedActions = policy?.auto_actions?.[failureClass] || [];
  if (!allowedActions.includes(action)) {
    reasons.push(`action ${action || 'UNKNOWN'} is not auto-allowed for ${failureClass || 'UNKNOWN'}`);
  }

  if ((policy?.forbidden_actions || []).includes(action)) {
    reasons.push(`action ${action} is explicitly forbidden`);
  }

  if (evidence.current_head_sha && evidence.current_head_sha !== expectedHeadSha) {
    reasons.push('head sha changed since repair request');
  }

  if (evidence.run_head_sha && evidence.run_head_sha !== expectedHeadSha) {
    reasons.push('workflow run head sha does not match repair head');
  }
  if (
    Number.isInteger(Number(evidence.run_pr_number)) &&
    Number(evidence.run_pr_number) !== Number(request?.pr_number)
  ) {
    reasons.push('workflow run is not bound to requested pull request');
  }
  if (evidence.run_event && evidence.run_event !== 'pull_request') {
    reasons.push('workflow run event is not pull_request');
  }
  if (evidence.run_status && evidence.run_status !== 'completed') {
    reasons.push('workflow run is not completed');
  }
  if (evidence.run_conclusion && evidence.run_conclusion !== 'failure') {
    reasons.push('workflow run is not failed');
  }

  if (
    containsProtectedSurface(
      [
        ...(request?.affected_paths || []),
        ...(evidence.files || []),
        evidence.title,
        evidence.body,
        evidence.branch,
      ],
      policy?.protected_patterns || [],
    )
  ) {
    reasons.push('protected surface detected');
  }

  return {
    schema_version: 'SafeRepairDecisionV1',
    work_id: request?.work_id || null,
    pr_number: Number(request?.pr_number) || null,
    action: action || null,
    failure_class: failureClass || 'UNKNOWN',
    expected_head_sha: expectedHeadSha || null,
    allowed: reasons.length === 0,
    reasons,
    mode: reasons.length === 0 ? 'AUTO_SAFE' : 'BLOCKED',
  };
}
