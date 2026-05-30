import { existsSync } from 'node:fs';
import path from 'node:path';

/** Resolve monorepo root (config/platform-foundation.json marker). */
export function getRepoRoot(): string {
  const override = process.env.OPSLY_REPO_ROOT?.trim();
  if (override) {
    return override;
  }
  let current = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(current, 'config', 'platform-foundation.json'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return process.cwd();
}

export function resolveRepoPath(...segments: string[]): string {
  return path.join(getRepoRoot(), ...segments);
}
