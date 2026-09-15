import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseCandidateV1Schema } from '../dist/release-candidate.js';

function candidate(overrides = {}) {
  return {
    schema_version: 'ReleaseCandidateV1',
    candidate_id: 'rc-health-travel-001',
    product: 'health-travel',
    tenant_slug: 'opsly-internal',
    commit_sha: 'a'.repeat(40),
    source_environment: 'staging',
    staging_deployment: 'opsly-staging',
    staging_run_id: '34766085179',
    artifacts: [
      {
        kind: 'container_image',
        name: 'api',
        immutable_ref: 'ghcr.io/cloudsysops/intcloudsysops-api@sha256:abc',
        digest: 'sha256:abc',
      },
    ],
    gates: {
      ci: 'passed',
      security: 'passed',
      staging_health: 'passed',
      e2e: 'passed',
      independent_verification: 'passed',
    },
    migration: {
      requires_approval: true,
      safe_for_promotion: true,
      production_applied: false,
    },
    evidence_refs: ['gha://run/34766085179'],
    blockers: [],
    status: 'ready',
    promotion: {
      target_environment: 'production',
      rebuild_allowed: false,
      exact_commit_required: true,
      exact_artifact_required: true,
    },
    created_at: '2026-09-13T15:00:00.000Z',
    ...overrides,
  };
}

test('accepts immutable staging release candidate', () => {
  assert.equal(releaseCandidateV1Schema.parse(candidate()).status, 'ready');
});

test('rejects ready candidate with blockers', () => {
  const result = releaseCandidateV1Schema.safeParse(
    candidate({ blockers: ['E2E failed'] })
  );
  assert.equal(result.success, false);
});

test('rejects production-applied migration by contract', () => {
  const result = releaseCandidateV1Schema.safeParse(
    candidate({
      migration: {
        requires_approval: true,
        safe_for_promotion: true,
        production_applied: true,
      },
    })
  );
  assert.equal(result.success, false);
});

test('rejects mutable container artifact for ready candidate', () => {
  const result = releaseCandidateV1Schema.safeParse(
    candidate({
      artifacts: [
        {
          kind: 'container_image',
          name: 'api',
          immutable_ref: 'ghcr.io/cloudsysops/intcloudsysops-api:latest',
        },
      ],
    })
  );
  assert.equal(result.success, false);
});

test('blocks promotion rebuild by literal contract', () => {
  const result = releaseCandidateV1Schema.safeParse(
    candidate({
      promotion: {
        target_environment: 'production',
        rebuild_allowed: true,
        exact_commit_required: true,
        exact_artifact_required: true,
      },
    })
  );
  assert.equal(result.success, false);
});
