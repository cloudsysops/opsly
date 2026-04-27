#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const requiredPaths = [
  'apps/mcp',
  'apps/orchestrator',
  'tools/cli',
  'tools/workspaces',
  'tools/agents',
  'runtime',
  'runtime/logs',
  'runtime/tenants',
  'runtime/letsencrypt',
  'docs',
];

const missing = requiredPaths.filter((relativePath) => {
  const absolutePath = path.join(root, relativePath);
  return !fs.existsSync(absolutePath);
});

if (missing.length > 0) {
  console.error('Missing required structure paths:');
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

const forbiddenRootDirs = ['logs', 'tenants', 'letsencrypt', 'agents', 'workspaces', 'cli'];
const forbiddenPresent = forbiddenRootDirs.filter((relativePath) =>
  fs.existsSync(path.join(root, relativePath)),
);

if (forbiddenPresent.length > 0) {
  console.error('Forbidden root directories found:');
  for (const item of forbiddenPresent) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log('Structure validation passed.');
