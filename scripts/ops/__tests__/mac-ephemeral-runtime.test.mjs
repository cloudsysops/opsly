import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dispatcher = readFileSync('scripts/ops/dispatch-prompt-queue.sh', 'utf8');
const installer = readFileSync('scripts/ops/install-mac-ephemeral-runtime-launchd.sh', 'utf8');
const worker = readFileSync('scripts/ops/start-mac-local-agents-worker.sh', 'utf8');

test('dispatcher never launches persistent OpenCode TUI', () => {
  assert.doesNotMatch(dispatcher, /osascript/);
  assert.doesNotMatch(dispatcher, /exec opencode/);
  assert.match(dispatcher, /--seed-only/);
  assert.doesNotMatch(dispatcher, /opsly-agent-cli\.ts start/);
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


test('launchd topology keeps watcher persistent and seeding separate', () => {
  assert.match(installer, /com\.opsly\.prompt-watcher/);
  assert.match(installer, /com\.opsly\.prompt-seed/);
  assert.match(installer, /local-prompt-watcher/);
  assert.match(installer, /dispatch-prompt-queue\.sh --seed-only/);
  assert.doesNotMatch(installer, /com\.opsly\.prompt-queue/);
});

test('canonical installer never hardcodes a founder home directory', () => {
  assert.doesNotMatch(installer, /\/Users\/dragon\//);
  assert.doesNotMatch(installer, /\/Users\/cboteros\//);
});


test('launchd runtime includes the canonical Mac orchestrator starter', () => {
  const source = readFileSync('scripts/ops/install-mac-ephemeral-runtime-launchd.sh', 'utf8');
  assert.match(source, /com\.opsly\.orchestrator-mac/);
  assert.match(source, /\.\/scripts\/ops\/start-orchestrator-mac\.sh/);
});
