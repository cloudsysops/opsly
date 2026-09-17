import test from 'node:test';
import assert from 'node:assert/strict';

import { closeDecision, supersededNumbers } from '../backlog-janitor.mjs';

const replacement = {
  number: 200,
  created_at: '2026-09-12T00:00:00Z',
  merged_at: '2026-09-13T00:00:00Z',
};

function target(labels = [], overrides = {}) {
  return {
    number: 100,
    state: 'open',
    created_at: '2026-09-10T00:00:00Z',
    updated_at: '2026-09-11T00:00:00Z',
    labels: labels.map((name) => ({ name })),
    ...overrides,
  };
}

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

test('refuses ambiguous alternative supersedes evidence', () => {
  assert.deepEqual(supersededNumbers('Supersedes #101 or #102 after review.'), []);
});

test('allows older untouched target after explicit replacement merge', () => {
  const decision = closeDecision({ target: target(), replacement });
  assert.equal(decision.close, true);
});

for (const protectedLabel of ['priority:P0', 'priority:P1', 'state:waiting-human', 'agent:working']) {
  test(`protects ${protectedLabel} from automatic closing`, () => {
    const decision = closeDecision({ target: target([protectedLabel]), replacement });
    assert.equal(decision.close, false);
    assert.ok(decision.reasons.includes(`protected:${protectedLabel}`));
  });
}

test('does not close a target updated after replacement merged', () => {
  const decision = closeDecision({
    target: target([], { updated_at: '2026-09-14T00:00:00Z' }),
    replacement,
  });
  assert.equal(decision.close, false);
  assert.ok(decision.reasons.includes('target-updated-after-replacement-merge'));
});

test('does not close a target created after the replacement PR', () => {
  const decision = closeDecision({
    target: target([], { created_at: '2026-09-12T12:00:00Z', updated_at: '2026-09-12T12:00:00Z' }),
    replacement,
  });
  assert.equal(decision.close, false);
  assert.ok(decision.reasons.includes('target-not-older'));
});

test('does not close without merged replacement evidence', () => {
  const decision = closeDecision({
    target: target(),
    replacement: { ...replacement, merged_at: null },
  });
  assert.equal(decision.close, false);
  assert.ok(decision.reasons.includes('replacement-not-merged'));
});

test('does not close self-reference', () => {
  const decision = closeDecision({
    target: target(),
    replacement: { ...replacement, number: 100 },
  });
  assert.equal(decision.close, false);
  assert.ok(decision.reasons.includes('self-reference'));
});
