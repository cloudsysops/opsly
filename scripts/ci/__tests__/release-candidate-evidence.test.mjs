import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReleaseCandidateEvidence } from '../create-release-candidate-evidence.mjs';

const digest = (char) => `sha256:${char.repeat(64)}`;
const services = [
  'api',
  'admin',
  'portal',
  'icso',
  'llm-gateway',
  'orchestrator',
  'hermes',
  'context-builder',
  'mcp',
];

function digestMap(char) {
  return Object.fromEntries(services.map((service) => [service, digest(char)]));
}

function baseEnv(overrides = {}) {
  return {
    RELEASE_SHA: 'a'.repeat(40),
    STAGING_RUN_ID: '123456789',
    STAGING_DIGESTS_JSON: JSON.stringify(digestMap('b')),
    PRODUCTION_DIGESTS_JSON: JSON.stringify(digestMap('b')),
    STAGING_API_URL: 'https://api-qa.example.test',
    CREATED_AT: '2026-09-17T16:30:00.000Z',
    ...overrides,
  };
}

test('blocks candidate until external gates, migration safety and readiness are bound', () => {
  const candidate = buildReleaseCandidateEvidence(baseEnv());
  assert.equal(candidate.status, 'blocked');
  assert.deepEqual(candidate.blockers.sort(), [
    'ci_security_independent_review_not_bound',
    'migration_safety_not_bound',
    'release_readiness_not_authorized',
  ]);
});

test('allows ready only when every staging digest matches production and all readiness gates are explicit', () => {
  const candidate = buildReleaseCandidateEvidence(
    baseEnv({
      EXTERNAL_GATES_BOUND: 'true',
      MIGRATION_SAFE_FOR_PROMOTION: 'true',
      ALLOW_READY: 'true',
    }),
  );

  assert.equal(candidate.status, 'ready');
  assert.equal(candidate.blockers.length, 0);
  assert.equal(candidate.artifacts.length, services.length);
  assert.equal(candidate.gates.independent_verification, 'passed');
});

test('fails closed when one service does not prove same digest', () => {
  const production = digestMap('b');
  production.admin = digest('c');

  const candidate = buildReleaseCandidateEvidence(
    baseEnv({
      PRODUCTION_DIGESTS_JSON: JSON.stringify(production),
      EXTERNAL_GATES_BOUND: 'true',
      MIGRATION_SAFE_FOR_PROMOTION: 'true',
      ALLOW_READY: 'true',
    }),
  );

  assert.equal(candidate.status, 'blocked');
  assert.deepEqual(candidate.blockers, ['same_digest_not_proven:admin']);
});

test('rejects malformed digest evidence', () => {
  const staging = digestMap('b');
  staging.api = 'latest';

  assert.throws(
    () =>
      buildReleaseCandidateEvidence(
        baseEnv({ STAGING_DIGESTS_JSON: JSON.stringify(staging) }),
      ),
    /staging digest for api must be a sha256 digest/,
  );
});
