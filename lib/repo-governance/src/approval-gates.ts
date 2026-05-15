import { minimatch } from 'minimatch';

import type { ApprovalGate, MergeRiskReport, PathHit, RepoGovernanceConfig } from './types.js';

function pathMatchesAny(paths: string[], globs: string[]): boolean {
  return paths.some((p) => globs.some((g) => minimatch(p, g, { dot: true })));
}

const POLICY_TRIGGERS: Record<
  string,
  (paths: string[], mergeRisk: Pick<MergeRiskReport, 'architecture_violations' | 'change_budget'>) => boolean
> = {
  merge_to_main: () => true,
  production_deploy: (paths) =>
    pathMatchesAny(paths, ['.github/workflows/**', 'infra/docker-compose.platform.yml', 'infra/traefik/**']),
  schema_migration: (paths) => pathMatchesAny(paths, ['supabase/migrations/**']),
  auth_change: (paths) =>
    pathMatchesAny(paths, ['apps/api/app/api/auth/**', 'apps/api/lib/**/auth/**', 'apps/api/lib/auth.ts']),
  billing_change: (paths) =>
    pathMatchesAny(paths, ['apps/api/lib/stripe/**', 'apps/web/lib/stripe/**', 'apps/api/app/api/webhooks/stripe/**']),
  new_top_level_directory: (_paths, mergeRisk) =>
    mergeRisk.architecture_violations.some((v) => v.code === 'FORBIDDEN_TOP_LEVEL'),
  duplicate_control_plane: (_paths, mergeRisk) =>
    mergeRisk.architecture_violations.some((v) =>
      ['DUPLICATE_ORCHESTRATOR', 'DUPLICATE_GATEWAY', 'DUPLICATE_SERVICE_PATTERN'].includes(v.code),
    ),
  exceed_change_budget: (_paths, mergeRisk) => !mergeRisk.change_budget.within_budget,
  force_push: () => false,
};

export function buildApprovalGates(
  config: RepoGovernanceConfig,
  pathHits: PathHit[],
  mergeRisk: Pick<MergeRiskReport, 'risk_level' | 'architecture_violations' | 'change_budget'>,
  changedPaths: string[] = pathHits.map((h) => h.path),
): ApprovalGate[] {
  const gates: ApprovalGate[] = [];

  const redHits = pathHits.filter((h) => h.zone === 'red');
  if (redHits.length > 0) {
    gates.push({
      gate: 'protected_red_zone',
      required: true,
      reason: `Touches ${redHits.length} red-zone path(s): ${redHits.map((h) => h.path).slice(0, 5).join(', ')}`,
    });
  }

  const amberHits = pathHits.filter((h) => h.zone === 'amber');
  if (amberHits.length > 0) {
    gates.push({
      gate: 'protected_amber_zone',
      required: true,
      reason: `Touches ${amberHits.length} amber-zone path(s). Human review required.`,
    });
  }

  if (!mergeRisk.change_budget.within_budget) {
    gates.push({
      gate: 'change_budget_exceeded',
      required: true,
      reason: mergeRisk.change_budget.violations.join('; '),
    });
  }

  const errors = mergeRisk.architecture_violations.filter((v) => v.severity === 'error');
  if (errors.length > 0) {
    gates.push({
      gate: 'architecture_violation',
      required: true,
      reason: errors.map((e) => e.message).join('; '),
    });
  }

  for (const trigger of config.human_approval_required_for) {
    const fn = POLICY_TRIGGERS[trigger];
    if (fn?.(changedPaths, mergeRisk)) {
      gates.push({
        gate: `policy:${trigger}`,
        required: true,
        reason: `Policy requires human approval: ${trigger}`,
      });
    }
  }

  if (mergeRisk.risk_level === 'critical' || mergeRisk.risk_level === 'high') {
    gates.push({
      gate: 'merge_risk_high',
      required: true,
      reason: `Merge risk level: ${mergeRisk.risk_level}`,
    });
  }

  return gates;
}

export function humanApprovalRequired(gates: ApprovalGate[]): boolean {
  return gates.some((g) => g.required);
}
