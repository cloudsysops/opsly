import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = new URL('../openclaw-readonly-policy-doctor.sh', import.meta.url);

test('OpenClaw policy doctor is inspection-only and fail-closed', async () => {
  const source = await readFile(file, 'utf8');

  assert.match(source, /openclaw config get/);
  assert.doesNotMatch(source, /openclaw config set/);
  assert.doesNotMatch(source, /openclaw config patch/);
  assert.doesNotMatch(source, /openclaw gateway/);
  assert.doesNotMatch(source, /openclaw agent exec/);

  assert.match(source, /workspaceAccess must be ro or none/);
  assert.match(source, /tools\.exec\.mode must be deny/);
  assert.match(source, /tools\.elevated\.enabled must not be true/);
  assert.match(source, /tools\.allow must be exactly \[read\]/);
  assert.ok(source.includes('local ollama/<model> primary with no fallbacks'));
  assert.match(source, /OPENCLAW_CONFIG_READONLY=1 is required/);
  assert.match(source, /sessions_spawn/);
  assert.match(source, /OPENCLAW_READONLY_POLICY_READY/);
});
