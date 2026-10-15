import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultStudioState, validateStudioState, releaseEnabled, STUDIO_STATE_PATHS, STUDIO_STATE_VERSION,
} from '../studio-state.mjs';

const ev = (source = 'test') => ({ source, at: '2026-10-12T10:21:00Z' });

test('default state is valid and everything is unknown', () => {
  const s = defaultStudioState();
  assert.equal(s.version, STUDIO_STATE_VERSION);
  assert.deepEqual(validateStudioState(s), { ok: true, errors: [] });
  assert.equal(s.mode, 'UNKNOWN');
  assert.equal(s.stage, 'UNKNOWN');
  assert.equal(s.humanApproval, 'UNKNOWN');
  assert.deepEqual(s.agents, { claude: 'UNKNOWN', opencode: 'UNKNOWN', music: 'UNKNOWN', reviewer: 'UNKNOWN' });
  assert.equal(s.track.title, null);
  assert.equal(s.audio.masterDb, null);
  assert.deepEqual(s.events, []);
  assert.deepEqual(s.evidence, {});
});

test('defaults are fresh objects, not shared', () => {
  const a = defaultStudioState();
  a.track.title = 'x';
  assert.equal(defaultStudioState().track.title, null);
});

test('a known value without evidence is rejected', () => {
  const s = defaultStudioState();
  s.track.bpm = 124;
  const r = validateStudioState(s);
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /track\.bpm: value without evidence/);
});

test('a known value with evidence is accepted', () => {
  const s = defaultStudioState();
  s.track.bpm = 124;
  s.evidence['track.bpm'] = ev('nowplaying');
  assert.equal(validateStudioState(s).ok, true);
});

test('invalid ranges and enums are rejected', () => {
  for (const [path, value] of [['energy', 1.4], ['track.bpm', 5], ['stage', 'DANCE'], ['agents.music', 'RUNNING'], ['stream.droppedFrames', 1.5]]) {
    const s = defaultStudioState();
    const keys = path.split('.');
    const last = keys.pop();
    keys.reduce((o, k) => o[k], s)[last] = value;
    s.evidence[path] = ev();
    assert.equal(validateStudioState(s).ok, false, path);
  }
});

test('evidence for unknown paths and extra keys are rejected', () => {
  const s = defaultStudioState();
  s.evidence['world.lighting'] = ev();
  s.world = { lighting: 'MIX' };
  const r = validateStudioState(s);
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /unexpected key: world/);
  assert.match(r.errors.join('\n'), /evidence for unknown path: world\.lighting/);
});

test('events need source, time and text', () => {
  const s = defaultStudioState();
  s.events.push({ at: '2026-10-12T10:21:00Z', text: 'Music Agent started' });
  assert.equal(validateStudioState(s).ok, false);
  s.events[0].source = 'music-agent';
  assert.equal(validateStudioState(s).ok, true);
});

test('release is disabled unless a valid human approval exists', () => {
  const s = defaultStudioState();
  assert.equal(releaseEnabled(s), false);
  s.humanApproval = 'PENDING';
  s.evidence.humanApproval = ev('operator');
  assert.equal(releaseEnabled(s), false);
  s.humanApproval = 'APPROVED';
  assert.equal(releaseEnabled(s), false, 'APPROVED without approvalEvidence');
  s.approvalEvidence = { by: 'operator', at: '2026-10-12T10:30:00Z', ref: 'approval-1' };
  assert.equal(releaseEnabled(s), true);
  s.humanApproval = 'PENDING';
  assert.equal(validateStudioState(s).ok, false, 'approvalEvidence only valid with APPROVED');
});

test('non-objects are rejected', () => {
  for (const bad of [null, 'x', 3, []]) assert.equal(validateStudioState(bad).ok, false);
});

test('every contract path starts unknown', () => {
  const s = defaultStudioState();
  for (const p of STUDIO_STATE_PATHS) {
    const v = p.split('.').reduce((o, k) => o[k], s);
    assert.ok(v === null || v === 'UNKNOWN', p);
  }
});
