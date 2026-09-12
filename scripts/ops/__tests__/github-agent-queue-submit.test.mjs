import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = new URL('../github-agent-queue-submit.mjs', import.meta.url);

test('GitHub queue submit is fail-closed on cost and production deploy', async () => {
  const source = await readFile(file, 'utf8');
  assert.match(source, /agent !== 'local_opencode'/);
  assert.match(source, /estimated_cost_usd must be exactly 0/);
  assert.match(source, /production_deploy=true is forbidden/);
  assert.match(source, /paid_infra_required=true is forbidden/);
  assert.match(source, /requires_approval=true is not eligible/);
});

test('GitHub queue submit uses canonical orchestrator endpoint and idempotency', async () => {
  const source = await readFile(file, 'utf8');
  assert.match(source, /\/api\/local\/prompt-submit/);
  assert.match(source, /idempotency_key/);
  assert.match(source, /x-autonomy-approved/);
  assert.match(source, /\/api\/job-status\//);
});
