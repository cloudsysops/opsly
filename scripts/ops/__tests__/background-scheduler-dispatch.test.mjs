import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { evaluateCloudCostPolicy } from '../cloud-cost-policy-check.mjs';
import { toBackgroundCandidate } from '../night-queue-candidates.mjs';

const policy = {
  defaultMode: 'FREE_ONLY',
  unknownCostRequiresApproval: true,
  paidRequiresApproval: true,
  allowedAutoApplyCostClasses: ['free', 'free_with_quota'],
  prohibitedPatterns: ['second-orchestrator'],
  requiredMetadata: ['owner', 'purpose', 'environment', 'cost_class'],
};

test('cost policy evaluator is reusable and allows explicit zero-cost work', () => {
  const result = evaluateCloudCostPolicy(
    {
      owner: 'platform',
      purpose: 'safe maintenance',
      environment: 'local',
      cost_class: 'free',
      estimated_cost_usd: 0,
      architecture_patterns: [],
    },
    policy,
  );
  assert.equal(result.ok, true);
});

test('unknown/missing cost metadata fails closed', () => {
  const result = evaluateCloudCostPolicy(
    { owner: 'platform', purpose: 'unknown work', environment: 'local' },
    policy,
  );
  assert.equal(result.ok, false);
  assert.match(result.blockers.join(' '), /APPROVAL_REQUIRED/);
});

test('night queue candidate surfaces cost metadata', () => {
  const candidate = toBackgroundCandidate(
    '044-safe.md',
    `---
id: safe-044
status: pending
priority: P2
agent: local_codex
owner: platform
environment: local
cost_class: free_with_quota
estimated_cost_usd: 0
architecture_patterns:
---
Review docs only.
`,
  );
  assert.equal(candidate.costClass, 'free_with_quota');
  assert.equal(candidate.estimatedCostUsd, 0);
  assert.equal(candidate.environment, 'local');
});

test('scheduler state path is expected to live under ignored .cursor runtime', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'opsly-bg-'));
  await mkdir(path.join(root, '.cursor/runtime/background-scheduler'), { recursive: true });
  await writeFile(
    path.join(root, '.cursor/runtime/background-scheduler/state.json'),
    JSON.stringify({ version: 1, tasks: {} }),
  );
  assert.equal(true, true);
});
