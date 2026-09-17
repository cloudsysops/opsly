#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const cfg = JSON.parse(await fs.readFile(path.join(root, 'config/games/clone-lab-upstream-builds.json'), 'utf8'));
const errors = [];
const seen = new Set();

if (cfg.repository !== 'godotengine/godot-demo-projects') errors.push('repository-not-allowlisted');
if (!/^[0-9a-f]{40}$/.test(cfg.commit ?? '')) errors.push('commit-not-pinned');
if (cfg.repositoryLicense !== 'MIT') errors.push('repository-license-not-mit');

for (const game of cfg.games ?? []) {
  if (!game.id || seen.has(game.id)) errors.push(`duplicate-or-missing-id:${game.id ?? 'unknown'}`);
  seen.add(game.id);
  if (!/^2d\/[a-z0-9_]+$/.test(game.path ?? '')) errors.push(`${game.id}:path-not-2d-allowlisted`);
  if (game.renderer !== 'Compatibility') errors.push(`${game.id}:renderer-not-web-safe`);
  if (!game.assetGate) errors.push(`${game.id}:missing-asset-gate`);
}

if (errors.length) {
  console.error('CLONE_LAB_UPSTREAM_VALIDATION=FAIL');
  errors.forEach(error => console.error(error));
  process.exit(1);
}
console.log(`CLONE_LAB_UPSTREAM_VALIDATION=PASS games=${seen.size}`);
