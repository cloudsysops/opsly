#!/usr/bin/env node

import fs from 'node:fs/promises';

const inventoryPath = process.env.RECONCILIATION_INVENTORY || 'pr-reconciliation-inventory.json';
const outputPath = process.env.RECONCILIATION_WORKPACKS || 'pr-reconciliation-workpacks.json';
const inventory = JSON.parse(await fs.readFile(inventoryPath, 'utf8'));

const actionable = new Set(['BEHIND', 'CONFLICTED', 'CHECK_FAILED', 'REVIEW_BLOCKED']);
const priority = {
  BEHIND: 10,
  CONFLICTED: 20,
  CHECK_FAILED: 30,
  REVIEW_BLOCKED: 40,
};

const workpacks = inventory.pullRequests
  .filter((pr) => pr.draft !== true && actionable.has(pr.lane) && pr.supersededBy.length === 0)
  .map((pr) => ({
    id: `pr-${pr.number}`,
    prNumber: pr.number,
    title: pr.title,
    lane: pr.lane,
    priority: priority[pr.lane],
    head: pr.head,
    expectedHeadSha: pr.headSha,
    base: pr.base,
    lockKey: `pr-reconcile:${pr.number}:${pr.head}`,
    protected: pr.protected === true,
    operation:
      pr.lane === 'CHECK_FAILED'
        ? (pr.protected ? 'DIAGNOSE_ONLY' : 'REPAIR')
        : pr.lane === 'REVIEW_BLOCKED'
          ? (pr.changesRequested ? (pr.protected ? 'DIAGNOSE_ONLY' : 'REPAIR_REVIEW_BLOCKER') : 'REQUEST_INDEPENDENT_REVIEW')
          : pr.protected
            ? 'ESCALATE'
            : pr.lane === 'BEHIND'
              ? 'UPDATE_BRANCH_CANDIDATE'
              : 'CONFLICT_RECONCILIATION',
    writeAllowed:
      pr.protected !== true &&
      (pr.lane === 'CHECK_FAILED' || (pr.lane === 'REVIEW_BLOCKED' && pr.changesRequested === true)),
    changesRequested: pr.changesRequested === true,
    independentReview: pr.independentReview ?? { state: 'missing', needsRun: true },
    behindBy: pr.behindBy,
    aheadBy: pr.aheadBy,
    instructions: [
      'Acquire exclusive ownership of this PR head branch before any write.',
      'Re-read the PR head SHA immediately before every mutation.',
      'Abort and recompute if the head SHA changed.',
      'Do not use safe-daytime or hotfix-prod.',
      'Do not deploy production.',
      pr.protected
        ? 'Protected surface: diagnostics and independent review are allowed; autonomous branch mutation is forbidden.'
        : 'For CHECK_FAILED only, use the canonical PR Doctor repair path; do not invent another writer.',
      'Fix only straightforward safe technical failures; otherwise report the blocker.',
      'Do not merge from this workpack. Merge is a separate gated action.',
    ],
  }))
  .sort((a, b) => a.priority - b.priority || a.prNumber - b.prNumber);

const payload = {
  generatedAt: new Date().toISOString(),
  repository: inventory.repository,
  mode: 'SUPERVISED_RECONCILIATION',
  maxParallelismRecommendation: Math.min(20, Math.max(1, workpacks.length)),
  count: workpacks.length,
  workpacks,
};

await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Generated ${workpacks.length} reconciliation workpacks`);
console.log(`Wrote ${outputPath}`);
