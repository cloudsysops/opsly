import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMissionControlReleaseProjectionV1,
  type ReleaseCandidateReadV1,
} from '../mission-control-release-v1';

function candidate(overrides: Partial<ReleaseCandidateReadV1> = {}): ReleaseCandidateReadV1 {
  return {
    schema_version: 'ReleaseCandidateV1',
    candidate_id: 'rc-test-001',
    commit_sha: 'a'.repeat(40),
    staging_run_id: '12345',
    status: 'blocked',
    gates: {
      ci: 'pending',
      security: 'pending',
      staging_health: 'passed',
      e2e: 'passed',
      independent_verification: 'pending',
    },
    migration: {
      requires_approval: false,
      safe_for_promotion: false,
      production_applied: false,
    },
    blockers: ['same_digest_not_proven:admin'],
    artifacts: [
      {
        name: 'admin',
        immutable_ref: `ghcr.io/cloudsysops/intcloudsysops-admin@sha256:${'b'.repeat(64)}`,
        digest: `sha256:${'b'.repeat(64)}`,
      },
    ],
    promotion: {
      target_environment: 'production',
      rebuild_allowed: false,
      exact_commit_required: true,
      exact_artifact_required: true,
    },
    evidence_refs: ['gha://run/12345'],
    ...overrides,
  };
}

test('no candidate evidence remains explicitly UNKNOWN', () => {
  const projection = buildMissionControlReleaseProjectionV1(null);
  assert.equal(projection.confidence, 'UNKNOWN');
  assert.deepEqual(projection.blockers, ['release_candidate_evidence_unbound']);
  assert.ok(projection.stages.every((stage) => stage.state === 'UNKNOWN'));
});

test('blocked candidate never exposes production approval as ready', () => {
  const projection = buildMissionControlReleaseProjectionV1(candidate());
  assert.equal(projection.confidence, 'OBSERVED');
  assert.equal(projection.stages.find((stage) => stage.id === 'QA_VERIFIED')?.state, 'PASSED');
  assert.equal(projection.stages.find((stage) => stage.id === 'RELEASE_CANDIDATE')?.state, 'BLOCKED');
  assert.equal(projection.stages.find((stage) => stage.id === 'PROD_APPROVAL_REQUIRED')?.state, 'BLOCKED');
  assert.equal(projection.stages.find((stage) => stage.id === 'RELEASED')?.state, 'UNKNOWN');
});

test('ready candidate stops at explicit production approval required', () => {
  const ready = candidate({
    status: 'ready',
    blockers: [],
    gates: {
      ci: 'passed',
      security: 'passed',
      staging_health: 'passed',
      e2e: 'passed',
      independent_verification: 'passed',
    },
    migration: {
      requires_approval: false,
      safe_for_promotion: true,
      production_applied: false,
    },
  });

  const projection = buildMissionControlReleaseProjectionV1(ready);
  assert.equal(projection.stages.find((stage) => stage.id === 'RELEASE_CANDIDATE')?.state, 'PASSED');
  assert.equal(projection.stages.find((stage) => stage.id === 'PROD_APPROVAL_REQUIRED')?.state, 'PENDING');
  assert.equal(projection.stages.find((stage) => stage.id === 'RELEASED')?.state, 'UNKNOWN');
});

test('failed QA gate blocks QA_VERIFIED', () => {
  const failed = candidate({
    gates: {
      ci: 'passed',
      security: 'passed',
      staging_health: 'failed',
      e2e: 'passed',
      independent_verification: 'passed',
    },
  });
  const projection = buildMissionControlReleaseProjectionV1(failed);
  assert.equal(projection.stages.find((stage) => stage.id === 'QA_VERIFIED')?.state, 'BLOCKED');
});
