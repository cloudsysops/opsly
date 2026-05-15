import type {
  FileChange,
  MergeRiskReport,
  RepoGovernanceConfig,
  RepoIntelligenceSnapshot,
} from './types.js';
import { evaluateChangeBudget } from './change-budget.js';
import { matchProtectedPaths } from './protected-paths.js';
import { validateArchitecture } from './architecture-validation.js';
import { touchedServicesFromPaths } from './ownership.js';
import { buildApprovalGates } from './approval-gates.js';

function riskScore(params: {
  redCount: number;
  amberCount: number;
  archErrors: number;
  budgetViolations: number;
  linesChanged: number;
}): number {
  let score = 0;
  score += params.redCount * 25;
  score += params.amberCount * 10;
  score += params.archErrors * 30;
  score += params.budgetViolations * 20;
  if (params.linesChanged > 400) {
    score += 15;
  }
  if (params.linesChanged > 800) {
    score += 25;
  }
  return Math.min(100, score);
}

function riskLevel(score: number): MergeRiskReport['risk_level'] {
  if (score >= 70) {
    return 'critical';
  }
  if (score >= 45) {
    return 'high';
  }
  if (score >= 20) {
    return 'medium';
  }
  return 'low';
}

function defaultRollback(changes: FileChange[]): string {
  const hasDelete = changes.some((c) => c.status === 'deleted');
  if (hasDelete) {
    return 'Revert merge commit or restore deleted files from main; verify Supabase migrations were NOT applied to prod.';
  }
  return 'git revert <merge-commit-sha> or close PR without merge; redeploy previous GHCR image tags on VPS if runtime changed.';
}

export function analyzeMergeRisk(
  changes: FileChange[],
  config: RepoGovernanceConfig,
  intelligence: RepoIntelligenceSnapshot,
): MergeRiskReport {
  const paths = changes.map((c) => c.path);
  const pathHits = matchProtectedPaths(paths, config);
  const architectureViolations = validateArchitecture(changes, config, intelligence);
  const changeBudget = evaluateChangeBudget(changes, config.change_budget);
  const touchedServices = touchedServicesFromPaths(paths, config);

  const archErrors = architectureViolations.filter((v) => v.severity === 'error').length;
  const score = riskScore({
    redCount: pathHits.filter((h) => h.zone === 'red').length,
    amberCount: pathHits.filter((h) => h.zone === 'amber').length,
    archErrors,
    budgetViolations: changeBudget.violations.length,
    linesChanged: changeBudget.lines_changed,
  });
  const level = riskLevel(score);

  const partial: Pick<
    MergeRiskReport,
    'risk_level' | 'architecture_violations' | 'change_budget'
  > = {
    risk_level: level,
    architecture_violations: architectureViolations,
    change_budget: changeBudget,
  };

  const approvalGates = buildApprovalGates(config, pathHits, partial, paths);

  const summaryParts = [
    `Risk ${level} (score ${score}/100)`,
    `${changes.length} files`,
    `${changeBudget.lines_changed} lines`,
    `services: ${touchedServices.join(', ') || 'none'}`,
  ];
  if (pathHits.length > 0) {
    summaryParts.push(`${pathHits.length} protected path hit(s)`);
  }

  return {
    risk_level: level,
    score,
    path_hits: pathHits,
    architecture_violations: architectureViolations,
    change_budget: changeBudget,
    approval_gates: approvalGates,
    touched_services: touchedServices,
    summary: summaryParts.join(' · '),
    rollback_path: defaultRollback(changes),
  };
}
