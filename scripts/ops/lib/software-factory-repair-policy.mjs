export function classifyVerifiedFailure(jobs, policy = {}) {
  if (!Array.isArray(jobs) || jobs.length === 0) return 'UNKNOWN';

  for (const job of jobs) {
    const status = String(job?.status || '').toLowerCase();
    const conclusion = String(job?.conclusion || '').toLowerCase();
    if (status !== 'completed' || !conclusion) return 'UNKNOWN';
  }

  const failed = jobs.filter((job) => {
    const conclusion = String(job?.conclusion || '').toLowerCase();
    return !['success', 'neutral', 'skipped'].includes(conclusion);
  });
  if (failed.length === 0) return 'UNKNOWN';

  const transient = new Set(
    Array.isArray(policy?.transient_conclusions)
      ? policy.transient_conclusions.map((value) => String(value).toLowerCase())
      : ['timed_out', 'startup_failure', 'stale'],
  );

  return failed.every((job) => transient.has(String(job?.conclusion || '').toLowerCase()))
    ? 'INFRA_TRANSIENT'
    : 'UNKNOWN';
}

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
  const requestedFailureClass = normalizedFailureClass(request?.failure_class);
  const failureClass = normalizedFailureClass(evidence?.verified_failure_class);
  const action = String(request?.action || '').trim();
  const expectedHeadSha = String(request?.expected_head_sha || '').trim();
  const runAttempt = Number(evidence?.run_attempt);
  const maxAttempts = Number(policy?.max_auto_attempts);

  if (!request?.work_id) reasons.push('missing work_id');
  if (!Number.isInteger(Number(request?.pr_number)) || Number(request?.pr_number) <= 0) {
    reasons.push('invalid pr_number');
  }
  if (!expectedHeadSha) reasons.push('missing expected_head_sha');
  if (!action) reasons.push('missing action');
  if (!failureClass) reasons.push('missing verified failure classification');
  if (requestedFailureClass && failureClass && requestedFailureClass !== failureClass) {
    reasons.push('requested failure_class does not match verified failure evidence');
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 0) {
    reasons.push('invalid max_auto_attempts policy');
  }

  if (!Number.isInteger(runAttempt) || runAttempt <= 0) {
    reasons.push('invalid workflow run_attempt evidence');
  } else if (Number.isInteger(maxAttempts) && maxAttempts >= 0 && runAttempt > maxAttempts) {
    reasons.push('auto repair attempt limit reached');
  }

  if ((policy?.manual_only_failure_classes || []).includes(failureClass)) {
    reasons.push(`failure class ${failureClass} is manual-only`);
  }

  const allowedActions = policy?.auto_actions?.[failureClass] || [];
  if (!allowedActions.includes(action)) {
    reasons.push(`action ${action || 'UNKNOWN'} is not auto-allowed for ${failureClass || 'UNKNOWN'}`);
  }

  if ((policy?.forbidden_actions || []).includes(action)) {
    reasons.push(`action ${action} is explicitly forbidden`);
  }

  if (!evidence.current_head_sha) {
    reasons.push('missing current head sha evidence');
  } else if (evidence.current_head_sha !== expectedHeadSha) {
    reasons.push('head sha changed since repair request');
  }

  if (!evidence.run_head_sha) {
    reasons.push('missing workflow run head sha evidence');
  } else if (evidence.run_head_sha !== expectedHeadSha) {
    reasons.push('workflow run head sha does not match repair head');
  }
  if (!Number.isInteger(Number(evidence.run_pr_number))) {
    reasons.push('missing workflow run pull request binding');
  } else if (Number(evidence.run_pr_number) !== Number(request?.pr_number)) {
    reasons.push('workflow run is not bound to requested pull request');
  }
  if (evidence.run_event !== 'pull_request') {
    reasons.push('workflow run event is not pull_request');
  }
  if (evidence.run_status !== 'completed') {
    reasons.push('workflow run is not completed');
  }
  if (evidence.run_conclusion !== 'failure') {
    reasons.push('workflow run is not failed');
  }

  if (
    containsProtectedSurface(
      [
        ...(request?.affected_paths || []),
        ...(evidence.files || []),
        evidence.pr_title || '',
        evidence.pr_body || '',
        evidence.head_ref || '',
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
