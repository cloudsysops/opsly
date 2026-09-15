import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Mac local-agents worker does not consume local_opencode by default', async () => {
  const source = await readFile(
    new URL('../start-mac-local-agents-worker.sh', import.meta.url),
    'utf8'
  );
  const match = source.match(/OPSLY_LOCAL_AGENT_KINDS="\$\{OPSLY_LOCAL_AGENT_KINDS:-([^}]+)\}"/);
  assert.ok(match);
  assert.doesNotMatch(match[1], /local_opencode/);
  assert.doesNotMatch(match[1], /local_openclaw/);
  assert.match(match[1], /local_hermes/);
  assert.match(match[1], /local_codex/);
});
