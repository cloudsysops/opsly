import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySpawnError,
  extraSearchPaths,
  mapBridgeHttpFailure,
  promptContentFromBody,
  redactSecrets,
  resolveAgentCommand,
} from '../../lib/cli-agent-bridge.mjs';

test('prompt_content is canonical and prompt is fallback', () => {
  assert.equal(promptContentFromBody({ prompt_content: 'LOCAL_AGENT_OK' }), 'LOCAL_AGENT_OK');
  assert.equal(promptContentFromBody({ prompt: 'legacy' }), 'legacy');
  assert.equal(promptContentFromBody({}), '');
  assert.equal(promptContentFromBody(null), '');
});

test('missing prompt_content maps to deterministic VALIDATION_ERROR', () => {
  const mapped = mapBridgeHttpFailure(400, { error: 'prompt_content is required' }, 'opencode');
  assert.equal(mapped.unrecoverable, true);
  assert.equal(mapped.errorCode, 'VALIDATION_ERROR');
  assert.match(mapped.message, /prompt_content is required/);
});

test('ENOENT spawn becomes AGENT_BINARY_NOT_FOUND 503', () => {
  const classified = classifySpawnError(Object.assign(new Error('spawn opencode ENOENT'), { code: 'ENOENT' }));
  assert.equal(classified.status, 503);
  assert.equal(classified.errorCode, 'AGENT_BINARY_NOT_FOUND');
  assert.equal(classified.error.includes('ENOENT'), false);
});

test('resolveAgentCommand prefers OPSLY_CLI_AGENT_BIN then npm-global PATH', () => {
  const exists = new Set(['/opt/bin/opencode', '/home/devops/.npm-global/bin/opencode']);
  const resolved = resolveAgentCommand('opencode', {
    env: { HOME: '/home/devops', PATH: '/usr/bin' },
    existsSync: (p) => exists.has(p),
  });
  assert.equal(resolved, '/home/devops/.npm-global/bin/opencode');

  const explicit = resolveAgentCommand('opencode', {
    env: { OPSLY_CLI_AGENT_BIN: '/opt/bin/opencode', HOME: '/home/devops' },
    existsSync: (p) => exists.has(p),
  });
  assert.equal(explicit, '/opt/bin/opencode');
});

test('extraSearchPaths includes npm-global without leaking secrets', () => {
  const paths = extraSearchPaths({ HOME: '/home/devops' });
  assert.ok(paths.includes('/home/devops/.npm-global/bin'));
});

test('redactSecrets strips tokens from errors', () => {
  assert.match(redactSecrets('Authorization Bearer abc.def.ghi'), /Bearer \*\*\*/);
  assert.match(redactSecrets('password=hunter2'), /password=\*\*\*/);
});
