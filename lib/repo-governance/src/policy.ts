import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { RepoGovernanceConfig } from './types.js';
import { findRepoRoot } from './paths.js';

let cache: RepoGovernanceConfig | null = null;

export async function loadRepoGovernanceConfig(root?: string): Promise<RepoGovernanceConfig> {
  if (cache && !root) {
    return cache;
  }
  const repoRoot = root ?? findRepoRoot();
  const raw = await readFile(join(repoRoot, 'config', 'repo-governance.json'), 'utf8');
  const parsed = JSON.parse(raw) as RepoGovernanceConfig;
  if (!root) {
    cache = parsed;
  }
  return parsed;
}

export function allProtectedRules(
  config: RepoGovernanceConfig,
): Array<{ glob: string; zone: 'amber' | 'red'; reason: string }> {
  return [
    ...config.protected_paths.red.map((r) => ({ glob: r.glob, zone: 'red' as const, reason: r.reason })),
    ...config.protected_paths.amber.map((r) => ({
      glob: r.glob,
      zone: 'amber' as const,
      reason: r.reason,
    })),
  ];
}
