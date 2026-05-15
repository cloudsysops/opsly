import type { ContextPackInput, RepoGovernanceConfig, RepoIntelligenceSnapshot } from './types.js';
import { buildRepoIntelligence } from './intelligence.js';
import { loadRepoGovernanceConfig } from './policy.js';
import { findRepoRoot } from './paths.js';

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}\n`;
}

export async function generateContextPack(
  input: ContextPackInput = {},
  root?: string,
): Promise<string> {
  const repoRoot = root ?? findRepoRoot();
  const config = await loadRepoGovernanceConfig(repoRoot);
  const intelligence = await buildRepoIntelligence(repoRoot);

  const lines: string[] = [
    '# Opsly Repo Governance — Context Pack',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Repo: ${repoRoot}`,
    '',
    section(
      'Principle',
      config.principle +
        '\n\nWorkers MUST extend existing code, reuse services, patch incrementally. Human is final approver.',
    ),
    section(
      'Task',
      [
        input.task_title ? `Title: ${input.task_title}` : null,
        input.task_slug ? `Slug: ${input.task_slug}` : null,
        input.worker_role ? `Role: ${input.worker_role}` : null,
      ]
        .filter(Boolean)
        .join('\n') || 'Unspecified — define scope before coding.',
    ),
    section(
      'Canon services (do not duplicate)',
      config.canon_services
        .map((s) => `- **${s.id}** → \`${s.path}\` (${s.owner}): ${s.purpose}`)
        .join('\n'),
    ),
    section(
      'Repo snapshot',
      [
        `Apps (${intelligence.apps.length}): ${intelligence.apps.join(', ')}`,
        `API routes (approx): ${intelligence.api_route_count}`,
        `Lib packages: ${intelligence.lib_packages.join(', ') || 'none'}`,
        `Architecture docs OK: ${intelligence.architecture_docs_present.length}`,
        intelligence.architecture_docs_missing.length > 0
          ? `Missing docs: ${intelligence.architecture_docs_missing.join(', ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    section(
      'Architecture docs to read first',
      config.architecture_docs.map((d) => `- \`${d}\``).join('\n'),
    ),
    section(
      'Protected zones',
      [
        '**Red** (human approval, no autonomous apply):',
        ...config.protected_paths.red.map((r) => `- \`${r.glob}\` — ${r.reason}`),
        '',
        '**Amber** (PR + review):',
        ...config.protected_paths.amber.slice(0, 8).map((r) => `- \`${r.glob}\` — ${r.reason}`),
        config.protected_paths.amber.length > 8
          ? `- … and ${config.protected_paths.amber.length - 8} more (see config/repo-governance.json)`
          : '',
      ].join('\n'),
    ),
    section(
      'Change budget (per PR)',
      [
        `Max files: ${config.change_budget.max_files_changed}`,
        `Max lines: ${config.change_budget.max_lines_changed}`,
        `Max new files: ${config.change_budget.max_new_files}`,
        `Max apps touched: ${config.change_budget.max_apps_touched}`,
      ].join('\n'),
    ),
    section(
      'Forbidden',
      [
        `New top-level dirs: ${config.forbidden_new_top_level.join(', ')}`,
        'No second orchestrator, gateway, MCP control plane, or parallel auth/billing.',
        'No new repos — work in this monorepo only.',
      ].join('\n'),
    ),
  ];

  if (input.include_diff_paths && input.include_diff_paths.length > 0) {
    lines.push(
      section(
        'Paths in current diff',
        input.include_diff_paths.map((p) => `- \`${p}\``).join('\n'),
      ),
    );
  }

  lines.push(
    section(
      'Pre-implementation checklist',
      [
        '1. Scan repo structure and canon services',
        '2. Confirm task touches minimal apps',
        '3. Reuse lib/ and existing API patterns',
        '4. Run `npm run repo:governance -- validate-diff` before PR',
        '5. Request human approval if red/amber or budget exceeded',
      ].join('\n'),
    ),
  );

  return lines.join('\n');
}

export async function buildContextPackForWorker(
  input: ContextPackInput,
): Promise<{ markdown: string; intelligence: RepoIntelligenceSnapshot; config: RepoGovernanceConfig }> {
  const repoRoot = findRepoRoot();
  const config = await loadRepoGovernanceConfig(repoRoot);
  const intelligence = await buildRepoIntelligence(repoRoot);
  const markdown = await generateContextPack(input, repoRoot);
  return { markdown, intelligence, config };
}
