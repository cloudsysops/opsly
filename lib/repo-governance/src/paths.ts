import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

export function findRepoRoot(start: string = process.cwd()): string {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (
      existsSync(join(dir, 'config', 'repo-governance.json')) &&
      existsSync(join(dir, 'AGENTS.md'))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return start;
}
