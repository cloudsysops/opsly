import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateConcurrencyGuard } from '../concurrency-guard.mjs';

test('allows one task on idle mac', () => {
  const result = evaluateConcurrencyGuard({ nodeType: 'mac', nodeActive: 0, fleetActive: 0 });
  assert.equal(result.allowed, true);
});

test('blocks second task on mac', () => {
  const result = evaluateConcurrencyGuard({ nodeType: 'mac', nodeActive: 1, fleetActive: 1 });
  assert.equal(result.allowed, false);
  assert.match(result.reasons.join(' '), /node concurrency limit/);
});

test('VPS remains coordinator-only even if caller raises configured limit', () => {
  const result = evaluateConcurrencyGuard({
    nodeType: 'vps',
    nodeActive: 0,
    fleetActive: 0,
    limits: { maxBackgroundTasksPerNode: { vps: 5 } },
  });
  assert.equal(result.allowed, false);
  assert.match(result.reasons.join(' '), /coordinator-only/);
});

test('blocks same task duplication', () => {
  const result = evaluateConcurrencyGuard({
    nodeType: 'gamer',
    nodeActive: 0,
    fleetActive: 0,
    sameTaskActive: true,
  });
  assert.equal(result.allowed, false);
});
