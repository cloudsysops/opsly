import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReleaseRollbackPlan,
  RELEASE_SERVICE_IMAGES,
} from '../release-rollback-plan.mjs';

const shaA = 'a'.repeat(40);
const shaB = 'b'.repeat(40);
const digest = (char) => `sha256:${char.repeat(64)}`;

function completeDigestMap() {
  return Object.fromEntries(
    [...new Set(Object.values(RELEASE_SERVICE_IMAGES))].map((service, index) => [
      service,
      digest(String((index % 9) + 1)),
    ]),
  );
}

test('builds rollback plan only from exact previous immutable refs', () => {
  const plan = buildReleaseRollbackPlan({
    attemptedSha: shaA,
    previousSha: shaB,
    previousDigests: completeDigestMap(),
  });

  assert.equal(plan.schema_version, 'ReleaseRollbackPlanV1');
  assert.equal(plan.rebuild_allowed, false);
  assert.equal(plan.executable_from_this_script, false);
  assert.equal(plan.services.length, Object.keys(RELEASE_SERVICE_IMAGES).length);
  assert.equal(plan.services.find((entry) => entry.compose_service === 'app').image_service, 'api');
  assert.ok(plan.services.every((entry) => entry.immutable_ref.includes('@sha256:')));
});

test('fails closed when any previous service digest is missing', () => {
  const digests = completeDigestMap();
  delete digests.portal;

  assert.throws(
    () =>
      buildReleaseRollbackPlan({
        attemptedSha: shaA,
        previousSha: shaB,
        previousDigests: digests,
      }),
    /previous digest for portal must be a sha256 digest/,
  );
});

test('rejects rollback to the same attempted SHA', () => {
  assert.throws(
    () =>
      buildReleaseRollbackPlan({
        attemptedSha: shaA,
        previousSha: shaA,
        previousDigests: completeDigestMap(),
      }),
    /rollback target must differ/,
  );
});

test('rejects mutable or malformed image evidence', () => {
  const digests = completeDigestMap();
  digests.api = 'latest';

  assert.throws(
    () =>
      buildReleaseRollbackPlan({
        attemptedSha: shaA,
        previousSha: shaB,
        previousDigests: digests,
      }),
    /previous digest for api must be a sha256 digest/,
  );
});
