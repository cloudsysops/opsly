import assert from 'node:assert/strict';
import test from 'node:test';

import { buildMissionControlSnapshotV1 } from '../mission-control-read-model-v1';

test('composes real runtime, compute, team and queue signals', () => {
  const snapshot = buildMissionControlSnapshotV1({
    now: '2026-09-13T16:00:00.000Z',
    orchestrator: {
      mode: 'queue-only',
      role: 'control-plane',
      workers: { local: { concurrency: 2, active: 1 } },
      queue: { waiting: 2, active: 1, completed: 10, failed: 0 },
    },
    teams: {
      generated_at: '2026-09-13T15:59:59.000Z',
      teams: [
        {
          name: 'builder',
          status: 'active',
          lastTask: 'task-1',
          completedTasks: 4,
          failedTasks: 0,
          avgDurationMs: 100,
        },
      ],
    },
    openclaw: {
      intents: [],
      intents_in_progress: [],
      recent_policy_violations: [],
      agent_metrics: {},
      generated_at: '2026-09-13T15:59:59.000Z',
    },
    runtime: {
      ok: true,
      timestamp: '2026-09-13T15:59:59.000Z',
      nodes: [
        {
          id: 'mac-1',
          hostname: 'mac-1',
          redisConnected: true,
          gpuAvailable: false,
          tmuxSessions: [],
        },
      ],
      queues: [
        { name: 'local-agents', waiting: 1, active: 1, depth: 2, failed: 0 },
      ],
      sessionSummary: { running: 0 },
    },
    compute: {
      workers: [
        {
          workerId: 'gamer-1',
          hostname: 'gamer-1',
          status: 'ONLINE',
          activeJobs: 0,
          lastHeartbeat: '2026-09-13T15:59:58.000Z',
          gpuVendor: 'NVIDIA',
        },
      ],
    },
  });

  assert.equal(snapshot.schema_version, 'MissionControlSnapshotV1');
  assert.equal(snapshot.summary.machines_total, 2);
  assert.equal(snapshot.summary.machines_online, 2);
  assert.equal(snapshot.summary.agents_running, 0);
  assert.equal(snapshot.intelligence.execution_evidence.state, 'unknown');
  assert.equal(snapshot.blockers.length, 0);
});

test('does not invent online state when runtime source is missing', () => {
  const snapshot = buildMissionControlSnapshotV1({
    now: '2026-09-13T16:00:00.000Z',
    source_errors: { runtime: '403 Forbidden' },
  });

  assert.equal(snapshot.summary.machines_total, 0);
  assert.equal(snapshot.summary.healthy_idle, null);
  assert.equal(snapshot.sources.find((s) => s.id === 'runtime')?.confidence, 'UNKNOWN');
  assert.equal(snapshot.blockers[0]?.failure_class, 'BLOCKED_ACCESS');
});

test('keeps failed runtime probe explicit and unknown', () => {
  const snapshot = buildMissionControlSnapshotV1({
    runtime: {
      ok: false,
      timestamp: '2026-09-13T16:00:00.000Z',
      nodes: [],
      queues: [],
      error: 'probe failed',
    },
  });

  assert.equal(snapshot.summary.machines_online, 0);
  assert.equal(
    snapshot.blockers.some((blocker) => blocker.blocker_id === 'runtime:nodes-status'),
    true,
  );
});

test('deduplicates queue observations without summing the same queue twice', () => {
  const snapshot = buildMissionControlSnapshotV1({
    runtime: {
      ok: true,
      timestamp: '2026-09-13T16:00:00.000Z',
      nodes: [],
      queues: [
        { name: 'local-agents', waiting: 2, active: 1, depth: 3, failed: 0 },
      ],
      sessionSummary: { running: 0 },
    },
    compute: {
      queues: {
        'local-agents': { waiting: 2, active: 1, failed: 0 },
      },
    },
  });

  assert.equal(snapshot.queues.length, 1);
  assert.equal(snapshot.summary.queue_waiting, 2);
  assert.equal(snapshot.summary.queue_active, 1);
});


test('historical team activity never fabricates a RUNNING agent', () => {
  const snapshot = buildMissionControlSnapshotV1({
    teams: {
      generated_at: '2026-09-13T16:00:00.000Z',
      teams: [
        {
          name: 'builder',
          status: 'active',
          lastTask: 'completed-task',
          completedTasks: 10,
          failedTasks: 0,
          avgDurationMs: 100,
        },
      ],
    },
  });

  assert.equal(snapshot.summary.agents_running, 0);
  assert.equal(snapshot.agents[0]?.state, 'IDLE');
});

test('orchestrator sentinel response remains unavailable and adds a blocker', () => {
  const snapshot = buildMissionControlSnapshotV1({
    orchestrator: {
      mode: 'unknown',
      role: 'unknown',
      workers: {},
      queue: { waiting: 0, active: 0, completed: 0, failed: 0 },
    },
  });

  const source = snapshot.sources.find((item) => item.id === 'orchestrator');
  assert.equal(source?.available, false);
  assert.equal(source?.confidence, 'UNKNOWN');
  assert.equal(snapshot.queues.some((queue) => queue.queue === 'orchestrator'), false);
  assert.equal(
    snapshot.blockers.some(
      (blocker) => blocker.blocker_id === 'orchestrator:sentinel-unavailable',
    ),
    true,
  );
});

test('duplicate queue observations keep one coherent tuple instead of field maxima', () => {
  const snapshot = buildMissionControlSnapshotV1({
    runtime: {
      ok: true,
      timestamp: '2026-09-13T16:00:00.000Z',
      nodes: [],
      queues: [
        { name: 'local-agents', waiting: 2, active: 0, depth: 2, failed: 0 },
      ],
      sessionSummary: { running: 0 },
    },
    compute: {
      queues: {
        'local-agents': { waiting: 0, active: 2, failed: 0 },
      },
    },
  });

  assert.equal(snapshot.queues.length, 1);
  assert.deepEqual(
    {
      waiting: snapshot.queues[0]?.waiting,
      active: snapshot.queues[0]?.active,
      depth: snapshot.queues[0]?.depth,
    },
    { waiting: 2, active: 0, depth: 2 },
  );
  assert.equal(snapshot.summary.queue_waiting + snapshot.summary.queue_active, 2);
});


test('tracks Hermes coordinator telemetry as a distinct source without fabricating a running external Hermes agent', () => {
  const snapshot = buildMissionControlSnapshotV1({
    now: '2026-09-13T16:00:00.000Z',
    hermes: {
      ok: true,
      tasks_by_state: { queued: 2, completed: 4 },
      metrics: [],
      workflows: [{ workflow_id: 'wf-1', name: 'coordinator', status: 'active' }],
      audit_recent: [],
      errors: {},
    },
  });

  const source = snapshot.sources.find((item) => item.id === 'task-coordinator');
  assert.equal(source?.available, true);
  assert.equal(source?.endpoint, '/api/hermes/metrics');
  assert.equal(snapshot.agents.some((agent) => agent.agent_id === 'hermes-cli'), false);
});
