import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aliasTenantIdentifier,
  buildStreamSafeMissionControlProjection,
  containsUnsafeStreamMaterial,
  streamSafeText,
} from '../mission-control-stream-safe-v1';

test('redacts common token, email and phone material', () => {
  const input =
    'Bearer super.secret.token user@example.com +1 (401) 555-1212 api_key=very-secret-value';
  const safe = streamSafeText(input) ?? '';

  assert.equal(containsUnsafeStreamMaterial(safe), false);
  assert.doesNotMatch(safe, /user@example\.com/);
  assert.doesNotMatch(safe, /very-secret-value/);
  assert.match(safe, /REDACTED/);
});

test('removes URL query strings and credentials', () => {
  const safe = streamSafeText('https://user:pass@example.com/path?token=abc123#private') ?? '';
  assert.equal(safe, 'https://example.com/path');
});

test('strips URL userinfo/query even when they do not match a known secret keyword or email shape', () => {
  // Regression: the URL sanitizer previously ran AFTER the generic secret/email
  // patterns, so a password or query param that didn't happen to look like an
  // email or match the fixed keyword list (api_key|token|secret|password|...)
  // survived untouched. `session=xyz789` and `hunter2` are neither.
  const safe = streamSafeText('https://john:hunter2@example.com/path?session=xyz789#frag') ?? '';
  assert.equal(safe, 'https://example.com/path');
  assert.doesNotMatch(safe, /hunter2/);
  assert.doesNotMatch(safe, /xyz789/);
});

test('aliases tenant-shaped identifiers deterministically', () => {
  const one = aliasTenantIdentifier('customer-real-name');
  const two = aliasTenantIdentifier('customer-real-name');
  assert.equal(one, two);
  assert.match(one ?? '', /^ORBIT-\d{4}$/);

  const safe = streamSafeText('tenant_slug=customer-real-name');
  assert.match(safe ?? '', /^tenant_slug=ORBIT-\d{4}$/);
  assert.doesNotMatch(safe ?? '', /customer-real-name/);
});

test('sanitizes all user-visible execution activity fields before stream render', () => {
  const projection = buildStreamSafeMissionControlProjection({
    schema_version: 'MissionControlExecutionProjectionV1',
    sources: [
      {
        source_id: 'autonomous_harness',
        transport: 'autonomous',
        available: true,
        confidence: 'REAL',
        detail: 'contact user@example.com token=abc-super-secret',
      },
    ],
    activities: [
      {
        work_id: 'tenant=clientalpha/work-1',
        agent_id: 'opencode',
        transport: 'autonomous',
        session_type: 'orchestrated_runtime',
        state: 'BLOCKED',
        machine: 'home-gpu-01',
        workstream: 'tenant/clientalpha',
        conflict_key: 'tenant-clientalpha/ui',
        branch: 'feat/tenant-clientalpha?token=abc',
        pr_url: 'https://github.com/cloudsysops/opsly/pull/1?access_token=abc',
        verifier: 'BLOCKED',
        merge_readiness: 'BLOCKED',
        blocker: 'owner user@example.com Authorization: Bearer abcdefghijklmnop',
        source_id: 'github',
        confidence: 'REAL',
      },
    ],
  });

  const serialized = JSON.stringify(projection);
  assert.equal(containsUnsafeStreamMaterial(serialized), false);
  assert.doesNotMatch(serialized, /user@example\.com/);
  assert.doesNotMatch(serialized, /clientalpha/);
  assert.doesNotMatch(serialized, /access_token/);
});
