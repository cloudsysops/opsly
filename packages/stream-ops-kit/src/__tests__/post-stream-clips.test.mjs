import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stampOf, pairRecordings, isFinished, scoreWindows, pickWindows, isVerticalBlank, hms, renderReport, scheduleQueue, readJson, loadSpectateTemplate, spectateScore, isSpectating, DEFAULTS, stampToSeconds, PAIR_TOLERANCE_SECONDS, parseFreezeSeconds, FROZEN_MAX_SHARE,
} from '../post-stream-clips.mjs';

test('pairs horizontal and vertical recordings by OBS timestamp', () => {
  const h = ['D:\\o\\h\\2026-10-11_17-49-34_OpsAfterDark_H1920x1080.mkv', 'D:\\o\\h\\2026-10-11_20-37-36_OpsAfterDark_H1920x1080.mkv'];
  const v = ['D:\\o\\v\\2026-10-11_20-37-36_OpsAfterDark_V1080x1920.mkv'];
  const p = pairRecordings(h, v);
  assert.equal(p[0].v, null);
  assert.equal(p[1].v, v[0]);
  assert.equal(stampOf(h[0]), '2026-10-11_17-49-34');
  assert.equal(stampOf('random.mkv'), null);
});

test('pairs a vertical that started a few minutes later and reports the offset', () => {
  const h = ['D:\\o\\h\\2026-10-16_19-57-41_OpsAfterDark_H1920x1080.mkv'];
  const v = ['D:\\o\\v\\2026-10-16_20-00-51_OpsAfterDark_V1080x1920.mkv'];
  const [p] = pairRecordings(h, v);
  assert.equal(p.v, v[0]);
  assert.equal(p.offsetSeconds, 190);
});

test('does not pair verticals that are too far away, earlier than the horizontal, or already used', () => {
  const h = ['x/2026-10-16_19-57-41_H.mkv', 'x/2026-10-16_19-58-00_H.mkv'];
  assert.equal(pairRecordings(h, ['y/2026-10-16_20-30-00_V.mkv'])[0].v, null, 'mas de 10 min despues');
  assert.equal(pairRecordings(h, ['y/2026-10-16_19-50-00_V.mkv'])[0].v, null, 'empezo antes que el horizontal');
  const two = pairRecordings(h, ['y/2026-10-16_20-00-51_V.mkv']);
  assert.equal(two[0].v, 'y/2026-10-16_20-00-51_V.mkv');
  assert.equal(two[1].v, null, 'una vertical no se reutiliza');
  assert.equal(PAIR_TOLERANCE_SECONDS, 600);
});

test('stampToSeconds parses OBS stamps and rejects anything else', () => {
  assert.equal(stampToSeconds('2026-10-16_20-00-51') - stampToSeconds('2026-10-16_19-57-41'), 190);
  assert.equal(stampToSeconds('nope'), null);
  assert.equal(stampToSeconds(null), null);
});

test('freezedetect output is turned into frozen seconds, including a freeze that lasts until the end', () => {
  const closed = '[freezedetect @ 0x1] lavfi.freezedetect.freeze_start: 2.5\n[freezedetect @ 0x1] lavfi.freezedetect.freeze_duration: 10\n[freezedetect @ 0x1] lavfi.freezedetect.freeze_end: 12.5\n';
  assert.equal(parseFreezeSeconds(closed, 45), 10);
  const open = '[freezedetect @ 0x1] lavfi.freezedetect.freeze_start: 0\n';
  assert.equal(parseFreezeSeconds(open, 45), 45);
  assert.equal(parseFreezeSeconds('nada que ver', 45), 0);
  assert.equal(FROZEN_MAX_SHARE, 0.3);
});

test('a file is finished only after it has been quiet long enough', () => {
  const now = 1_000_000_000;
  assert.equal(isFinished({ mtimeMs: now - 60_000 }, now), false);
  assert.equal(isFinished({ mtimeMs: now - DEFAULTS.quietMs }, now), true);
});

