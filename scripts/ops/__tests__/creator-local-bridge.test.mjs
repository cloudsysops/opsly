import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCreatorLocalBridge,
  isLoopbackHost,
} from '../creator-local-bridge.mjs';

test('Creator Local Bridge only accepts loopback hosts', () => {
  assert.equal(isLoopbackHost('127.0.0.1'), true);
  assert.equal(isLoopbackHost('::1'), true);
  assert.equal(isLoopbackHost('0.0.0.0'), false);

  assert.throws(
    () => createCreatorLocalBridge({ host: '0.0.0.0', token: 'a'.repeat(48) }),
    /must bind to loopback/,
  );
});

test('Creator Local Bridge requires auth for capability data and rotates tokens', async () => {
  const initialToken = 'a'.repeat(48);
  const bridge = createCreatorLocalBridge({
    host: '127.0.0.1',
    port: 0,
    token: initialToken,
    capabilities: ['bridge.read'],
  });

  const info = await bridge.start();

  try {
    const health = await fetch(`${info.url}/health`);
    assert.equal(health.status, 200);
    const healthBody = await health.json();
    assert.equal(healthBody.binding, 'loopback');
    assert.equal(healthBody.sessionId, info.sessionId);

    const anonymous = await fetch(`${info.url}/v1/capabilities`);
    assert.equal(anonymous.status, 401);

    const authorized = await fetch(`${info.url}/v1/capabilities`, {
      headers: { authorization: `Bearer ${initialToken}` },
    });
    assert.equal(authorized.status, 200);

    const rotatedToken = 'b'.repeat(48);
    bridge.rotateToken(rotatedToken);

    const stale = await fetch(`${info.url}/v1/capabilities`, {
      headers: { authorization: `Bearer ${initialToken}` },
    });
    assert.equal(stale.status, 401);

    const rotated = await fetch(`${info.url}/v1/capabilities`, {
      headers: { authorization: `Bearer ${rotatedToken}` },
    });
    assert.equal(rotated.status, 200);
  } finally {
    await bridge.close();
  }
});

test('Creator Local Bridge enforces capability grants', async () => {
  const token = 'c'.repeat(48);
  const bridge = createCreatorLocalBridge({
    host: '127.0.0.1',
    port: 0,
    token,
    capabilities: [],
  });

  const info = await bridge.start();

  try {
    const response = await fetch(`${info.url}/v1/capabilities`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 403);
  } finally {
    await bridge.close();
  }
});
