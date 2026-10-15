import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Mac local-agents worker does not consume local_opencode by default', async () => {
  const source = await readFile(
    new URL('../start-mac-local-agents-worker.sh', import.meta.url),
    'utf8'
  );
  const utils = await readFile(
    new URL('../../../apps/orchestrator/src/lib/local-worker-utils.ts', import.meta.url),
    'utf8'
  );
  const match = source.match(/OPSLY_LOCAL_AGENT_KINDS="\$\{OPSLY_LOCAL_AGENT_KINDS:-([^}]+)\}"/);
  assert.ok(match);
  assert.doesNotMatch(match[1], /local_opencode/);
  assert.doesNotMatch(match[1], /local_openclaw/);
  assert.match(match[1], /local_hermes/);
  assert.match(match[1], /local_codex/);
  assert.match(source, /MAC_DEFAULT_LOCAL_AGENT_KINDS/);
  assert.match(utils, /GAMER_PLANE_LOCAL_AGENT_KINDS/);
  assert.match(utils, /MAC_DEFAULT_LOCAL_AGENT_KINDS/);
  for (const kind of match[1].split(',')) {
    assert.match(utils, new RegExp(`'${kind.trim()}'`));
  }
});

test('auto-route fail-closes Gamer plane instead of Mac agent fallback', async () => {
  const localRoute = await readFile(
    new URL('../../../apps/orchestrator/src/http/routes/local.ts', import.meta.url),
    'utf8'
  );
  assert.match(localRoute, /isGamerPlaneLocalAgentKind/);
  assert.match(localRoute, /canQueueGamerPlaneDeferred/);
  assert.match(localRoute, /fail_closed=gamer_plane/);
  assert.match(localRoute, /no Mac fallback/);
});
