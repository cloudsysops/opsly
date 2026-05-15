import type { FileChange, PreMergeReport } from './types.js';
import { buildRepoIntelligence } from './intelligence.js';
import { loadRepoGovernanceConfig } from './policy.js';
import { analyzeMergeRisk } from './merge-risk.js';
import { humanApprovalRequired } from './approval-gates.js';
import { generateContextPack } from './context-pack.js';
import { findRepoRoot } from './paths.js';

function changeSummary(changes: FileChange[]): string {
  const added = changes.filter((c) => c.status === 'added').length;
  const modified = changes.filter((c) => c.status === 'modified').length;
  const deleted = changes.filter((c) => c.status === 'deleted').length;
  return `${changes.length} files (${added} added, ${modified} modified, ${deleted} deleted)`;
}

function impactNarrative(
  mergeRisk: ReturnType<typeof analyzeMergeRisk>,
  changes: FileChange[],
): string {
  const parts: string[] = [];
  if (mergeRisk.touched_services.length > 0) {
    parts.push(`Touches canon services: ${mergeRisk.touched_services.join(', ')}.`);
  }
  if (mergeRisk.path_hits.some((h) => h.zone === 'red')) {
    parts.push('Includes production-critical paths (migrations, deploy, secrets config).');
  }
  if (mergeRisk.change_budget.apps_touched.length > 0) {
    parts.push(`Apps: ${mergeRisk.change_budget.apps_touched.join(', ')}.`);
  }
  if (changes.length === 0) {
    parts.push('No file changes detected.');
  }
  return parts.join(' ') || 'Incremental change within normal bounds.';
}

function listRisks(mergeRisk: ReturnType<typeof analyzeMergeRisk>): string[] {
  const risks: string[] = [];
  for (const v of mergeRisk.architecture_violations.filter((x) => x.severity === 'error')) {
    risks.push(v.message);
  }
  for (const v of mergeRisk.change_budget.violations) {
    risks.push(`Budget: ${v}`);
  }
  for (const h of mergeRisk.path_hits.filter((x) => x.zone === 'red')) {
    risks.push(`Red zone: ${h.path} (${h.reason})`);
  }
  if (risks.length === 0 && mergeRisk.risk_level !== 'low') {
    risks.push(`Elevated merge risk (${mergeRisk.risk_level}) — review recommended.`);
  }
  if (risks.length === 0) {
    risks.push('No critical risks flagged by automated governance scan.');
  }
  return risks;
}

export async function buildPreMergeReport(
  changes: FileChange[],
  options?: { task_title?: string },
  root?: string,
): Promise<PreMergeReport> {
  const repoRoot = root ?? findRepoRoot();
  const config = await loadRepoGovernanceConfig(repoRoot);
  const intelligence = await buildRepoIntelligence(repoRoot);
  const mergeRisk = analyzeMergeRisk(changes, config, intelligence);
  const gates = mergeRisk.approval_gates;
  const paths = changes.map((c) => c.path);

  const contextPack = await generateContextPack(
    {
      task_title: options?.task_title,
      include_diff_paths: paths,
    },
    repoRoot,
  );

  return {
    generated_at: new Date().toISOString(),
    principle: config.principle,
    change_summary: changeSummary(changes),
    impact: impactNarrative(mergeRisk, changes),
    touched_services: mergeRisk.touched_services,
    risks: listRisks(mergeRisk),
    rollback_path: mergeRisk.rollback_path,
    merge_risk: mergeRisk,
    context_pack_markdown: contextPack,
    human_approval_required: humanApprovalRequired(gates),
    approval_gates: gates,
  };
}

export function formatPreMergeReportMarkdown(report: PreMergeReport): string {
  const lines: string[] = [
    '# Pre-merge governance report',
    '',
    `**Generated:** ${report.generated_at}`,
    `**Principle:** ${report.principle}`,
    '',
    '## Change summary',
    report.change_summary,
    '',
    '## Impact',
    report.impact,
    '',
    '## Touched services',
    report.touched_services.length > 0
      ? report.touched_services.map((s) => `- ${s}`).join('\n')
      : '_None detected_',
    '',
    '## Merge risk',
    `- Level: **${report.merge_risk.risk_level}** (score ${report.merge_risk.score}/100)`,
    `- ${report.merge_risk.summary}`,
    '',
    '## Risks',
    ...report.risks.map((r) => `- ${r}`),
    '',
    '## Rollback path',
    report.rollback_path,
    '',
    '## Human approval',
    report.human_approval_required
      ? '**REQUIRED** — do not merge without explicit human approval.'
      : 'Not required by automated gates (human remains final approver).',
    '',
  ];

  if (report.approval_gates.length > 0) {
    lines.push('## Approval gates', '');
    for (const g of report.approval_gates) {
      lines.push(`- [${g.required ? 'x' : ' '}] **${g.gate}**: ${g.reason}`);
    }
    lines.push('');
  }

  if (report.merge_risk.path_hits.length > 0) {
    lines.push('## Protected path hits', '');
    for (const h of report.merge_risk.path_hits) {
      lines.push(`- \`${h.path}\` (${h.zone}): ${h.reason}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
