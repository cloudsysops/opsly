import assert from 'node:assert/strict';
import test from 'node:test';

import { buildMissionControlExecutionProjectionV1 } from '../mission-control-execution-activity-v1';

test('separates autonomous and human-relay capability from observed activity', () => {
  const projection = buildMissionControlExecutionProjectionV1({
    execution_sources: {
      registry_driven_admission: true,
      handoff_available: true,
      registered_workers: [
        { id: 'opencode', enabled: true, opsly_job_type: 'local_opencode' },
      ],
    },
  });

  assert.equal(projection.sources.length, 2);
  assert.equal(
    projection.sources.find((source) => source.transport === 'autonomous')?.available,
    true,
  );
  assert.equal(
    projection.sources.find((source) => source.transport === 'human_relay')?.available,
    true,
  );
  assert.equal(projection.activities.length, 0);
});

test('does not invent human-relay activity when only the adapter is available', () => {
  const projection = buildMissionControlExecutionProjectionV1({
    execution_sources: {
      registry_driven_admission: false,
      handoff_available: true,
      registered_workers: [],
    },
  });

  assert.equal(projection.activities.length, 0);
  assert.equal(
    projection.sources.find((source) => source.transport === 'human_relay')?.available,
    true,
  );
});

test('keeps capability unknown when the read-only source probe is absent', () => {
  const projection = buildMissionControlExecutionProjectionV1({});

  assert.equal(projection.sources.every((source) => source.confidence === 'UNKNOWN'), true);
  assert.equal(projection.sources.every((source) => source.available === false), true);
});

test('an active DispatchClaimV1 means CLAIMED, never RUNNING by itself', () => {
  const projection = buildMissionControlExecutionProjectionV1({
    active_claims: [
      {
        claim_id: 'claim-1',
        work_id: 'work-claim-1',
        workstream: 'software-factory',
        owner: 'opencode',
        state: 'active',
        conflict_key: 'factory/control-plane',
        semantic_scope: 'factory control plane',
        affected_paths: ['apps/admin'],
      },
    ],
  });

  assert.equal(projection.activities.length, 1);
  assert.equal(projection.activities[0]?.state, 'CLAIMED');
  assert.equal(projection.activities[0]?.transport, 'autonomous');
  assert.equal(projection.activities[0]?.conflict_key, 'factory/control-plane');
});

test('live runtime session upgrades a matching claim to RUNNING without duplication', () => {
  const projection = buildMissionControlExecutionProjectionV1({
    active_claims: [
      {
        claim_id: 'claim-2',
        work_id: 'work-2',
        workstream: 'games',
        owner: null,
        state: 'active',
        conflict_key: 'games/ui',
        semantic_scope: null,
        affected_paths: [],
      },
    ],
    runtime_sessions: [
      {
        session_id: 'session-2',
        work_id: 'work-2',
        agent_id: 'builder-2',
        status: 'running',
        branch: 'agent/builder-2/work-2',
        last_seen_at: '2026-09-13T23:40:00.000Z',
      },
    ],
  });

  assert.equal(projection.activities.length, 1);
  assert.equal(projection.activities[0]?.state, 'RUNNING');
  assert.equal(projection.activities[0]?.agent_id, 'builder-2');
  assert.equal(projection.activities[0]?.branch, 'agent/builder-2/work-2');
  assert.match(projection.activities[0]?.source_id ?? '', /dispatch_claims/);
  assert.match(projection.activities[0]?.source_id ?? '', /runtime_sessions/);
});

test('a live runtime session without a work id is still real execution evidence', () => {
  const projection = buildMissionControlExecutionProjectionV1({
    runtime_sessions: [
      {
        session_id: 'session-orphan',
        work_id: null,
        agent_id: 'opencode',
        status: 'running',
        branch: null,
        last_seen_at: '2026-09-13T23:40:00.000Z',
      },
    ],
  });

  assert.equal(projection.activities.length, 1);
  assert.equal(projection.activities[0]?.work_id, 'session:session-orphan');
  assert.equal(projection.activities[0]?.state, 'RUNNING');
  assert.equal(projection.activities[0]?.confidence, 'REAL');
});

