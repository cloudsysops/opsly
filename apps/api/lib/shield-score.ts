import { SHIELD_SCORE_MAX, SHIELD_SECRETS_SCAN_LIST_LIMIT } from './shield-constants';
import { listShieldSecretFindings } from './repositories/shield-repository';

const DEDUCT_CRITICAL = 15;
const DEDUCT_HIGH = 10;
const DEDUCT_MEDIUM = 5;
const DEDUCT_LOW = 2;
const DEDUCT_INFO = 1;
const DEDUCT_DEFAULT = 5;

function deductionForSeverity(severity: string): number {
  switch (severity) {
    case 'critical':
      return DEDUCT_CRITICAL;
    case 'high':
      return DEDUCT_HIGH;
    case 'medium':
      return DEDUCT_MEDIUM;
    case 'low':
      return DEDUCT_LOW;
    case 'info':
      return DEDUCT_INFO;
    default:
      return DEDUCT_DEFAULT;
  }
}

/**
 * Computes 0–100 security score from open secret findings (MVP heuristic).
 */
export async function computeShieldScore(tenantSlug: string): Promise<{
  score: number;
  breakdown: Record<string, unknown>;
}> {
  const open = await listShieldSecretFindings(tenantSlug, {
    status: 'open',
    limit: SHIELD_SECRETS_SCAN_LIST_LIMIT,
  });
  let deduction = 0;
  const bySeverity: Record<string, number> = {};
  for (const f of open) {
    const d = deductionForSeverity(f.severity);
    deduction += d;
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
  }
  const score = Math.max(0, Math.min(SHIELD_SCORE_MAX, SHIELD_SCORE_MAX - deduction));
  return {
    score,
    breakdown: {
      open_findings_count: open.length,
      deductions_total: deduction,
      by_severity: bySeverity,
    },
  };
}
