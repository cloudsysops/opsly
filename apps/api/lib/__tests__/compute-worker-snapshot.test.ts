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

  it('passes through a sanitized streaming block for a fresh heartbeat', () => {
    const heartbeats = {
      'pc-gamer-openclaw-01': JSON.stringify({
        at: '2026-09-07T02:59:50Z',
        activeJobs: 0,
        streaming: {
          live: true,
          platforms: ['twitch', 'TikTok', 'x'.repeat(200)],
          uptimeSec: 42,
          sceneName: 'a'.repeat(200),
          updatedAt: '2026-09-07T02:59:50Z',
        },
      }),
    };
    const snap = buildComputeWorkerSnapshot(heartbeats, {}, now);
    const worker = snap.workers.find((w) => w.workerId === 'pc-gamer-openclaw-01');
    expect(worker?.status).toBe('ONLINE');
    expect(worker?.streaming?.live).toBe(true);
    expect(worker?.streaming?.platforms).toEqual(['twitch', 'TikTok', 'x'.repeat(200)]);
    // sceneName is capped server-side regardless of what the heartbeat sent
    expect(worker?.streaming?.sceneName).toHaveLength(80);
  });

  it('never trusts a stale heartbeat streaming block as current truth', () => {
    const heartbeats = {
      'pc-gamer-openclaw-01': JSON.stringify({
        at: '2026-09-07T01:00:00Z', // > heartbeatStaleSec old relative to `now`
        streaming: {
          live: true,
          platforms: [],
          uptimeSec: 999,
          sceneName: null,
          updatedAt: '2026-09-07T01:00:00Z',
        },
      }),
    };
    const snap = buildComputeWorkerSnapshot(heartbeats, {}, now);
    const worker = snap.workers.find((w) => w.workerId === 'pc-gamer-openclaw-01');
    expect(worker?.status).toBe('OFFLINE');
    expect(worker?.streaming).toBeUndefined();
  });

  it('omits streaming entirely when the heartbeat has no streaming block', () => {
    const heartbeats = {
      'pc-gamer-openclaw-01': JSON.stringify({ at: '2026-09-07T02:59:50Z', activeJobs: 0 }),
    };
    const snap = buildComputeWorkerSnapshot(heartbeats, {}, now);
    const worker = snap.workers.find((w) => w.workerId === 'pc-gamer-openclaw-01');
    expect(worker?.streaming).toBeUndefined();
  });
});
