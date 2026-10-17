import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  dueAt, isDue, dayKey, publishedToday, autoApproveBlockers, approveEntries, selectNext, runPublisher, PUBLISH_DEFAULTS,
} from '../publisher.mjs';
import { redact, toLocalPath, hashtagsOf, titleFrom } from '../publisher-util.mjs';

const TZ = 'America/New_York';
// 2026-10-16 19:00 en Nueva York (EDT, UTC-4) = 2026-10-16T23:00Z
const AFTER = Date.parse('2026-10-16T23:30:00Z');
const BEFORE = Date.parse('2026-10-16T22:30:00Z');

const entry = (over = {}) => ({
  id: 's-01', scheduledAt: '2026-10-16T19:00', timezone: TZ, platforms: ['youtube_shorts'], status: 'approved',
  vertical: 'D:\\x\\a.mp4', caption: 'Clip del directo #gaming', warnings: [], publishedAt: null, ...over,
});
const tmpQueue = (q) => { const f = path.join(os.tmpdir(), `pq-${Date.now()}-${Math.random().toString(16).slice(2)}.json`); fs.writeFileSync(f, JSON.stringify(q)); return f; };
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const okAdapter = (calls = []) => ({ ready: () => ({ ok: true }), publish: async (e) => { calls.push(e.id); return { id: 'vid1', url: 'https://y/1' }; } });

test('due time is computed in the entry timezone', () => {
  assert.equal(dueAt(entry()), Date.parse('2026-10-16T23:00:00Z'));
  assert.equal(isDue(entry(), BEFORE), false);
  assert.equal(isDue(entry(), AFTER), true);
  assert.equal(dayKey(Date.parse('2026-10-17T02:00:00Z'), TZ), '2026-10-16', 'las 22:00 de Nueva York siguen siendo el dia 16');
});

test('drafts are never published unless explicitly approved or auto-approve passes its checks', () => {
  const q = [entry({ status: 'draft' })];
  assert.equal(selectNext(q, { nowMs: AFTER }), null);
  assert.equal(selectNext(q, { nowMs: AFTER, policy: { ...PUBLISH_DEFAULTS, autoApprove: true }, exists: () => true })?.id, 's-01');
  assert.equal(selectNext(q, { nowMs: AFTER, policy: { ...PUBLISH_DEFAULTS, autoApprove: true }, exists: () => false }), null, 'archivo ausente bloquea la autoaprobacion');
  assert.deepEqual(autoApproveBlockers(entry({ vertical: null, warnings: ['NO_VERTICAL: x'] }), { exists: () => true }).sort(), ['NO_VERTICAL', 'sin video vertical']);
  assert.equal(approveEntries(q, ['s-01']), 1);
  assert.equal(q[0].status, 'approved');
  assert.equal(approveEntries(q, 'all'), 0, 'no reaprueba lo ya aprobado');
});

test('nothing is published before its scheduled time', async () => {
  const f = tmpQueue([entry()]);
  const calls = [];
  assert.equal((await runPublisher({ queueFile: f, adapters: { youtube_shorts: okAdapter(calls) }, nowMs: BEFORE })).action, 'nothing-due');
  assert.deepEqual(calls, []);
});

test('publishes an approved due entry once, records the result and never re-uploads', async () => {
  const f = tmpQueue([entry()]);
  const calls = [];
  const adapters = { youtube_shorts: okAdapter(calls) };
  const r = await runPublisher({ queueFile: f, adapters, nowMs: AFTER });
  assert.deepEqual([r.action, r.status], ['ran', 'published']);
  const q = read(f);
  assert.equal(q[0].platformStatus.youtube_shorts.state, 'published');
  assert.equal(q[0].platformStatus.youtube_shorts.url, 'https://y/1');
  assert.ok(q[0].publishedAt);
  await runPublisher({ queueFile: f, adapters, nowMs: AFTER + 3600_000 });
  assert.deepEqual(calls, ['s-01'], 'una sola subida');
});

