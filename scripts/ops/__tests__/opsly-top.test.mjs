import assert from 'node:assert/strict';
import test from 'node:test';

import { parseTopArgs, renderOpslyTop } from '../opsly-top.mjs';

test('defaults to a two-second live refresh and local API', () => {
  const parsed = parseTopArgs([]);
  assert.equal(parsed.interval, 2000);
  assert.equal(parsed.once, false);
  assert.ok(parsed.apiBase);
});

test('renders machine, agent, queue and claim evidence without secrets', () => {
  const output = renderOpslyTop(
    {
      generated_at: '2026-09-14T02:00:00.000Z',
      summary: {
        machines: 1,
        machines_online: 1,
        agents: 1,
        agents_live: 1,
        sessions_active: 1,
        claims_active: 1,
        queue_waiting: 2,
        queue_active: 1,
        queue_failed: 0,
      },
      machines: [
        {
          host: 'pc-gamer',
          state: 'BUSY',
          cpu_pct: 42,
          ram_used_gb: 12,
          ram_total_gb: 32,
          gpu_pct: 73,
          vram_used_gb: 8,
          vram_total_gb: 16,
          temperature_c: 66,
          active_jobs: 1,
          heartbeat: new Date().toISOString(),
        },
      ],
      agents: [
        {
          id: 'opencode',
          runtime_state: 'LIVE',
          dispatch: 'ELIGIBLE',
          session_state: 'RUNNING',
          work_id: 'work-123',
          blocker: null,
        },
      ],
      queues: [{ name: 'local-agents', waiting: 2, active: 1, failed: 0, source: 'runtime' }],
      claims: [{ work_id: 'work-123', owner: 'opencode', workstream: 'factory', conflict_key: 'cli/top' }],
      errors: [],
    },
    { color: false },
  );

  assert.match(output, /SIERRA CONTROL \/ OPSLY TOP/);
  assert.match(output, /pc-gamer/);
  assert.match(output, /opencode/);
  assert.match(output, /local-agents/);
  assert.match(output, /work-123/);
  assert.doesNotMatch(output, /PLATFORM_ADMIN_TOKEN/);
});

test('never renders unavailable metrics as fabricated zeroes', () => {
  const output = renderOpslyTop(
    {
      generated_at: '2026-09-14T02:00:00.000Z',
      summary: {
        machines: 1,
        machines_online: 0,
        agents: 0,
        agents_live: 0,
        sessions_active: 0,
        claims_active: 0,
        queue_waiting: 0,
        queue_active: 0,
        queue_failed: 0,
      },
      machines: [
        {
          host: 'mac-worker',
          state: 'UNKNOWN',
          cpu_pct: null,
          ram_used_gb: null,
          ram_total_gb: null,
          gpu_pct: null,
          vram_used_gb: null,
          vram_total_gb: null,
          temperature_c: null,
          active_jobs: null,
          heartbeat: null,
        },
      ],
      agents: [],
      queues: [],
      claims: [],
      errors: ['compute: unavailable'],
    },
    { color: false },
  );
  assert.match(output, /UNKNOWN/);
  assert.match(output, /DEGRADED SOURCES/);
});
