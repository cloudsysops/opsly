import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bridge = readFileSync('scripts/cli-agent-service.ts', 'utf8');
const launcher = readFileSync('scripts/start-agents-autopilot.sh', 'utf8');
const superagents = readFileSync('scripts/superagents-up.sh', 'utf8');
const worker = readFileSync('apps/orchestrator/src/workers/local-agent-http-worker.ts', 'utf8');
const policy = readFileSync('docs/03-agents/EXTERNAL-RUNTIME-POLICY.md', 'utf8');

test('CLI bridge delegates execution to Session Manager instead of direct spawn', () => {
  assert.match(bridge, /createSession/);
  assert.match(bridge, /waitForSessionExit/);
  assert.match(bridge, /stopSession/);
  assert.match(bridge, /opsly-task-/);
  assert.doesNotMatch(bridge, /spawn\(resolved/);
});

test('persistent autonomous agent launchers are disabled', () => {
  assert.match(launcher, /DEPRECATED/);
  assert.match(launcher, /exit 2/);
  // A bare /nohup/ match also fires on the deprecation message itself
  // ("Do not run AI runtimes in nohup loops.") — check for an actual
  // invocation (nohup at the start of a command line) instead.
  assert.doesNotMatch(launcher, /^\s*nohup\s/m);
  assert.doesNotMatch(superagents, /start-agents-autopilot\.sh/);
});

test('local agent worker requires governed AgentTask by default', () => {
  assert.match(worker, /AGENT_TASK_REQUIRED/);
  assert.match(worker, /OPSLY_ALLOW_LEGACY_LOCAL_AGENT_PAYLOAD/);
});

test('canonical policy names real external runtimes and rejects fictional agents', () => {
  assert.match(policy, /does not create fictional AI agents/i);
  assert.match(policy, /Hermes Agent/);
  assert.match(policy, /OpenCode/);
  assert.match(policy, /Codex CLI/);
  assert.match(policy, /Claude Code/);
});
