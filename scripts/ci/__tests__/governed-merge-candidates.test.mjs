import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateCandidate } from '../governed-merge-candidates.mjs';

const basePr = {
  base: { ref: 'main' },
  head: { sha: 'abc' },
  draft: false,
  mergeable: true,
};

const greenChecks = [
  { id: 2, name: 'CI / build', status: 'completed', conclusion: 'success' },
  { id: 3, name: 'Security scan', status: 'completed', conclusion: 'success' },
  { id: 4, name: 'Production change window', status: 'completed', conclusion: 'failure' },
];

const approvedStatus = [{ context: 'opsly-independent-review', state: 'success' }];

test('daytime candidate requires ready + daytime route + independent review', () => {
  const result = evaluateCandidate({
    pr: basePr,
    labels: ['state:ready', 'merge:daytime', 'release:none', 'impact:content'],
    checkRuns: greenChecks,
    statuses: approvedStatus,
    route: 'daytime',
  });
  assert.equal(result.eligible, true);
});

test('production-window failure is not a code failure for merge-only route', () => {
  const result = evaluateCandidate({
    pr: basePr,
    labels: ['state:ready', 'merge:daytime', 'release:none', 'impact:content'],
    checkRuns: greenChecks,
    statuses: approvedStatus,
    route: 'daytime',
  });
  assert.equal(result.eligible, true);
});

test('release-required surface cannot enter daytime auto merge even with a stale manual label', () => {
  const result = evaluateCandidate({
    pr: basePr,
    labels: ['state:ready', 'merge:daytime', 'release:required', 'impact:infra'],
    checkRuns: greenChecks,
    statuses: approvedStatus,
    route: 'daytime',
  });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('release-required'));
});

test('Peskids cannot enter daytime auto merge even with a stale manual label', () => {
  const result = evaluateCandidate({
    pr: basePr,
    labels: ['state:ready', 'merge:daytime', 'release:required', 'impact:peskids'],
    checkRuns: greenChecks,
    statuses: approvedStatus,
    route: 'daytime',
  });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('peskids-protected'));
});

test('control-plane changes cannot enter daytime auto merge', () => {
  const result = evaluateCandidate({
    pr: basePr,
    labels: ['state:ready', 'merge:daytime', 'release:none', 'impact:control-plane'],
    checkRuns: greenChecks,
    statuses: approvedStatus,
    route: 'daytime',
  });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('control-plane'));
});

test('conflicting governed route cannot enter daytime auto merge', () => {
  const result = evaluateCandidate({
    pr: basePr,
    labels: ['state:ready', 'merge:daytime', 'merge:governed', 'release:none'],
    checkRuns: greenChecks,
    statuses: approvedStatus,
    route: 'daytime',
  });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('conflicting-governed-route'));
});

test('hard blockers win over green checks', () => {
  const result = evaluateCandidate({
    pr: basePr,
    labels: ['state:ready', 'merge:daytime', 'release:none', 'state:waiting-human'],
    checkRuns: greenChecks,
    statuses: approvedStatus,
    route: 'daytime',
  });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('blocked:state:waiting-human'));
});

test('pending or failed real checks block merge', () => {
  const result = evaluateCandidate({
    pr: basePr,
    labels: ['state:ready', 'merge:daytime', 'release:none'],
    checkRuns: [{ id: 9, name: 'test-unit', status: 'completed', conclusion: 'failure' }],
    statuses: approvedStatus,
    route: 'daytime',
  });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('failed:test-unit'));
});

test('stale duplicate failure is ignored when newer same-name rerun is green', () => {
  const result = evaluateCandidate({
    pr: basePr,
    labels: ['state:ready', 'merge:daytime', 'release:none'],
    checkRuns: [
      { id: 10, name: 'test-unit', status: 'completed', conclusion: 'success' },
      { id: 9, name: 'test-unit', status: 'completed', conclusion: 'failure' },
    ],
    statuses: approvedStatus,
    route: 'daytime',
  });
  assert.equal(result.eligible, true);
});
