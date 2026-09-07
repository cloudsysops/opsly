import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildHeartbeatPayload,
  inferStatusFromHeartbeat,
} from '../pc-gamer-heartbeat-payload.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

test('heartbeat advertises only proven allowlisted capabilities', () => {
  const payload = buildHeartbeatPayload(
    { WORKER_ID: 'pc-gamer-openclaw-01', OPSLY_WORKER_ALLOWLIST: 'ollama,local-agents,content-video' },
    { ollama: true, localAgents: true, ffmpeg: false, now: '2026-09-07T05:00:00Z' }
  );
  assert.equal(payload.workerId, 'pc-gamer-openclaw-01');
  assert.deepEqual(payload.capabilities, ['ollama', 'local-agents']);
  assert.deepEqual(payload.missing, ['content-video']);
  assert.equal(payload.status, 'DEGRADED');
  assert.equal(payload.lastHeartbeat, '2026-09-07T05:00:00Z');
});

test('heartbeat is ONLINE when proven caps match allowlist', () => {
  const payload = buildHeartbeatPayload(
    { OPSLY_WORKER_ALLOWLIST: 'ollama,local-agents' },
    { ollama: true, localAgents: true, ffmpeg: false }
  );
  assert.equal(payload.status, 'ONLINE');
  assert.deepEqual(payload.capabilities, ['ollama', 'local-agents']);
});

test('heartbeat is BUSY when jobs are active and probes are healthy', () => {
  const payload = buildHeartbeatPayload(
    { OPSLY_WORKER_ALLOWLIST: 'ollama', WORKER_ACTIVE_JOBS: '1' },
    { ollama: true, localAgents: false, ffmpeg: false }
  );
  assert.equal(payload.status, 'BUSY');
});

test('inferStatusFromHeartbeat treats empty as OFFLINE and ISO as ONLINE', () => {
  assert.equal(inferStatusFromHeartbeat(''), 'OFFLINE');
  assert.equal(inferStatusFromHeartbeat('2026-09-07T05:00:00Z'), 'ONLINE');
  assert.equal(inferStatusFromHeartbeat('{"status":"DEGRADED"}'), 'DEGRADED');
  assert.equal(inferStatusFromHeartbeat('{"status":"ONLINE"}', { ttlSeconds: 0 }), 'OFFLINE');
});

test('safe autostart unit uses host Ollama and no content-video', () => {
  const script = readFileSync(join(root, 'scripts/ops/pc-gamer-docker-plane.sh'), 'utf8');
  assert.match(script, /up -d --no-deps --no-recreate/);
  assert.match(script, /opsly-pc-gamer-worker\.service/);
  assert.match(script, /opsly-pc-gamer-wsl-keepalive\.service/);
  assert.match(script, /opsly-pc-gamer-worker-down\.service/);
  assert.match(script, /--up --use-host-ollama/);
  assert.doesNotMatch(
    script,
    /ExecStart=\$\{ROOT\}\/scripts\/ops\/pc-gamer-docker-plane\.sh --up --with-content/
  );
  assert.doesNotMatch(
    script,
    /ExecStop=\$\{ROOT\}\/scripts\/ops\/pc-gamer-docker-plane\.sh --down/
  );
});
