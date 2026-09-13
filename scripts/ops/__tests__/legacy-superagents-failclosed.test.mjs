import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('legacy superagents install is a fail-closed compatibility shim', async () => {
  const source = await readFile('scripts/install-superagents-stack.sh', 'utf8');

  assert.match(source, /DEPRECATED: superagents:install/);
  assert.match(source, /AgentTaskEnvelopeV1/);
  assert.match(source, /exit 2/);
  assert.doesNotMatch(source, /\bnohup\b.*&/);
  assert.doesNotMatch(source, /npm install -g|curl .*\|.*sh|git clone/);
  assert.doesNotMatch(source, /start-agents-autopilot/);
});
