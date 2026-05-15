import { minimatch } from 'minimatch';

import type { PathHit, RepoGovernanceConfig } from './types.js';
import { allProtectedRules } from './policy.js';

export function matchProtectedPaths(
  paths: string[],
  config: RepoGovernanceConfig,
): PathHit[] {
  const rules = allProtectedRules(config);
  const hits: PathHit[] = [];
  const seen = new Set<string>();

  for (const filePath of paths) {
    for (const rule of rules) {
      const key = `${filePath}::${rule.glob}`;
      if (seen.has(key)) {
        continue;
      }
      if (minimatch(filePath, rule.glob, { dot: true })) {
        seen.add(key);
        hits.push({
          path: filePath,
          zone: rule.zone,
          reason: rule.reason,
          glob: rule.glob,
        });
      }
    }
  }
  return hits;
}
