import { loadGitBranchPolicy } from './policy.js';
import type { BranchRegistryEntry, MergeAdvisorReport } from './types.js';

function mergeRiskFromEntry(entry: BranchRegistryEntry): MergeAdvisorReport['risk_level'] {
  if (entry.risk_level === 'high') {
    return 'HIGH';
  }
  if (entry.risk_level === 'medium') {
    return 'MODERATE';
  }
  return 'SAFE';
}

function recommendedAction(
  entry: BranchRegistryEntry,
  risk: MergeAdvisorReport['risk_level'],
): MergeAdvisorReport['recommended_action'] {
  if (entry.target_branch === 'main' || entry.target_branch === 'master') {
    return 'block_until_human';
  }
  if (risk === 'HIGH') {
    return 'escalate_to_architect';
  }
  if (entry.test_status === 'failed') {
    return 'request_changes';
  }
  if (entry.status === 'stale') {
    return 'close_branch';
  }
  return 'merge_to_integration';
}

export async function buildMergeAdvisorReport(
  entry: BranchRegistryEntry,
): Promise<MergeAdvisorReport> {
  const policy = await loadGitBranchPolicy();
  const risk = mergeRiskFromEntry(entry);
  const files = entry.files_touched ?? [];
  const highRiskHits = files.filter((f) =>
    policy.high_risk_paths.some((p) => f.includes(p)),
  );

  const requiresHuman =
    policy.auto_merge_to_main === false ||
    entry.target_branch === 'main' ||
    highRiskHits.length > 0 ||
    risk === 'HIGH';

  const duplicateWarnings: string[] = [];
  if (highRiskHits.length > 0) {
    duplicateWarnings.push(
      `Touches high-risk paths: ${highRiskHits.slice(0, 5).join(', ')}`,
    );
  }

  const elevatedRisk = highRiskHits.length > 0 ? 'HIGH' : risk;

  return {
    branch_name: entry.branch_name,
    job_id: entry.job_id,
    worker_id: entry.worker_id,
    summary: entry.title ?? `${entry.worker_id} work on ${entry.task_slug}`,
    files_changed: files,
    architecture_impact:
      highRiskHits.length > 0
        ? 'May affect platform control plane, auth, billing, or schema.'
        : 'Localized change; review module boundaries in Mission Control.',
    risk_level: elevatedRisk,
    tests_status: entry.test_status ?? 'unknown',
    duplicate_logic_warnings: duplicateWarnings,
    recommended_action: recommendedAction(entry, elevatedRisk),
    requires_human_approval: requiresHuman,
    pr_target: entry.target_branch,
    generated_at: new Date().toISOString(),
  };
}
