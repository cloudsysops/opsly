import { describe, expect, it } from 'vitest';

import {
  buildComputeWorkerSnapshot,
  classifyComputeStatus,
  parseComputeHeartbeat,
} from '../compute-worker-snapshot';

const now = new Date('2026-09-07T03:00:00.000Z');

describe('compute-worker-snapshot', () => {
  it('parses legacy ISO and JSON heartbeats', () => {
    expect(parseComputeHeartbeat('2026-09-07T03:00:00Z')?.at).toBe('2026-09-07T03:00:00Z');
    expect(
      parseComputeHeartbeat(JSON.stringify({ at: '2026-09-07T02:59:00Z', vramGb: 16 }))?.vramGb
    ).toBe(16);
    expect(parseComputeHeartbeat(null)).toBeNull();
  });

  it('classifies worker health without hostname hardcoding', () => {
    expect(classifyComputeStatus({ heartbeat: null, now })).toBe('OFFLINE');
    expect(
      classifyComputeStatus({
        heartbeat: { at: '2026-09-07T02:59:40Z', activeJobs: 0 },
        now,
      })
    ).toBe('ONLINE');
    expect(
      classifyComputeStatus({
        heartbeat: { at: '2026-09-07T02:59:40Z', activeJobs: 1 },
        now,
        maxGpuJobs: 1,
      })
    ).toBe('BUSY');
  });

  it('shows the registered gamer as OFFLINE when there is no heartbeat', () => {
    const snap = buildComputeWorkerSnapshot({}, {}, now);
    expect(snap.workers[0]?.workerId).toBe('pc-gamer-openclaw-01');
    expect(snap.workers[0]?.status).toBe('OFFLINE');
    expect(snap.rule).toMatch(/Cloud decides/);
  });
});
