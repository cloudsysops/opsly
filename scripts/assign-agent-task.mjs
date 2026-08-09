#!/usr/bin/env node
/**
 * Thin launcher — logic lives in @intcloudsysops/agent-task-core + scripts/assign-agent-task.ts
 * Prefer local tsx binary (npx may hit wrong package.json scripts in this monorepo).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const script = resolve(repoRoot, 'scripts/assign-agent-task.ts');
const localTsx = resolve(repoRoot, 'node_modules/.bin/tsx');
const tsxBin = existsSync(localTsx) ? localTsx : 'tsx';
const result = spawnSync(tsxBin, [script, ...process.argv.slice(2)], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
});
process.exitCode = result.status === null ? 1 : result.status;
