/**
 * Audit engine — audit lifecycle, finding severity aggregation, composite score
 * and corrective-action status transitions. Pure logic only.
 */

import type {
  AuditFinding,
  AuditStatus,
  CorrectiveAction,
  CorrectiveActionStatus,
  FindingSeverity,
} from './types.js';

export const AUDIT_STATUS_FLOW: Record<AuditStatus, readonly AuditStatus[]> = {
  scheduled: ['in_progress', 'cancelled', 'overdue'],
  in_progress: ['completed', 'cancelled', 'overdue'],
  completed: [],
  cancelled: [],
  overdue: ['in_progress', 'completed'],
};

export function canTransitionAudit(from: AuditStatus, to: AuditStatus): boolean {
  if (from === to) return true;
  return AUDIT_STATUS_FLOW[from]?.includes(to) ?? false;
}

export const CORRECTIVE_ACTION_STATUS_FLOW: Record<
  CorrectiveActionStatus,
  readonly CorrectiveActionStatus[]
> = {
  open: ['in_progress', 'resolved', 'verified'],
  in_progress: ['resolved', 'verified', 'open'],
  resolved: ['verified', 'open'],
  verified: [],
  overdue: ['in_progress', 'resolved', 'verified'],
};

export function canTransitionCorrectiveAction(
  from: CorrectiveActionStatus,
  to: CorrectiveActionStatus
): boolean {
  if (from === to) return true;
  return CORRECTIVE_ACTION_STATUS_FLOW[from]?.includes(to) ?? false;
}

/**
 * Derived corrective-action status: `open`/`in_progress` items whose due date
 * has passed are reported as `overdue` (the stored status is not mutated here).
 */
export function effectiveCorrectiveActionStatus(input: {
  status: CorrectiveActionStatus;
  dueDate: string;
  now: string;
}): CorrectiveActionStatus {
  const { status, dueDate, now } = input;
  if (
    (status === 'open' || status === 'in_progress') &&
    new Date(now).getTime() > new Date(dueDate).getTime()
  ) {
    return 'overdue';
  }
  return status;
}

/**
 * Derived audit status: a scheduled/in-progress audit that passed its scheduled
 * date (plus a configurable grace period, default 1 day) is reported as overdue.
 */
export function effectiveAuditStatus(input: {
  status: AuditStatus;
  scheduledAt?: string | null;
  now: string;
  graceDays?: number;
}): AuditStatus {
  const { status, scheduledAt, now } = input;
  if (status === 'scheduled' || status === 'in_progress') {
    if (!scheduledAt) return status;
    const grace = (input.graceDays ?? 1) * 86_400_000;
    if (new Date(now).getTime() > new Date(scheduledAt).getTime() + grace) {
      return 'overdue';
    }
  }
  return status;
}

export type AuditScore = {
  score: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  infoCount: number;
  total: number;
};

const SEVERITY_WEIGHTS: Record<FindingSeverity, number> = {
  critical: 0,
  major: 0.5,
  minor: 0.8,
  info: 1,
};

/**
 * Composite 0..100 score from findings. Critical findings zero the score
 * regardless of count. Pure and deterministic — no template weights here.
 */
export function scoreFromFindings(findings: readonly Pick<AuditFinding, 'severity'>[]): AuditScore {
  const counts = { criticalCount: 0, majorCount: 0, minorCount: 0, infoCount: 0 };
  for (const f of findings) {
    if (f.severity === 'critical') counts.criticalCount += 1;
    else if (f.severity === 'major') counts.majorCount += 1;
    else if (f.severity === 'minor') counts.minorCount += 1;
    else counts.infoCount += 1;
  }
  const total = findings.length;
  const base =
    total === 0
      ? 1
      : counts.criticalCount > 0
        ? 0
        : findings.reduce((acc, f) => acc + SEVERITY_WEIGHTS[f.severity], 0) / total;
  return { score: Math.round(base * 1000) / 10, ...counts, total };
}

/** Convenience to build the stored `status` for a corrective action. */
export function correctiveActionOperationalStatus(
  action: CorrectiveAction,
  now: string
): CorrectiveActionStatus {
  return effectiveCorrectiveActionStatus({ status: action.status, dueDate: action.dueDate, now });
}

/** Counts of corrective actions grouped by derived status. */
export function correctiveActionCounts(
  actions: readonly CorrectiveAction[],
  now: string
): Record<CorrectiveActionStatus, number> {
  const counts: Record<CorrectiveActionStatus, number> = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    verified: 0,
    overdue: 0,
  };
  for (const a of actions) {
    const status = correctiveActionOperationalStatus(a, now);
    counts[status] += 1;
  }
  return counts;
}