function synthetic(n, hot) {
  // fondo plano y silencioso, con una zona (hot) ruidosa y con movimiento
  const audioDb = Array.from({ length: n }, (_, s) => (s >= hot[0] && s < hot[1] ? -15 : -40));
  const motion = Array.from({ length: n }, (_, s) => (s >= hot[0] && s < hot[1] ? 30 : 2));
  const black = Array.from({ length: n }, () => 0);
  return { audioDb, motion, black };
}

test('picks the loud, moving window and ignores flat stretches', () => {
  const s = synthetic(1200, [600, 700]);
  const picked = pickWindows(scoreWindows(s), { count: 1 });
  assert.equal(picked.length, 1);
  assert.ok(picked[0].t >= 580 && picked[0].t <= 660, `t=${picked[0].t}`);
});

test('never picks windows with black frames or silence', () => {
  const s = synthetic(1200, [600, 700]);
  for (let i = 600; i < 700; i++) s.black[i] = 1; // la zona buena esta en negro
  const picked = pickWindows(scoreWindows(s), { count: 3 });
  assert.ok(picked.every((w) => w.t + DEFAULTS.clipSeconds <= 600 || w.t >= 700), 'no overlaps the black zone');
  const silent = synthetic(1200, [600, 700]);
  silent.audioDb.fill(-120);
  assert.equal(pickWindows(scoreWindows(silent), { count: 3 }).length, 0);
});

test('picked windows respect the minimum gap', () => {
  const s = synthetic(3000, [0, 3000]);
  s.audioDb = s.audioDb.map((_, i) => -20 - (i % 7));
  s.motion = s.motion.map((_, i) => 10 + (i % 13));
  const picked = pickWindows(scoreWindows(s), { count: 6 });
  for (let i = 1; i < picked.length; i++) assert.ok(picked[i].t - picked[i - 1].t >= DEFAULTS.clipSeconds + DEFAULTS.minGapSeconds);
});

test('edges of the recording are excluded', () => {
  const s = synthetic(1200, [0, 40]);
  const picked = pickWindows(scoreWindows(s), { count: 6 });
  assert.ok(picked.every((w) => w.t >= DEFAULTS.edgeSeconds));
});

test('vertical blank detector separates the known bad clip from good ones', () => {
  assert.equal(isVerticalBlank([27.9998, 27.9998, 27.9998, 27.9998]), true); // medido en el clip malo real
  assert.equal(isVerticalBlank([94.4, 76.4, 145.9, 141.4, 153.8]), false); // medido en un clip bueno real
  assert.equal(isVerticalBlank([86.9, 104.2, 89.7, 118.7]), false); // escena oscura legitima
  assert.equal(isVerticalBlank([]), true);
});

test('queue schedules 1 clip per day after today, best first, only clips with a clean vertical', () => {
  const result = {
    stamp: '2026-10-11_17-49-34',
    warnings: ['MIC_SILENT: x'],
    clips: [
      { id: '01', startHms: '00:10:00', score: 0.6, horizontal: 'h1', vertical: 'v1', flags: [] },
      { id: '02', startHms: '00:20:00', score: 0.9, horizontal: 'h2', vertical: 'v2', flags: [] },
      { id: '03', startHms: '00:30:00', score: 0.95, horizontal: 'h3', vertical: null, flags: ['VERTICAL_BLANK_REJECTED'] },
    ],
  };
  const { entries, horizontalOnly } = scheduleQueue([], result, { todayIso: '2026-10-15' });
  assert.deepEqual(entries.map((e) => e.id), ['2026-10-11_17-49-34-02', '2026-10-11_17-49-34-01']);
  assert.deepEqual(entries.map((e) => e.scheduledAt), ['2026-10-16T19:00', '2026-10-17T19:00']);
  assert.ok(entries.every((e) => e.status === 'draft' && e.requiresApproval === true && e.publishedAt === null));
  assert.deepEqual(horizontalOnly, ['2026-10-11_17-49-34-03']);
});

