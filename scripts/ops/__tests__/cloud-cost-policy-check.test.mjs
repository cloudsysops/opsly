import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function run(meta) {
  const dir = mkdtempSync(join(tmpdir(), 'opsly-cost-policy-'));
  const p = join(dir, 'meta.json');
  writeFileSync(p, JSON.stringify(meta));
  const result = spawnSync('node', ['scripts/ops/cloud-cost-policy-check.mjs', p], { encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  return { ...result, body: JSON.parse(result.stdout || '{}') };
}

test('free resource with required metadata passes', () => {
  const r = run({
    owner:'opsly',
    purpose:'test',
    environment:'dev',
    cost_class:'free',
    estimated_cost_usd:0,
    architecture_patterns:[]
  });
  assert.equal(r.status, 0);
  assert.equal(r.body.ok, true);
});

test('non-zero estimated cost requires approval', () => {
  const r = run({
    owner:'opsly',
    purpose:'test',
    environment:'dev',
    cost_class:'paid',
    estimated_cost_usd:1,
    architecture_patterns:[]
  });
  assert.equal(r.status, 3);
  assert.match(r.stdout, /APPROVAL_REQUIRED_NON_ZERO_ESTIMATE/);
});

test('ephemeral resource without TTL and destroy command is blocked', () => {
  const r = run({
    owner:'opsly',
    purpose:'test',
    environment:'dev',
    cost_class:'free',
    estimated_cost_usd:0,
    ephemeral:true,
    architecture_patterns:[]
  });
  assert.equal(r.status, 3);
  assert.match(r.stdout, /MISSING_EPHEMERAL_METADATA:ttl/);
  assert.match(r.stdout, /MISSING_DESTROY_COMMAND/);
});

test('prohibited architecture is blocked even when free', () => {
  const r = run({
    owner:'opsly',
    purpose:'test',
    environment:'dev',
    cost_class:'free',
    estimated_cost_usd:0,
    architecture_patterns:['second-orchestrator']
  });
  assert.equal(r.status, 3);
  assert.match(r.stdout, /PROHIBITED_ARCHITECTURE:second-orchestrator/);
});