test('a runtime waiting for approval is BLOCKED, not RUNNING', () => {
  const projection = buildMissionControlExecutionProjectionV1({
    active_claims: [
      {
        claim_id: 'claim-wait',
        work_id: 'work-wait',
        workstream: 'software-factory',
        owner: 'opencode',
        state: 'active',
        conflict_key: null,
        semantic_scope: null,
        affected_paths: [],
      },
    ],
    runtime_sessions: [
      {
        session_id: 'session-wait',
        work_id: 'work-wait',
        agent_id: 'opencode',
        status: 'waiting_approval',
        branch: 'agent/opencode/work-wait',
        last_seen_at: '2026-09-13T23:40:00.000Z',
      },
    ],
  });

  assert.equal(projection.activities.length, 1);
  assert.equal(projection.activities[0]?.state, 'BLOCKED');
  assert.match(projection.activities[0]?.blocker ?? '', /waiting for approval/);
});

test('GitHub evidence enriches an autonomous claim with PR, verifier and merge readiness', () => {
  const projection = buildMissionControlExecutionProjectionV1({
    active_claims: [
      {
        claim_id: 'claim-3',
        work_id: 'work-3',
        workstream: 'mission-control',
        owner: 'opencode',
        state: 'active',
        conflict_key: 'mission-control/workstreams',
        semantic_scope: null,
        affected_paths: ['apps/admin'],
      },
    ],
    pull_requests: [
      {
        work_id: 'work-3',
        agent_id: null,
        workstream: null,
        conflict_key: null,
        transport: 'unknown',
        pr_number: 99,
        pr_url: 'https://github.com/cloudsysops/opsly/pull/99',
        branch: 'feat/work-3',
        head_sha: 'abc123',
        title: 'work 3',
        draft: false,
        verifier: 'PASS',
        merge_readiness: 'READY',
        check_state: 'PASS',
        mergeable: true,
        blocker: null,
      },
    ],
  });

  assert.equal(projection.activities.length, 1);
  const activity = projection.activities[0];
  assert.equal(activity?.state, 'MERGE_READY');
  assert.equal(activity?.branch, 'feat/work-3');
  assert.equal(activity?.verifier, 'PASS');
  assert.equal(activity?.merge_readiness, 'READY');
});

test('explicit human-relay GitHub evidence creates a real REVIEW activity', () => {
  const projection = buildMissionControlExecutionProjectionV1({
    pull_requests: [
      {
        work_id: 'human-work-1',
        agent_id: 'chatgpt',
        workstream: 'health-travel',
        conflict_key: 'health-travel/ui',
        transport: 'human_relay',
        pr_number: 100,
        pr_url: 'https://github.com/cloudsysops/opsly/pull/100',
        branch: 'feat/human-work-1',
        head_sha: 'def456',
        title: 'human relay',
        draft: false,
        verifier: 'UNKNOWN',
        merge_readiness: 'UNKNOWN',
        check_state: 'PENDING',
        mergeable: true,
        blocker: 'checks are pending or unavailable',
      },
    ],
  });

  assert.equal(projection.activities.length, 1);
  const activity = projection.activities[0];
  assert.equal(activity?.transport, 'human_relay');
  assert.equal(activity?.session_type, 'interactive_subscription');
  assert.equal(activity?.state, 'REVIEW');
  assert.equal(activity?.agent_id, 'chatgpt');
});

test('a generic unmarked PR cannot fabricate an execution activity', () => {
  const projection = buildMissionControlExecutionProjectionV1({
    pull_requests: [
      {
        work_id: 'pr:101',
        agent_id: null,
        workstream: null,
        conflict_key: null,
        transport: 'unknown',
        pr_number: 101,
        pr_url: 'https://github.com/cloudsysops/opsly/pull/101',
        branch: 'agent/opencode/job-1/demo',
        head_sha: 'fedcba',
        title: 'generic',
        draft: false,
        verifier: 'UNKNOWN',
        merge_readiness: 'UNKNOWN',
        check_state: 'UNKNOWN',
        mergeable: null,
        blocker: 'mergeability evidence is incomplete',
      },
    ],
  });

  assert.equal(projection.activities.length, 0);
});
