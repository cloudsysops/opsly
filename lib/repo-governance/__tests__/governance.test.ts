import { describe, expect, it } from 'vitest';

import {
  analyzeMergeRisk,
  evaluateChangeBudget,
  matchProtectedPaths,
  mergeFileChanges,
  parseNameStatus,
  parseNumstat,
  validateArchitecture,
} from '../src/index.js';
import type { FileChange, RepoGovernanceConfig, RepoIntelligenceSnapshot } from '../src/types.js';

const minimalConfig: RepoGovernanceConfig = {
  version: 1,
  principle: 'extend only',
  canon_services: [
    { id: 'api', path: 'apps/api', owner: 'backend', purpose: 'API' },
    { id: 'orchestrator', path: 'apps/orchestrator', owner: 'platform', purpose: 'Queue' },
  ],
  architecture_docs: ['AGENTS.md'],
  forbidden_new_top_level: ['agents'],
  forbidden_duplicate_service_patterns: [
    { pattern: '**/orchestrator-*/**', reason: 'duplicate orchestrator' },
  ],
  protected_paths: {
    red: [{ glob: 'supabase/migrations/**', zone: 'red', reason: 'migrations' }],
    amber: [{ glob: 'apps/api/**', zone: 'amber', reason: 'api' }],
  },
  change_budget: {
    max_files_changed: 3,
    max_lines_changed: 100,
    max_new_files: 2,
    max_deleted_files: 1,
    max_apps_touched: 2,
  },
  human_approval_required_for: ['merge_to_main', 'schema_migration', 'exceed_change_budget'],
  allowed_root_markdown: ['AGENTS.md'],
  allowed_top_level_dirs: ['apps'],
};

const minimalIntelligence: RepoIntelligenceSnapshot = {
  repo_root: '/repo',
  scanned_at: new Date().toISOString(),
  top_level_dirs: ['apps'],
  apps: ['api', 'orchestrator', 'llm-gateway'],
  api_route_count: 10,
  lib_packages: [],
  architecture_docs_present: ['AGENTS.md'],
  architecture_docs_missing: [],
  canon_services: minimalConfig.canon_services,
};

describe('protected paths', () => {
  it('matches red migration glob', () => {
    const hits = matchProtectedPaths(['supabase/migrations/0015_x.sql'], minimalConfig);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.zone).toBe('red');
  });
});

describe('change budget', () => {
  it('flags when files exceed limit', () => {
    const changes: FileChange[] = [
      { path: 'a.ts', status: 'modified', additions: 10, deletions: 0 },
      { path: 'b.ts', status: 'modified', additions: 10, deletions: 0 },
      { path: 'c.ts', status: 'modified', additions: 10, deletions: 0 },
      { path: 'd.ts', status: 'modified', additions: 10, deletions: 0 },
    ];
    const report = evaluateChangeBudget(changes, minimalConfig.change_budget);
    expect(report.within_budget).toBe(false);
    expect(report.violations.length).toBeGreaterThan(0);
  });
});

describe('architecture validation', () => {
  it('rejects forbidden top-level dir', () => {
    const changes: FileChange[] = [
      { path: 'agents/new-bot/index.ts', status: 'added', additions: 1, deletions: 0 },
    ];
    const violations = validateArchitecture(changes, minimalConfig, minimalIntelligence);
    expect(violations.some((v) => v.code === 'FORBIDDEN_TOP_LEVEL')).toBe(true);
  });
});

describe('merge risk', () => {
  it('requires human approval for migration touch', () => {
    const changes: FileChange[] = [
      {
        path: 'supabase/migrations/0099_test.sql',
        status: 'added',
        additions: 5,
        deletions: 0,
      },
    ];
    const report = analyzeMergeRisk(changes, minimalConfig, minimalIntelligence);
    expect(report.path_hits.some((h) => h.zone === 'red')).toBe(true);
    expect(report.approval_gates.some((g) => g.gate === 'protected_red_zone')).toBe(true);
    expect(report.approval_gates.some((g) => g.gate === 'policy:schema_migration')).toBe(true);
  });
});

describe('git diff parsers', () => {
  it('merges numstat and name-status', () => {
    const numstat = parseNumstat('10\t2\tapps/api/lib/foo.ts\n');
    const names = parseNameStatus('M\tapps/api/lib/foo.ts\n');
    const merged = mergeFileChanges(numstat, names);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.additions).toBe(10);
    expect(merged[0]?.status).toBe('modified');
  });
});
