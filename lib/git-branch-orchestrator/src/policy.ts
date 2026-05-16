import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

import { GitBranchPolicySchema, type GitBranchPolicy } from './types.js';

const RELATIVE = join('config', 'git-branch-policy.json');

let cached: GitBranchPolicy | null = null;

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'config', 'git-branch-policy.json'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

export function resolvePolicyPath(root?: string): string {
  if (process.env.OPSLY_GIT_BRANCH_POLICY_PATH?.trim()) {
    return process.env.OPSLY_GIT_BRANCH_POLICY_PATH.trim();
  }
  const base = root?.trim() || process.env.OPSLY_ROOT?.trim() || findRepoRoot(process.cwd());
  return join(base, RELATIVE);
}

export async function loadGitBranchPolicy(root?: string): Promise<GitBranchPolicy> {
  if (cached && !root) {
    return cached;
  }
  const path = resolvePolicyPath(root);
  const raw = await readFile(path, 'utf8');
  const policy = GitBranchPolicySchema.parse(JSON.parse(raw));
  if (!root) {
    cached = policy;
  }
  return policy;
}

export function clearGitBranchPolicyCache(): void {
  cached = null;
}
