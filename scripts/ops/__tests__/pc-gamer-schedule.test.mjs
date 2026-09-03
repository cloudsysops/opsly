import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePcGamerSchedule, modeAllows } from '../pc-gamer-schedule.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const cfg = JSON.parse(readFileSync(join(root, 'config/pc-gamer-schedule.json'), 'utf8'));

test('weekday 16:20 is day and allows opencode', () => {
  const resolved = resolvePcGamerSchedule(cfg, { day: 'thu', at: '16:20' });
  assert.equal(resolved.mode, 'day');
  assert.equal(modeAllows(resolved, 'opencode'), true);
  assert.equal(modeAllows(resolved, 'ollama_generate_long'), false);
  assert.deepEqual(resolved.deny_enqueue, ['ollama_generate_long']);
});

test('weekday 19:00 is gaming and blocks opencode', () => {
  const resolved = resolvePcGamerSchedule(cfg, { day: 'thu', at: '19:00' });
  assert.equal(resolved.mode, 'gaming');
  assert.equal(modeAllows(resolved, 'opencode'), false);
  assert.ok(resolved.deny_enqueue.includes('opencode'));
});

test('weekday 02:00 is heavy and allows long generate', () => {
  const resolved = resolvePcGamerSchedule(cfg, { day: 'thu', at: '02:00' });
  assert.equal(resolved.mode, 'heavy');
  assert.equal(modeAllows(resolved, 'opencode'), true);
  assert.equal(modeAllows(resolved, 'ollama_generate_long'), true);
});

test('friday 17:30 is gaming', () => {
  const resolved = resolvePcGamerSchedule(cfg, { day: 'fri', at: '17:30' });
  assert.equal(resolved.mode, 'gaming');
});

test('unknown day/time fails safe to gaming', () => {
  const resolved = resolvePcGamerSchedule({ timezone: 'America/Bogota', modes: {}, weekly: {} }, {
    day: 'mon',
    at: '12:00',
  });
  assert.equal(resolved.mode, 'gaming');
  assert.deepEqual(resolved.allow_enqueue, []);
});
