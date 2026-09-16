#!/usr/bin/env node
import fs from 'node:fs/promises';
import { buildPostMergeCleanupPlan } from './lib/software-factory-cleanup-plan.mjs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const cleanupPath = arg('--cleanup', 'pr-reconciliation-cleanup-candidates.json');
const workstreamsPath = arg('--workstreams');
const mergedPath = arg('--merged-work');
const output = arg('--out', 'software-factory-cleanup-plan.json');

const cleanupInventory = JSON.parse(await fs.readFile(cleanupPath, 'utf8'));
const workstreams = workstreamsPath
  ? JSON.parse(await fs.readFile(workstreamsPath, 'utf8'))
  : null;
const mergedWork = mergedPath
  ? JSON.parse(await fs.readFile(mergedPath, 'utf8'))
  : null;

const plan = buildPostMergeCleanupPlan({ cleanupInventory, workstreams, mergedWork });
await fs.writeFile(output, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

console.log(
  JSON.stringify(
    {
      output,
      mode: plan.mode,
      branches: plan.branch_cleanup_candidates.length,
      claim_evidence: plan.evidence.claims.status,
      stale_active_claims:
        plan.evidence.claims.status === 'OBSERVED'
          ? plan.claim_release_candidates.length
          : null,
    },
    null,
    2,
  ),
);
