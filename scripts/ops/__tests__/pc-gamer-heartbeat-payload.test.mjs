import assert from 'node:assert/strict';
import test from 'node:test';

import { collectStreamingStatus, buildHeartbeatPayload } from '../pc-gamer-heartbeat-payload.mjs';

function envWith(overrides = {}) {
  return { WORKER_ID: 'test-worker', ...overrides };
}

test('omits streaming entirely when OBS is not reachable', async () => {
  const result = await collectStreamingStatus(envWith(), {
    probePort: async () => false,
    obsAction: async () => {
      throw new Error('must not be called when OBS is unreachable');
    },
  });
  assert.equal(result, undefined);
});

test('omits streaming entirely when disabled via env', async () => {
  let probeCalled = false;
  const result = await collectStreamingStatus(
    envWith({ OPSLY_HEARTBEAT_INCLUDE_STREAMING: 'false' }),
    {
      probePort: async () => {
        probeCalled = true;
        return true;
      },
    }
  );
  assert.equal(result, undefined);
  assert.equal(probeCalled, false);
});

test('reports live=true with uptime and configured platforms when OBS is live', async () => {
  const result = await collectStreamingStatus(
    envWith({ OPSLY_STREAM_PLATFORMS: 'Twitch, tiktok ,youtube' }),
    {
      probePort: async () => true,
      obsAction: async (action, scopes) => {
        assert.equal(action, 'get_stream_status');
        assert.deepEqual(scopes, ['OBS_READ']);
        return { outputActive: true, outputDuration: 65_000 };
      },
    }
  );

  assert.equal(result.live, true);
  assert.equal(result.uptimeSec, 65);
  assert.deepEqual(result.platforms, ['twitch', 'tiktok', 'youtube']);
  assert.equal(result.sceneName, null);
});

test('reports live=false with no uptime when OBS is reachable but not streaming', async () => {
  const result = await collectStreamingStatus(envWith(), {
    probePort: async () => true,
    obsAction: async () => ({ outputActive: false, outputDuration: 0 }),
  });

  assert.equal(result.live, false);
  assert.equal(result.uptimeSec, null);
});

test('never includes scene name unless explicitly opted in', async () => {
  let sceneActionCalled = false;
  const result = await collectStreamingStatus(envWith(), {
    probePort: async () => true,
    obsAction: async (action) => {
      if (action === 'get_current_program_scene') sceneActionCalled = true;
      return { outputActive: true, outputDuration: 1000 };
    },
  });

  assert.equal(result.sceneName, null);
  assert.equal(sceneActionCalled, false);
});

test('includes a truncated scene name when explicitly opted in', async () => {
  const result = await collectStreamingStatus(
    envWith({ OPSLY_STREAM_EXPOSE_SCENE: 'true' }),
    {
      probePort: async () => true,
      obsAction: async (action) => {
        if (action === 'get_stream_status') return { outputActive: true, outputDuration: 1000 };
        if (action === 'get_current_program_scene') {
          return { currentProgramSceneName: 'a'.repeat(200) };
        }
        throw new Error(`unexpected action ${action}`);
      },
    }
  );

  assert.equal(result.sceneName?.length, 80);
});

test('omits streaming (never throws) when the OBS adapter call fails', async () => {
  const result = await collectStreamingStatus(envWith(), {
    probePort: async () => true,
    obsAction: async () => {
      throw new Error('OBS WebSocket auth failed');
    },
  });
  assert.equal(result, undefined);
});

test('buildHeartbeatPayload folds the streaming block into the full payload', async () => {
  const payload = await buildHeartbeatPayload(envWith(), {
    probePort: async () => true,
    obsAction: async () => ({ outputActive: true, outputDuration: 10_000 }),
  });

  assert.equal(payload.workerId, 'test-worker');
  assert.equal(payload.streaming.live, true);
  assert.equal(payload.streaming.uptimeSec, 10);
});

test('buildHeartbeatPayload stays valid JSON with streaming omitted', async () => {
  const payload = await buildHeartbeatPayload(envWith(), {
    probePort: async () => false,
  });

  assert.equal('streaming' in payload, false);
  assert.doesNotThrow(() => JSON.stringify(payload));
});