test('daily cap stops a second entry the same day', async () => {
  const f = tmpQueue([entry(), entry({ id: 's-02' })]);
  const calls = [];
  const adapters = { youtube_shorts: okAdapter(calls) };
  await runPublisher({ queueFile: f, adapters, nowMs: AFTER });
  const r = await runPublisher({ queueFile: f, adapters, nowMs: AFTER + 60_000 });
  assert.equal(r.action, 'cap-reached');
  assert.deepEqual(calls, ['s-01']);
  assert.equal(publishedToday(read(f), AFTER + 60_000, TZ), 1);
});

test('kill switch and dry-run upload nothing', async () => {
  const f = tmpQueue([entry()]);
  const calls = [];
  const adapters = { youtube_shorts: okAdapter(calls) };
  assert.equal((await runPublisher({ queueFile: f, adapters, nowMs: AFTER, killSwitch: true })).action, 'disabled');
  assert.equal((await runPublisher({ queueFile: f, adapters, nowMs: AFTER, dry: true })).action, 'dry');
  assert.deepEqual(calls, []);
  assert.equal(read(f)[0].status, 'approved', 'dry-run no cambia el estado');
});

test('missing credentials upload nothing and do not burn attempts', async () => {
  const f = tmpQueue([entry()]);
  const adapters = { youtube_shorts: { ready: () => ({ ok: false, missing: ['TOKEN'] }), publish: async () => { throw new Error('no debe llamarse'); } } };
  const r = await runPublisher({ queueFile: f, adapters, nowMs: AFTER });
  assert.equal(r.status, 'approved');
  const q = read(f);
  assert.equal(q[0].platformStatus.youtube_shorts.state, 'missing-credentials');
  assert.equal(q[0].attempts ?? 0, 0);
});

test('a failing platform is retried up to the limit, then marked failed, with the token redacted', async () => {
  const f = tmpQueue([entry({ platforms: ['youtube_shorts', 'tiktok'] })]);
  const adapters = {
    youtube_shorts: { ready: () => ({ ok: true }), publish: async () => ({ id: 'v', url: 'u' }) },
    tiktok: { ready: () => ({ ok: true }), publish: async () => { throw new Error('HTTP 500 Bearer abc123def456ghi789'); } },
  };
  let r = await runPublisher({ queueFile: f, adapters, nowMs: AFTER });
  assert.equal(r.status, 'partial');
  let q = read(f);
  assert.equal(q[0].platformStatus.youtube_shorts.state, 'published', 'lo ya subido se conserva');
  assert.doesNotMatch(q[0].platformStatus.tiktok.error, /abc123def456/);
  for (let i = 0; i < 3; i++) r = await runPublisher({ queueFile: f, adapters, nowMs: AFTER + (i + 1) * 3600_000 });
  q = read(f);
  assert.equal(q[0].attempts, PUBLISH_DEFAULTS.maxAttempts);
  assert.equal(q[0].status, 'failed');
});

test('platforms without an adapter are skipped and do not block completion', async () => {
  const f = tmpQueue([entry({ platforms: ['youtube_shorts', 'instagram_reels'] })]);
  const r = await runPublisher({ queueFile: f, adapters: { youtube_shorts: okAdapter() }, nowMs: AFTER });
  assert.equal(r.status, 'published');
  assert.equal(read(f)[0].platformStatus.instagram_reels.state, 'skipped');
});

test('utilities: redaction, path translation, hashtags and Shorts titles', () => {
  assert.doesNotMatch(redact('Authorization: Bearer ya29.A0AbCdEfGhIjKlMn'), /ya29/);
  assert.doesNotMatch(redact('refresh_token=1//0gABCDEFGHIJKLMNOP'), /1\/\/0g/);
  assert.equal(toLocalPath('D:\\Content\\PostStream\\a b.mp4', 'linux'), '/mnt/d/Content/PostStream/a b.mp4');
  assert.equal(toLocalPath('/home/x/a.mp4', 'linux'), '/home/x/a.mp4');
  assert.equal(toLocalPath('D:\\a.mp4', 'win32'), 'D:\\a.mp4');
  assert.deepEqual(hashtagsOf('Clip #Gaming #twitch #gaming'), ['gaming', 'twitch']);
  assert.equal(titleFrom({ caption: 'Clip del directo de OpsAfterDark 🎮 Live: twitch.tv/x #gaming #twitch' }), 'Clip del directo de OpsAfterDark 🎮 #shorts');
  assert.ok(titleFrom({ title: 'x'.repeat(300) }).length <= 100);
});
