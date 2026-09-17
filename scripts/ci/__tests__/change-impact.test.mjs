import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyChangeImpact } from '../change-impact.mjs';

test('Content Studio is daytime-mergeable without implying deploy', () => {
  const result = classifyChangeImpact(['lib/content-studio/src/publishers/tiktok.ts']);
  assert.deepEqual(result.domains, ['content']);
  assert.equal(result.releaseRequired, false);
  assert.equal(result.governedMerge, false);
  assert.equal(result.mergeRoute, 'daytime');
  assert.ok(result.labels.includes('merge:daytime'));
  assert.ok(result.labels.includes('release:none'));
});

test('Peskids code may merge separately but still requires a production release', () => {
  const result = classifyChangeImpact(['apps/peskids/app/page.tsx']);
  assert.ok(result.domains.includes('peskids'));
  assert.equal(result.releaseRequired, true);
  assert.equal(result.governedMerge, false);
  assert.ok(result.labels.includes('merge:daytime'));
  assert.ok(result.labels.includes('release:required'));
});

test('migration is release-required but not a reason to couple merge to deploy', () => {
  const result = classifyChangeImpact(['supabase/migrations/0109_example.sql']);
  assert.ok(result.domains.includes('infra'));
  assert.equal(result.releaseRequired, true);
  assert.equal(result.mergeRoute, 'daytime');
});

test('CI workflow changes stay on governed merge route', () => {
  const result = classifyChangeImpact(['.github/workflows/night-merge.yml']);
  assert.equal(result.governedMerge, true);
  assert.equal(result.mergeRoute, 'governed');
  assert.ok(result.labels.includes('impact:control-plane'));
  assert.ok(result.labels.includes('merge:governed'));
  assert.ok(!result.labels.includes('merge:daytime'));
});

test('shared runtime and health travel can be independently classified', () => {
  const result = classifyChangeImpact([
    'apps/orchestrator/src/http/routes/local.ts',
    'apps/api/lib/revenue/health-travel-events.ts',
  ]);
  assert.ok(result.domains.includes('shared-runtime'));
  assert.ok(result.domains.includes('health-travel'));
  assert.equal(result.governedMerge, false);
});
