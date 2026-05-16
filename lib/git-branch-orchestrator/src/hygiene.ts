import type { BranchRegistryEntry } from './types.js';
import { listBranchEntries } from './registry.js';
import { loadGitBranchPolicy } from './policy.js';

export interface BranchHygieneIssue {
  code: 'duplicate_task' | 'stale_branch' | 'pr_to_main' | 'orphan_planned' | 'conflict_risk';
  severity: 'info' | 'warning' | 'error';
  branch_name: string;
  entry_id: string;
  message: string;
}

export interface BranchHygieneReport {
  tenant_slug: string;
  initiative_filter: string | null;
  scanned: number;
  issues: BranchHygieneIssue[];
  recommendations: string[];
  generated_at: string;
}

const STALE_DAYS = 7;

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

export async function buildBranchHygieneReport(input: {
  tenant_slug: string;
  initiative?: string;
  root?: string;
}): Promise<BranchHygieneReport> {
  const policy = await loadGitBranchPolicy(input.root);
  const entries = await listBranchEntries(input.tenant_slug, input.root);
  const initiativeFilter = input.initiative?.trim().toLowerCase() ?? null;

  const scoped = initiativeFilter
    ? entries.filter((e) => e.initiative === initiativeFilter)
    : entries;

  const issues: BranchHygieneIssue[] = [];
  const recommendations: string[] = [];

  const byTaskWorker = new Map<string, BranchRegistryEntry[]>();
  for (const entry of scoped) {
    const key = `${entry.initiative}::${entry.task_slug}::${entry.worker_id}`;
    const list = byTaskWorker.get(key) ?? [];
    list.push(entry);
    byTaskWorker.set(key, list);
  }

  for (const [, group] of byTaskWorker) {
    const active = group.filter(
      (e) => e.status !== 'closed' && e.status !== 'merged_main',
    );
    if (active.length > 1) {
      for (const e of active) {
        issues.push({
          code: 'duplicate_task',
          severity: 'warning',
          branch_name: e.branch_name,
          entry_id: e.id,
          message: `Duplicate active branch for task ${e.task_slug} + worker ${e.worker_id}`,
        });
      }
      recommendations.push(
        `Close or merge duplicate branches for task ${active[0]?.task_slug}; keep one agent/${active[0]?.worker_branch_slug}/…`,
      );
    }
  }

  for (const entry of scoped) {
    if (
      policy.protected_targets.includes(entry.target_branch) &&
      entry.status !== 'merged_main'
    ) {
      issues.push({
        code: 'pr_to_main',
        severity: 'error',
        branch_name: entry.branch_name,
        entry_id: entry.id,
        message: `PR target is protected branch "${entry.target_branch}" — use integration/* first`,
      });
    }

    if (
      (entry.status === 'active' || entry.status === 'pr_open') &&
      daysSince(entry.updated_at) > STALE_DAYS
    ) {
      issues.push({
        code: 'stale_branch',
        severity: 'warning',
        branch_name: entry.branch_name,
        entry_id: entry.id,
        message: `No updates for ${Math.floor(daysSince(entry.updated_at))} days`,
      });
    }

    if (entry.status === 'planned' && daysSince(entry.created_at) > 3) {
      issues.push({
        code: 'orphan_planned',
        severity: 'info',
        branch_name: entry.branch_name,
        entry_id: entry.id,
        message: 'Still planned — assign worker or materialize git',
      });
    }
  }

  if (issues.some((i) => i.code === 'pr_to_main')) {
    recommendations.push(
      'Never open agent PRs directly to main; target integration/{initiative} per policy.',
    );
  }

  return {
    tenant_slug: input.tenant_slug,
    initiative_filter: initiativeFilter,
    scanned: scoped.length,
    issues,
    recommendations,
    generated_at: new Date().toISOString(),
  };
}

export async function buildIntegrationMergeAdvisor(input: {
  tenant_slug: string;
  initiative: string;
  root?: string;
}): Promise<{
  integration_branch: string;
  entries: BranchRegistryEntry[];
  per_branch: Array<{ entry_id: string; merge_advisor: import('./types.js').MergeAdvisorReport }>;
  overall_risk: 'SAFE' | 'MODERATE' | 'HIGH';
  ready_for_human_review: boolean;
  blockers: string[];
}> {
  const { buildMergeAdvisorReport } = await import('./merge-advisor.js');
  const initiativeSlug = input.initiative.trim().toLowerCase().replace(/\s+/g, '-');
  const entries = (await listBranchEntries(input.tenant_slug, input.root)).filter(
    (e) => e.initiative === initiativeSlug,
  );

  const integrationBranch =
    entries[0]?.integration_branch ?? `integration/${initiativeSlug}`;

  const perBranch = [];
  let maxRisk: 'SAFE' | 'MODERATE' | 'HIGH' = 'SAFE';
  const blockers: string[] = [];

  for (const entry of entries) {
    const report = await buildMergeAdvisorReport(entry);
    perBranch.push({ entry_id: entry.id, merge_advisor: report });
    if (report.risk_level === 'HIGH') {
      maxRisk = 'HIGH';
    } else if (report.risk_level === 'MODERATE' && maxRisk !== 'HIGH') {
      maxRisk = 'MODERATE';
    }
    if (report.requires_human_approval) {
      blockers.push(`${entry.branch_name}: ${report.recommended_action}`);
    }
    if (entry.test_status === 'failed') {
      blockers.push(`${entry.branch_name}: tests failed`);
    }
  }

  return {
    integration_branch: integrationBranch,
    entries,
    per_branch: perBranch,
    overall_risk: maxRisk,
    ready_for_human_review:
      entries.length > 0 &&
      entries.every((e) => e.status === 'pr_open' || e.status === 'merged_integration'),
    blockers,
  };
}
