import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('Mac worker never claims local_opencode; Gamer is its canonical worker', () => {
  const mac = read('scripts/ops/start-mac-local-agents-worker.sh');
  const gamer = read('scripts/ops/pc-gamer-opencode-plane.sh');

  const macKinds = mac.match(/OPSLY_LOCAL_AGENT_KINDS="\$\{OPSLY_LOCAL_AGENT_KINDS:-([^}]+)\}"/);
  assert.ok(macKinds, 'Mac default local-agent kinds must be explicit');
  assert.doesNotMatch(macKinds[1], /local_opencode/);

  assert.match(gamer, /OPSLY_LOCAL_AGENT_KINDS=local_opencode/);
  assert.match(gamer, /local-agents/);
});

test('real CLI runtimes remain ephemeral and persistent launchers stay disabled', () => {
  const bridge = read('scripts/cli-agent-service.ts');
  const autopilot = read('scripts/start-agents-autopilot.sh');
  const superagents = read('scripts/superagents-up.sh');

  assert.match(bridge, /createSession/);
  assert.match(bridge, /waitForSessionExit/);
  assert.match(bridge, /stopSession/);
  assert.match(bridge, /opsly-task-/);
  assert.doesNotMatch(bridge, /spawn\(resolved/);

  assert.match(autopilot, /DEPRECATED/);
  assert.match(autopilot, /exit 2/);
  assert.doesNotMatch(autopilot, /^\s*nohup\s/m);
  assert.doesNotMatch(superagents, /start-agents-autopilot\.sh/);
});

test('all clean orchestrator/API image and release paths build ai-board', () => {
  const orchestratorDocker = read('apps/orchestrator/Dockerfile');
  const apiDocker = read('apps/api/Dockerfile');
  const hermesDocker = read('Dockerfile.hermes');
  const worker = read('scripts/run-orchestrator-worker.sh');
  const releaseGate = read('scripts/ci/release-gate.sh');

  assert.match(orchestratorDocker, /build -w @intcloudsysops\/ai-board/);
  assert.match(orchestratorDocker, /lib\/ai-board\/dist/);

  assert.match(apiDocker, /-w @intcloudsysops\/ai-board/);
  assert.match(apiDocker, /build -w @intcloudsysops\/ai-board/);

  assert.match(hermesDocker, /build -w @intcloudsysops\/ai-board/);
  assert.match(hermesDocker, /lib\/ai-board\/dist/);

  assert.match(worker, /build --workspace=@intcloudsysops\/ai-board/);
  assert.match(releaseGate, /lib\/ai-board && npm run build/);
});

test('Hermes image builds fail closed in main and staging deploy pipelines', () => {
  const deploy = read('.github/workflows/deploy.yml');

  for (const name of ['Build and push Hermes image', 'Build and push Hermes image (staging)']) {
    const start = deploy.indexOf(`- name: ${name}`);
    assert.notEqual(start, -1, `missing deploy step: ${name}`);
    const tail = deploy.slice(start, start + 300);
    assert.doesNotMatch(tail, /continue-on-error:\s*true/);
    assert.match(tail, /Dockerfile\.hermes/);
  }
});
