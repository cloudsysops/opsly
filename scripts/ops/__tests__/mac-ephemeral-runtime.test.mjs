import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dispatcher = readFileSync('scripts/ops/dispatch-prompt-queue.sh', 'utf8');
const installer = readFileSync('scripts/ops/install-mac-ephemeral-runtime-launchd.sh', 'utf8');
const worker = readFileSync('scripts/ops/start-mac-local-agents-worker.sh', 'utf8');

test('dispatcher never launches persistent OpenCode TUI', () => {
  assert.doesNotMatch(dispatcher, /osascript/);
  assert.doesNotMatch(dispatcher, /exec opencode/);
  assert.match(dispatcher, /local-prompt-watcher:once/);
});

test('launchd installer derives paths dynamically', () => {
  assert.match(installer, /command -v doppler/);
  assert.match(installer, /command -v node/);
  assert.doesNotMatch(installer, /\/Users\/dragon\//);
  assert.doesNotMatch(installer, /v22\.22\.3/);
});

test('persistent Mac worker is control infrastructure only', () => {
  assert.match(worker, /OPSLY_WORKER_ALLOWLIST=local-agents/);
  assert.match(worker, /OPSLY_AUTONOMOUS_SCHEDULER_ENABLED=false/);
  assert.match(worker, /OPSLY_CLI_AGENT_TOKEN/);
});
