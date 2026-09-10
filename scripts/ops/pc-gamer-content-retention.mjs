#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_MIN_FREE_GB = 150;

export function parseArgs(argv) {
  return {
    apply: argv.includes('--apply'),
    root: valueAfter(argv, '--root') ?? path.join(process.cwd(), 'runtime', 'content-os'),
    retentionDays: Number(valueAfter(argv, '--retention-days') ?? DEFAULT_RETENTION_DAYS),
    minFreeGb: Number(valueAfter(argv, '--min-free-gb') ?? DEFAULT_MIN_FREE_GB),
  };
}

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

export function isProtectedProjectStatus(status) {
  return new Set([
    'idea',
    'assets',
    'script',
    'edit',
    'storyboard',
    'qa',
    'rights_review',
    'human_review',
    'ready_for_review',
    'approved',
  ]).has(status);
}

export function listCleanupCandidates(root, now = Date.now(), retentionDays = DEFAULT_RETENTION_DAYS) {
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
  const candidates = [];
  const tenantsRoot = path.join(root, 'tenants');
  if (!fs.existsSync(tenantsRoot)) return candidates;

  for (const tenant of fs.readdirSync(tenantsRoot, { withFileTypes: true })) {
    if (!tenant.isDirectory()) continue;
    const projectsRoot = path.join(tenantsRoot, tenant.name, 'projects');
    if (!fs.existsSync(projectsRoot)) continue;
    for (const project of fs.readdirSync(projectsRoot, { withFileTypes: true })) {
      if (!project.isDirectory()) continue;
      const projectFile = path.join(projectsRoot, project.name, 'project.json');
      if (!fs.existsSync(projectFile)) continue;
      let envelope;
      try {
        envelope = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
      } catch {
        continue;
      }
      const status = envelope?.project?.status;
      const updatedAt = Date.parse(envelope?.project?.updatedAt ?? '');
      if (!status || isProtectedProjectStatus(status) || status !== 'archived' || !Number.isFinite(updatedAt) || updatedAt > cutoff) {
        continue;
      }
      const artifactDir = path.join(root, 'artifacts', project.name);
      if (fs.existsSync(artifactDir)) {
        candidates.push({ path: artifactDir, reason: `archived project older than ${retentionDays} days` });
      }
    }
  }
  return candidates;
}

export function freeGb(mountPoint) {
  const output = execFileSync('df', ['-Pk', mountPoint], { encoding: 'utf8' }).trim().split('\n').at(-1);
  const availableKb = Number(output?.trim().split(/\s+/)[3]);
  return Number.isFinite(availableKb) ? availableKb / 1024 / 1024 : 0;
}

export function runRetention(options = {}) {
  const root = path.resolve(options.root ?? path.join(process.cwd(), 'runtime', 'content-os'));
  const candidates = listCleanupCandidates(root, options.now ?? Date.now(), options.retentionDays ?? DEFAULT_RETENTION_DAYS);
  const result = { mode: options.apply ? 'apply' : 'dry-run', candidates: candidates.map((item) => item.path), removed: [] };
  if (options.apply) {
    for (const candidate of candidates) {
      fs.rmSync(candidate.path, { recursive: true, force: false });
      result.removed.push(candidate.path);
    }
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs(process.argv.slice(2));
  const windowsFreeGb = freeGb('/mnt/c');
  if (windowsFreeGb >= options.minFreeGb) {
    console.log(JSON.stringify({ status: 'healthy', windowsFreeGb, minFreeGb: options.minFreeGb, removed: [] }));
    process.exit(0);
  }
  const result = runRetention(options);
  console.log(JSON.stringify({ status: result.removed.length ? 'cleaned' : 'nothing_to_clean', windowsFreeGb, ...result }));
}
