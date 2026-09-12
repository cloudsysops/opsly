import assert from 'node:assert/strict';
import { resolveEffectiveStatus } from '../night-queue-status.mjs';

assert.equal(
  resolveEffectiveStatus({
    job_status: 'unknown',
    local_status: 'done',
    tracked_status: 'done',
  }),
  'completed'
);

assert.equal(
  resolveEffectiveStatus({
    job_status: 'completed',
    local_status: 'pending',
    tracked_status: 'pending',
  }),
  'completed'
);

assert.equal(
  resolveEffectiveStatus({
    job_status: 'processing',
    local_status: 'pending',
    tracked_status: 'pending',
  }),
  'pending'
);

assert.equal(
  resolveEffectiveStatus({
    job_status: null,
    local_status: null,
    tracked_status: 'held',
  }),
  'held'
);

console.log('night-queue-status resolveEffectiveStatus: ok');
