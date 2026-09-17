import test from 'node:test';
import assert from 'node:assert/strict';

import { closeDecision, supersededNumbers } from '../backlog-janitor.mjs';

test('extracts only references on explicit supersedes/replaces lines', () => {
  const body = [
    'Related #10',
    'Supersedes #101 and #102 once validated.',
    'Replaces stale #103.',
  ].join('\n');
  assert.deepEqual(supersededNumbers(body), [101, 102, 103]);
});

test('does not treat ordinary related PR references as superseded evidence', () => {
  assert.deepEqual(supersededNumbers('Related: #10 #11\nFixes #12'), []);
});

test('allows older untouched target after explicit replacement merge', () => {
  const decision = closeDecision({
    target: {
      number: 100,
      state: 'open',
      created_at: '2026-09-10T00:00:00Z',
      updated_at: '2026-09-11T00:00:00Z',
      labels: [],
    },
    replacement: {
      number: 200,
      created_at: '2026-09-12T00:00:00Z',
      merged_at: '2026-09-13T00:00:00Z',
    },
  });
  assert.equal(decision.close, true);
});

test('protects priority work from automatic closing', () => {
  const decision = closeDecision({
    target: {
      number: 100,
      state: 'open',
      created_at: '2026-09-10T00:00:00Z',
      updated_at: '2026-09-11T00:00:00Z',
      labels: [{ name: 'priority:P1' }],
    },
    replacement: {
      number: 200,
      created_at: '2026-09-12T00:00:00Z',
      merged_at: '2026-09-13T00:00:00Z',
    },
  });
  assert.equal(decision.close, false);
  assert.ok(decision.reasons.includes('protected:priority:P1'));
});

test('does not close a target updated after replacement merged', () => {
  const decision = closeDecision({
    target: {
      number: 100,
      state: 'open',
      created_at: '2026-09-10T00:00:00Z',
      updated_at: '2026-09-14T00:00:00Z',
      labels: [],
    },
    replacement: {
      number: 200,
      created_at: '2026-09-12T00:00:00Z',
      merged_at: '2026-09-13T00:00:00Z',
    },
  });
  assert.equal(decision.close, false);
  assert.ok(decision.reasons.includes('target-updated-after-replacement-merge'));
});
