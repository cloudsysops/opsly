import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function run(args) {
  return spawnSync('python3', ['scripts/ops/pc-gamer-media-runner.py', ...args], {
    encoding: 'utf8',
  });
}

test('media runner exposes help without optional GPU/media binaries', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /gpu-probe/);
  assert.match(result.stdout, /media-probe/);
  assert.match(result.stdout, /transcode/);
  assert.match(result.stdout, /thumbnail/);
});

test('gpu-probe always returns safe JSON and does not require nvidia-smi', () => {
  const result = run(['gpu-probe']);
  assert.equal(result.status, 0);
  const body = JSON.parse(result.stdout);
  assert.equal(body.runtime, 'pc-gamer-media');
  assert.equal(typeof body.gpu.available, 'boolean');
  assert.equal('password' in body, false);
  assert.equal('token' in body, false);
});

test('missing media input fails instead of fabricating output', () => {
  const result = run(['media-probe', '/definitely/not/a/real/file.mp4']);
  assert.notEqual(result.status, 0);
});
