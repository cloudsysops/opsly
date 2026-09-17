import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyChecks, hasDoctorMarker, isIgnoredCheck } from '../pr-triage.mjs';

const ignored = ['production change window', 'opsly-independent-review', 'independent-review'];

test('ignores governance-only failures', () => {
  const result = classifyChecks([
    { name: 'Production change window', status: 'completed', conclusion: 'failure' },
    { name: 'lint', status: 'completed', conclusion: 'success' },
  ], ignored);
  assert.equal(result.state, 'ready');
});

test('marks a real CI failure as needs-fix', () => {
  const result = classifyChecks([
    { name: 'lint', status: 'completed', conclusion: 'success' },
    { name: 'test-unit', status: 'completed', conclusion: 'failure' },
  ], ignored);
  assert.equal(result.state, 'needs-fix');
  assert.deepEqual(result.failures.map((run) => run.name), ['test-unit']);
});

test('keeps pending heads unclassified', () => {
  const result = classifyChecks([
    { name: 'lint', status: 'in_progress', conclusion: null },
  ], ignored);
  assert.equal(result.state, 'pending');
});

test('recognizes PR Doctor ownership only for current head', () => {
  const comments = [{ body: 'PR Doctor: fix dispatched for abcdef12' }];
  assert.equal(hasDoctorMarker(comments, 'abcdef1234567890'), true);
  assert.equal(hasDoctorMarker(comments, '9999999934567890'), false);
});

test('matches ignored checks case-insensitively', () => {
  assert.equal(isIgnoredCheck('Opsly-Independent-Review', ignored), true);
});
