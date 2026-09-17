#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const file = path.join(root, 'config/games/clone-lab-sources.json');
const config = JSON.parse(await fs.readFile(file, 'utf8'));

const allowed = new Set(config.upstreamAllowlist ?? []);
const seen = new Set();
const errors = [];

for (const source of config.sources ?? []) {
  if (!source.id || seen.has(source.id)) errors.push(`duplicate-or-missing-id:${source.id ?? 'unknown'}`);
  seen.add(source.id);
  if (!allowed.has(source.repo)) errors.push(`${source.id}:repo-not-allowlisted`);
  if (!/^[0-9a-f]{40}$/.test(source.commit ?? '')) errors.push(`${source.id}:commit-not-pinned`);
  if (source.codeLicense !== 'MIT') errors.push(`${source.id}:unsupported-code-license`);
  if (source.graduationPolicy !== 'original-expression-required') errors.push(`${source.id}:graduation-policy`);
  if (!source.assetGate) errors.push(`${source.id}:missing-asset-gate`);
}

if (errors.length) {
  console.error('CLONE_LAB_SOURCE_VALIDATION=FAIL');
  errors.forEach(error => console.error(error));
  process.exit(1);
}

console.log(`CLONE_LAB_SOURCE_VALIDATION=PASS sources=${seen.size}`);