test('queue continues after the last scheduled day and never schedules in the past', () => {
  const existing = [{ scheduledAt: '2026-10-20T19:00' }];
  const r = { stamp: 's', warnings: [], clips: [{ id: '01', startHms: '00:10:00', score: 1, horizontal: 'h', vertical: 'v', flags: [] }] };
  assert.equal(scheduleQueue(existing, r, { todayIso: '2026-10-15' }).entries[0].scheduledAt, '2026-10-21T19:00');
  assert.equal(scheduleQueue([{ scheduledAt: '2026-10-01T19:00' }], r, { todayIso: '2026-10-15' }).entries[0].scheduledAt, '2026-10-16T19:00');
});

const TEMPLATE = new URL('../../../../apps/opsafterdark/stream-overlay/spectate-template.json', import.meta.url);

test('spectate detector: the real label matches, bright backgrounds and shifted labels do not', async () => {
  const { fileURLToPath } = await import('node:url');
  const t = loadSpectateTemplate(fileURLToPath(TEMPLATE));
  assert.ok(t && t.maskPixels > 300);
  const size = t.w * t.h;
  const label = new Uint8Array(size).fill(40);
  for (let i = 0; i < size; i++) if (t.mask[i]) label[i] = 255;
  assert.equal(isSpectating(spectateScore(label, t)), true, 'etiqueta real');
  assert.equal(isSpectating(spectateScore(new Uint8Array(size).fill(255), t)), false, 'fondo brillante (nieve/cielo)');
  assert.equal(isSpectating(spectateScore(new Uint8Array(size).fill(10), t)), false, 'fondo oscuro');
  const shifted = new Uint8Array(size).fill(40);
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) if (t.mask[y * t.w + x]) shifted[y * t.w + Math.min(t.w - 1, x + 6)] = 255;
  assert.equal(isSpectating(spectateScore(shifted, t)), false, 'texto desplazado');
});

test('frozen stretches (zero motion) are never picked even if the audio is loud', () => {
  const s = synthetic(1200, [600, 700]); // zona ruidosa y con movimiento
  for (let i = 300; i < 420; i++) s.motion[i] = 0; // imagen congelada con audio fuerte
  for (let i = 300; i < 420; i++) s.audioDb[i] = -10;
  const scored = scoreWindows(s);
  assert.equal(scored.find((w) => w.t === 330).excluded, 'frozen');
  const picked = pickWindows(scored, { count: 6 });
  assert.ok(picked.length > 0);
  assert.ok(picked.every((w) => w.still < 0.3 * DEFAULTS.clipSeconds), 'ninguna ventana elegida tiene mas del 30 % de segundos quietos');
});

test('windows while spectating are excluded and never picked', () => {
  const s = synthetic(1200, [600, 700]);
  s.spectate = Array.from({ length: 1200 }, (_, i) => (i >= 600 && i < 700 ? 1 : 0));
  const picked = pickWindows(scoreWindows(s), { count: 3 });
  assert.ok(picked.every((w) => w.t + DEFAULTS.clipSeconds <= 600 + 2 || w.t >= 700 - 2), JSON.stringify(picked.map((w) => w.t)));
  const win = scoreWindows(s).find((w) => w.t === 620);
  assert.equal(win.excluded, 'spectating');
});

test('readJson tolerates a PowerShell BOM and missing files', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const f = path.join(os.tmpdir(), `psc-${Date.now()}.json`);
  fs.writeFileSync(f, '﻿{"a":1}');
  assert.deepEqual(readJson(f, null), { a: 1 });
  fs.rmSync(f);
  assert.deepEqual(readJson(f, { none: true }), { none: true });
});

test('report never claims anything is published and carries warnings', () => {
  const r = renderReport({ stamp: 's', source: 'x.mkv', durationSeconds: 3600, warnings: ['MIC_SILENT: x'], status: 'pending_approval', clips: [{ id: '01', startHms: '00:10:00', score: 0.9, horizontal: 'a', vertical: null, flags: ['VERTICAL_BLANK_REJECTED'] }] });
  assert.match(r, /pending_approval/);
  assert.match(r, /Nada esta publicado/);
  assert.match(r, /MIC_SILENT/);
  assert.match(r, /VERTICAL_BLANK_REJECTED/);
  assert.equal(hms(3725), '01:02:05');
});
