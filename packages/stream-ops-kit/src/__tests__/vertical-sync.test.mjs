import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetVerticalScene, applyOnce } from '../vertical-sync.mjs';

const CFG = { canvas: 'Aitum Vertical', map: { 'Battlefield 6': 'V_GAMING', 'AI Factory — Hacker': 'V_FACTORY_FOCUS' } };

// OBS falso: guarda las llamadas y simula el vendor del canvas vertical.
function fakeObs({ current = 'V_GAMING', scenes = ['V_GAMING', 'V_FACTORY_FOCUS', 'V_CODING'], failSwitch = false } = {}) {
  const calls = [];
  let cur = current;
  const req = async (type, data) => {
    assert.equal(type, 'CallVendorRequest');
    assert.equal(data.vendorName, 'aitum-stream-suite');
    calls.push(data.requestType);
    if (data.requestType === 'get_scenes') return { responseData: { success: true, scenes: scenes.map((name) => ({ name })) } };
    if (data.requestType === 'current_scene') return { responseData: { success: true, scene: cur } };
    if (data.requestType === 'switch_scene') { if (!failSwitch) cur = data.requestData.scene; return { responseData: { success: true } }; }
    throw new Error('peticion inesperada');
  };
  return { req, calls };
}

test('maps only known horizontal scenes', () => {
  assert.equal(targetVerticalScene(CFG.map, 'AI Factory — Hacker'), 'V_FACTORY_FOCUS');
  assert.equal(targetVerticalScene(CFG.map, 'Vuelvo en un momento'), null);
  assert.equal(targetVerticalScene(undefined, 'x'), null);
  assert.equal(targetVerticalScene(CFG.map, 'toString'), null, 'no hereda de Object.prototype');
});

test('switches the vertical scene when the horizontal one has no game', async () => {
  const { req, calls } = fakeObs({ current: 'V_GAMING' });
  const r = await applyOnce(req, CFG, 'AI Factory — Hacker');
  assert.equal(r.action, 'switched');
  assert.deepEqual([r.from, r.target], ['V_GAMING', 'V_FACTORY_FOCUS']);
  assert.ok(calls.includes('switch_scene'));
});

test('does nothing when the vertical scene is already right, the scene is unmapped, or in dry mode', async () => {
  let o = fakeObs({ current: 'V_GAMING' });
  assert.equal((await applyOnce(o.req, CFG, 'Battlefield 6')).action, 'unchanged');
  assert.ok(!o.calls.includes('switch_scene'));
  o = fakeObs();
  assert.equal((await applyOnce(o.req, CFG, 'Vuelvo en un momento')).action, 'unmapped');
  assert.deepEqual(o.calls, [], 'sin mapa ni siquiera consulta a OBS');
  o = fakeObs({ current: 'V_GAMING' });
  assert.equal((await applyOnce(o.req, CFG, 'AI Factory — Hacker', { dry: true })).action, 'dry');
  assert.ok(!o.calls.includes('switch_scene'));
});

test('refuses to switch to a scene that does not exist in the vertical canvas', async () => {
  const o = fakeObs({ scenes: ['V_GAMING'] });
  const r = await applyOnce(o.req, CFG, 'AI Factory — Hacker');
  assert.equal(r.action, 'unknown-target');
  assert.ok(!o.calls.includes('switch_scene'));
});

test('reports when the switch is not confirmed', async () => {
  const o = fakeObs({ failSwitch: true });
  assert.equal((await applyOnce(o.req, CFG, 'AI Factory — Hacker', { confirmDelayMs: 0 })).action, 'switch-not-confirmed');
});
