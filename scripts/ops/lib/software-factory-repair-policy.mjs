export const AUTO_FAILURE_CLASS = 'INFRA/TRANSIENT';

export function normalizedFailureClass(value) {
  return String(value || '').trim().toUpperCase();
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
  const attempt = Number(request?.attempt ?? 0);
  const expectedHeadSha = String(request?.expected_head_sha || '').trim();

  if (!request?.work_id) reasons.push('missing work_id');
  if (!Number.isInteger(Number(request?.pr_number)) || Number(request?.pr_number) <= 0) {
    reasons.push('invalid pr_number');
  }
  if (!expectedHeadSha) reasons.push('missing expected_head_sha');
  if (!action) reasons.push('missing action');
  if (attempt >= Number(policy?.max_auto_attempts ?? 0)) reasons.push('auto repair attempt limit reached');

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
