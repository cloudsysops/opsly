import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function dryRun(...args) {
  return spawnSync('bash', ['scripts/ops/pc-gamer-docker-plane.sh', '--dry-run', '--install-autostart', ...args], {
    encoding: 'utf8',
  });
}

test('PC Gamer autostart preserves content mode', () => {
  const result = dryRun('--with-content');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /autostart_exec=.*pc-gamer-docker-plane\.sh --up --with-content/);
});

test('PC Gamer autostart preserves host Ollama mode', () => {
  const result = dryRun('--use-host-ollama');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /autostart_exec=.*pc-gamer-docker-plane\.sh --up --use-host-ollama/);
});

test('PC Gamer autostart preserves combined runtime mode', () => {
  const result = dryRun('--with-content', '--use-host-ollama');
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /autostart_exec=.*pc-gamer-docker-plane\.sh --up --with-content --use-host-ollama/
  );
});
