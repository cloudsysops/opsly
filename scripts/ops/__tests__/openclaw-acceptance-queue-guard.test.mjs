import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('OpenClaw acceptance queue guard is read-only and blocks stale work', async () => {
  const source = await readFile('scripts/ops/openclaw-acceptance-queue-guard.mjs', 'utf8');

  assert.match(source, /new Queue\('local-agents'/);
  assert.match(source, /local_openclaw/);
  assert.match(source, /waiting/);
  assert.match(source, /active/);
  assert.match(source, /delayed/);
  assert.match(source, /prioritized/);
  assert.match(source, /OPENCLAW_ACCEPTANCE_QUEUE_BLOCKED/);
  assert.match(source, /OPENCLAW_ACCEPTANCE_QUEUE_CLEAN/);

  assert.doesNotMatch(source, /\.drain\(/);
  assert.doesNotMatch(source, /\.obliterate\(/);
  assert.doesNotMatch(source, /\.remove\(/);
  assert.doesNotMatch(source, /\.clean\(/);
});
