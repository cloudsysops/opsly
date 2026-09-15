import test from 'node:test';
import assert from 'node:assert/strict';
import { decideBackgroundWork } from '../background-work-decision.mjs';

const macSnapshot = {
  ram_free_gb: 12,
  cpu_load_pct: 20,
  has_gpu: false,
};

test('returns RUN only when resources, selector and concurrency all pass', () => {
  const result = decideBackgroundWork({
    snapshot: macSnapshot,
    nodeType: 'mac',
    maxResourceClass: 'small',
    candidates: [{ id: 'ci-triage', priority: 'P1', runtime: 'codex', resourceClass: 'small' }],
  });
  assert.equal(result.decision, 'RUN');
  assert.equal(result.selected.id, 'ci-triage');
});

test('returns NO_CAPACITY when node resources fail', () => {
  const result = decideBackgroundWork({
    snapshot: { ...macSnapshot, ram_free_gb: 2 },
    nodeType: 'mac',
    candidates: [{ id: 'ci-triage', priority: 'P1', runtime: 'codex' }],
  });
  assert.equal(result.decision, 'NO_CAPACITY');
});

test('returns NO_SAFE_TASK when candidates are unsafe', () => {
  const result = decideBackgroundWork({
    snapshot: macSnapshot,
    nodeType: 'mac',
    candidates: [{ id: 'deploy', priority: 'P1', runtime: 'claude', productionDeploy: true }],
  });
  assert.equal(result.decision, 'NO_SAFE_TASK');
});

test('VPS never becomes executable', () => {
  const result = decideBackgroundWork({
    snapshot: macSnapshot,
    nodeType: 'vps',
    candidates: [{ id: 'ci-triage', priority: 'P1', runtime: 'codex' }],
    concurrencyLimits: { maxBackgroundTasksPerNode: { vps: 9 } },
  });
  assert.equal(result.decision, 'NO_CAPACITY');
});
