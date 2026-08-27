import type {
  Audit,
  AuditFinding,
  AuditTemplate,
  CorrectiveAction,
  CorrectiveActionStatus,
} from './types.js';

export function scoreAudit(template: AuditTemplate, answers: ReadonlyMap<string, number>): number {
  let earned = 0;
  let total = 0;
  for (const question of template.questions) {
    total += question.weight;
    earned += (answers.get(question.id) ?? 0) * question.weight;
  }
  if (total === 0) return 0;
  return Math.round((earned / total) * 100);
}

export function hasCriticalFailure(
  template: AuditTemplate,
  answers: ReadonlyMap<string, number>
): boolean {
  return template.questions.some((q) => q.criticalFailure && (answers.get(q.id) ?? 0) < 1);
}

export function deriveCorrectiveActionStatus(
  action: Pick<CorrectiveAction, 'status' | 'dueDate'>,
  todayIso: string
): CorrectiveActionStatus {
  if (action.status === 'resolved' || action.status === 'verified') {
    return action.status;
  }
  if (action.dueDate < todayIso.slice(0, 10)) {
    return 'overdue';
  }
  return action.status;
}

export function auditIsComplete(audit: Pick<Audit, 'status' | 'performedAt' | 'score'>): boolean {
  return audit.status === 'completed' && audit.performedAt != null && audit.score != null;
}

export function findingsForUnit(findings: readonly AuditFinding[], unitId: string): AuditFinding[] {
  return findings.filter((f) => f.unitId === unitId);
}
