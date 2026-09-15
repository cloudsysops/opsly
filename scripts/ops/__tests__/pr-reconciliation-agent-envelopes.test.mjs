import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../../..');
const script = path.join(repoRoot, 'scripts/ops/pr-reconciliation-agent-envelopes.mjs');

test('prepares supervised-only envelopes with exact-head and conflict lock', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'reconcile-envelope-'));
  const input = path.join(dir, 'workpacks.json');
  const output = path.join(dir, 'envelopes.json');
  await fs.writeFile(input, JSON.stringify({
    repository: 'cloudsysops/opsly',
    workpacks: [{
      id: 'pr-1300', prNumber: 1300, title: 'Astral Arena', lane: 'CONFLICTED',
      head: 'feat/astral-arena-universe', base: 'main', expectedHeadSha: 'abc123',
      lockKey: 'pr-reconcile:1300:feat/astral-arena-universe', instructions: ['Do not merge.']
    }]
  }));

  const run = spawnSync(process.execPath, [script], {
    cwd: repoRoot,
    env: { ...process.env, RECONCILIATION_WORKPACKS: input, RECONCILIATION_AGENT_ENVELOPES: output },
    encoding: 'utf8'
  });
  assert.equal(run.status, 0, run.stderr);
  const payload = JSON.parse(await fs.readFile(output, 'utf8'));
  assert.equal(payload.dispatchAllowed, false);
  assert.equal(payload.mode, 'SUPERVISED_ONLY');
  assert.equal(payload.envelopes[0].requiresApproval, true);
  assert.equal(payload.envelopes[0].expectedHeadSha, 'abc123');
  assert.equal(payload.envelopes[0].conflictKey, 'pr-reconcile:1300:feat/astral-arena-universe');
  assert.equal(payload.envelopes[0].productionDeploy, false);
  assert.equal(payload.envelopes[0].estimatedCostUsd, 0);
});
