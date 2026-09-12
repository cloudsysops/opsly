import test from 'node:test';
import assert from 'node:assert/strict';
import { selectBackgroundTask } from '../background-task-selector.mjs';

test('selects highest-priority safe bounded task', () => {
  const result = selectBackgroundTask([
    { id: 'docs', priority: 'P2', runtime: 'claude', resourceClass: 'small', estimatedMinutes: 10 },
    { id: 'ci', priority: 'P1', runtime: 'codex', resourceClass: 'small', estimatedMinutes: 20 },
    { id: 'refactor', priority: 'P3', runtime: 'opencode', resourceClass: 'large' },
  ], { nodeType: 'mac', maxResourceClass: 'medium' });

  assert.equal(result.decision, 'RUN');
  assert.equal(result.selected.id, 'ci');
});

test('rejects duplicate, approval, paid, production and blocked work', () => {
  const result = selectBackgroundTask([
    { id: 'dup', priority: 'P1', runtime: 'codex', activeElsewhere: true },
    { id: 'approval', priority: 'P1', runtime: 'claude', requiresApproval: true },
    { id: 'paid', priority: 'P1', runtime: 'claude', paidInfraRequired: true },
    { id: 'prod', priority: 'P1', runtime: 'claude', productionDeploy: true },
    { id: 'blocked', priority: 'P1', runtime: 'claude', blocked: true },
  ], { nodeType: 'mac', maxResourceClass: 'large' });

  assert.equal(result.decision, 'NO_SAFE_TASK');
  assert.equal(result.rejected.length, 5);
});

test('respects node and resource capability', () => {
  const result = selectBackgroundTask([
    { id: 'gpu', priority: 'P1', runtime: 'opencode', nodeTypes: ['gamer'], resourceClass: 'large' },
    { id: 'small', priority: 'P2', runtime: 'claude', nodeTypes: ['mac'], resourceClass: 'small' },
  ], { nodeType: 'mac', maxResourceClass: 'small' });

  assert.equal(result.selected.id, 'small');
});
