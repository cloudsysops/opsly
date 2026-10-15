// Post-stream: detecta grabaciones de OBS terminadas, elige momentos candidatos y corta borradores
// (horizontal + vertical) listos para que un humano los apruebe.
//
// NUNCA publica nada ni toca cuentas de redes. Escribe solo en la carpeta de PostStream.
// No corre mientras OBS esta en directo (para no robar CPU/GPU al stream).
//
//   node post-stream-clips.mjs --horizontal-dir D:\\...\\horizontal --vertical-dir D:\\...\\vertical --out D:\\Content\\PostStream
//   opciones: --dry (solo analiza y lista) · --file <ruta .mkv horizontal> (forzar una) · --count N · --no-obs-check
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

export const DEFAULTS = {
  clipSeconds: 45,
  stepSeconds: 5,
  count: 6,
  minGapSeconds: 180,
  edgeSeconds: 60,
  quietMs: 3 * 60 * 1000, // un archivo debe llevar 3 min sin escribirse para considerarlo terminado
  minDurationSeconds: 600,
};

// ---------- funciones puras (con tests) ----------

const STAMP = /^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_/;
const leaf = (file) => String(file).split(/[\\/]/).pop();
export const stampOf = (file) => leaf(file).match(STAMP)?.[1] ?? null;

// Empareja cada horizontal con su vertical por el sello de fecha/hora del nombre de OBS.
export function pairRecordings(horizontals, verticals) {
  const byStamp = new Map(verticals.map((v) => [stampOf(v), v]));
  return horizontals.map((h) => ({ h, v: byStamp.get(stampOf(h)) ?? null, stamp: stampOf(h) }));
}

export function isFinished(stat, nowMs, quietMs = DEFAULTS.quietMs) {
  return nowMs - stat.mtimeMs >= quietMs;
}

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
function percentileRanks(values) {
  const sorted = [...values].sort((x, y) => x - y);
  return values.map((v) => {
    let lo = 0, hi = sorted.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < v) lo = mid + 1; else hi = mid; }
    return sorted.length > 1 ? lo / (sorted.length - 1) : 0;
  });
}

// audioDb[s]: RMS dB por segundo; motion[s]: cambio visual por segundo; black[s]: 1 si el frame es negro.
export function scoreWindows({ audioDb, motion, black }, opts = {}) {
  const { clipSeconds: win, stepSeconds: step, edgeSeconds: edge } = { ...DEFAULTS, ...opts };
  const n = Math.min(audioDb.length, motion.length, black.length);
  const rows = [];
  for (let t = edge; t + win <= n - edge; t += step) {
    const a = audioDb.slice(t, t + win).map((x) => Math.max(x, -90));
    rows.push({
      t,
      audio: mean(a),
      motion: mean(motion.slice(t, t + win)),
      black: black.slice(t, t + win).reduce((s, x) => s + x, 0),
    });
  }
  if (!rows.length) return [];
  const pa = percentileRanks(rows.map((r) => r.audio));
  const pm = percentileRanks(rows.map((r) => r.motion));
  const motionFloor = [...rows.map((r) => r.motion)].sort((x, y) => x - y)[Math.floor(rows.length * 0.15)];
  return rows.map((r, i) => ({
    ...r,
    score: 0.5 * pa[i] + 0.5 * pm[i],
    excluded: r.black >= 3 ? 'black-frames' : r.audio < -60 ? 'silent' : r.motion < motionFloor ? 'low-motion' : null,
  }));
}

export function pickWindows(scored, opts = {}) {
  const { count, minGapSeconds, clipSeconds } = { ...DEFAULTS, ...opts };
  const picked = [];
  for (const w of scored.filter((x) => !x.excluded).sort((a, b) => b.score - a.score)) {
    if (picked.length >= count) break;
    if (picked.every((p) => Math.abs(p.t - w.t) >= clipSeconds + minGapSeconds)) picked.push(w);
  }
  return picked.sort((a, b) => a.t - b.t);
}

// Un vertical con la mitad de juego en negro tiene luminancia casi constante y baja en la region de juego.
export function isVerticalBlank(yavgSamples, { threshold = 45, share = 0.6 } = {}) {
  if (!yavgSamples.length) return true;
  return yavgSamples.filter((y) => y < threshold).length / yavgSamples.length >= share;
}

export const hms = (s) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), Math.floor(s % 60)].map((x) => String(x).padStart(2, '0')).join(':');

// ---------- ffmpeg ----------

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: opts.binary ? 'buffer' : 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
  return r;
}

export function probe(file) {
  const r = run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration:stream=index,codec_type:stream_tags=title', '-of', 'json', file]);
  if (r.status !== 0) throw new Error(`ffprobe fallo: ${r.stderr}`);
  const j = JSON.parse(r.stdout);
  const audio = j.streams.filter((s) => s.codec_type === 'audio');
  const idx = (title, fallback) => { const i = audio.findIndex((s) => s.tags?.title?.toLowerCase() === title); return i >= 0 ? i : fallback; };
  return { duration: Number(j.format.duration), audioCount: audio.length, mixIdx: idx('mezcla', 0), micIdx: idx('micro', 2) };
}

function rmsPerSecond(file, audioIdx, tmpFile) {
  // Nombre relativo + cwd evita el escapado de rutas (":" y "\") dentro del filtergraph de ffmpeg.
  const af = `asetnsamples=n=48000:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=${path.basename(tmpFile)}`;
  const r = run(FFMPEG, ['-v', 'error', '-y', '-i', file, '-map', `0:a:${audioIdx}`, '-af', af, '-f', 'null', '-'], { cwd: path.dirname(tmpFile) });
  if (r.status !== 0) throw new Error(`ffmpeg audio fallo: ${r.stderr}`);
  const out = [];
  for (const line of fs.readFileSync(tmpFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/RMS_level=(.+)$/);
    if (m) out.push(m[1] === '-inf' ? -120 : Number(m[1]));
  }
  fs.rmSync(tmpFile, { force: true });
  return out;
}

function motionAndBlack(file, duration) {
  const W = 64, H = 36;
  const r = run(FFMPEG, ['-v', 'error', '-hwaccel', 'auto', '-i', file, '-map', '0:v:0', '-vf', `fps=1,scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], { binary: true });
  if (r.status !== 0) throw new Error(`ffmpeg video fallo: ${r.stderr}`);
  const buf = r.stdout, size = W * H, frames = Math.floor(buf.length / size);
  const motion = [], black = [];
  let prev = null;
  for (let f = 0; f < frames; f++) {
    const cur = buf.subarray(f * size, (f + 1) * size);
    let sum = 0;
    for (let i = 0; i < size; i++) sum += cur[i];
    black.push(sum / size < 10 ? 1 : 0);
    if (prev) { let d = 0; for (let i = 0; i < size; i++) d += Math.abs(cur[i] - prev[i]); motion.push(d / size); } else motion.push(0);
    prev = cur;
  }
  return { motion, black, frames, duration };
}

function micIsSilent(file, info) {
  if (info.micIdx >= info.audioCount) return { silent: true, reason: 'no hay pista de micro' };
  let loud = 0;
  for (const frac of [0.25, 0.5, 0.75]) {
    const ss = Math.floor(info.duration * frac);
    const r = run(FFMPEG, ['-hide_banner', '-ss', String(ss), '-t', '60', '-i', file, '-map', `0:a:${info.micIdx}`, '-af', 'volumedetect', '-f', 'null', '-']);
    const m = (r.stderr || '').match(/mean_volume:\s*(-?[\d.]+|-inf)/);
    const v = !m || m[1] === '-inf' ? -120 : Number(m[1]);
    if (v > -70) loud++;
  }
  return { silent: loud === 0 };
}

function cutClip({ src, out, start, seconds, audioIdx }) {
  const fade = seconds - 1;
  const r = run(FFMPEG, [
    '-v', 'error', '-y', '-ss', String(start), '-i', src, '-t', String(seconds),
    '-map', '0:v:0', '-map', `0:a:${audioIdx}`,
    '-vf', `fade=t=in:st=0:d=0.5,fade=t=out:st=${fade}:d=1`,
    '-af', `loudnorm=I=-16:TP=-2:LRA=11,afade=t=in:st=0:d=0.5,afade=t=out:st=${fade}:d=1`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-threads', '4',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out,
  ]);
  return r.status === 0 && fs.existsSync(out);
}

function verticalYavg(file) {
  const r = run(FFMPEG, ['-hide_banner', '-i', file, '-vf', 'fps=1/5,crop=1080:800:0:80,signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-an', '-f', 'null', '-']);
  return [...(r.stderr || '').matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
}

// ---------- flujo ----------

function obsProcessRunning() {
  if (process.platform !== 'win32') return false;
  const r = spawnSync('tasklist', ['/FI', 'IMAGENAME eq obs64.exe', '/NH'], { encoding: 'utf8' });
  return /obs64\.exe/i.test(r.stdout || '');
}

// 'live' | 'idle' | 'closed' | 'unknown'. 'unknown' = OBS abierto pero sin websocket: no sabemos si hay directo,
// asi que se trata como si lo hubiera (no se procesa nada).
export async function obsState() {
  try {
    const { withObs } = await import('./obs.mjs');
    const s = await withObs((req) => req('GetStreamStatus'), 3000);
    return s.outputActive ? 'live' : 'idle';
  } catch {
    return obsProcessRunning() ? 'unknown' : 'closed';
  }
}

// Tolera el BOM que PowerShell 5.1 agrega con Set-Content -Encoding utf8.
export function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
}

function listMkv(dir) {
  try { return fs.readdirSync(dir).filter((f) => /\.(mkv|mp4)$/i.test(f)).map((f) => path.join(dir, f)); } catch { return []; }
}

export function processRecording({ h, v, stamp }, { outRoot, opts, dry, log = console.log }) {
  const info = probe(h);
  log(`[${stamp}] ${path.basename(h)} ${hms(info.duration)}`);
  const tmp = path.join(outRoot, `.tmp-${stamp}.txt`);
  fs.mkdirSync(outRoot, { recursive: true });
  const audioDb = rmsPerSecond(h, info.mixIdx, tmp);
  const { motion, black } = motionAndBlack(h, info.duration);
  const scored = scoreWindows({ audioDb, motion, black }, opts);
  const picked = pickWindows(scored, opts);
  const mic = micIsSilent(h, info);
  const warnings = [];
  if (mic.silent) warnings.push('MIC_SILENT: la pista de micro esta en silencio; los clips no llevan voz.');
  if (!v) warnings.push('NO_VERTICAL: no hay grabacion vertical emparejada; solo se generan horizontales.');
  const day = stamp.slice(0, 10);
  const outDir = path.join(outRoot, `${day}_auto-${stamp.slice(11)}`);
  const result = { stamp, source: h, vertical: v, durationSeconds: Math.round(info.duration), mic, warnings, clips: [], outDir, status: 'pending_approval' };
  for (const [i, w] of picked.entries()) {
    const id = String(i + 1).padStart(2, '0');
    const base = `DRAFT_${id}_${hms(w.t).replace(/:/g, '')}`;
    const clip = { id, startSeconds: w.t, startHms: hms(w.t), seconds: opts.clipSeconds ?? DEFAULTS.clipSeconds, score: Number(w.score.toFixed(3)), audioDb: Number(w.audio.toFixed(1)), motion: Number(w.motion.toFixed(2)), horizontal: null, vertical: null, flags: [] };
    if (!dry) {
      for (const d of ['clips', 'reels', 'metadata', 'rejected']) fs.mkdirSync(path.join(outDir, d), { recursive: true });
      const hOut = path.join(outDir, 'clips', `${base}_H.mp4`);
      if (cutClip({ src: h, out: hOut, start: w.t, seconds: clip.seconds, audioIdx: info.mixIdx })) clip.horizontal = hOut; else clip.flags.push('H_CUT_FAILED');
      if (v) {
        const vOut = path.join(outDir, 'reels', `${base}_V.mp4`);
        if (cutClip({ src: v, out: vOut, start: w.t, seconds: clip.seconds, audioIdx: info.mixIdx })) {
          if (isVerticalBlank(verticalYavg(vOut))) {
            const rej = path.join(outDir, 'rejected', `REJECTED_${base}_V_top-half-black.mp4`);
            fs.renameSync(vOut, rej);
            clip.flags.push('VERTICAL_BLANK_REJECTED');
          } else clip.vertical = vOut;
        } else clip.flags.push('V_CUT_FAILED');
      }
    }
    result.clips.push(clip);
  }
  if (!dry) {
    fs.writeFileSync(path.join(outDir, 'metadata', 'candidates.json'), JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(outDir, 'REPORT.md'), renderReport(result));
  }
  return result;
}

// Cola de publicacion: 1 clip por dia, en orden de puntuacion. SOLO planifica; no sube nada.
// scheduledAt es hora de pared en `timezone` (no se convierte a UTC aqui para evitar errores de DST).
export const QUEUE_DEFAULTS = { hour: 19, timezone: 'America/New_York', platforms: ['tiktok', 'youtube_shorts', 'instagram_reels'], hashtags: '#gaming #twitch', handle: 'twitch.tv/opsafterdark' };

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (isoDay, n) => { const d = new Date(`${isoDay}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };

export function scheduleQueue(existing, result, { todayIso, ...q } = {}) {
  const cfg = { ...QUEUE_DEFAULTS, ...q };
  const today = todayIso ?? ymd(new Date());
  const lastDay = existing.map((e) => e.scheduledAt.slice(0, 10)).sort().pop();
  let day = addDays(lastDay && lastDay >= today ? lastDay : today, 1);
  const ordered = result.clips.filter((c) => c.vertical && !c.flags.length).sort((a, b) => b.score - a.score);
  const entries = ordered.map((c) => {
    const entry = {
      id: `${result.stamp}-${c.id}`,
      stamp: result.stamp,
      startHms: c.startHms,
      vertical: c.vertical,
      horizontal: c.horizontal,
      scheduledAt: `${day}T${pad(cfg.hour)}:00`,
      timezone: cfg.timezone,
      platforms: cfg.platforms,
      caption: `Clip del directo de OpsAfterDark 🎮 Live: ${cfg.handle} ${cfg.hashtags}`,
      status: 'draft',
      requiresApproval: true,
      publishedAt: null,
      warnings: result.warnings,
    };
    day = addDays(day, 1);
    return entry;
  });
  return { entries, horizontalOnly: result.clips.filter((c) => c.horizontal && !c.vertical).map((c) => `${result.stamp}-${c.id}`) };
}

export function renderReport(r) {
  const lines = [
    `# Clips automaticos — ${r.stamp}`,
    '',
    `**Estado: ${r.status}.** Nada esta publicado ni programado. Cada pieza requiere aprobacion humana.`,
    '',
    `Grabacion: \`${r.source}\` (${hms(r.durationSeconds)})`,
    '',
    ...(r.warnings.length ? ['## Avisos', ...r.warnings.map((w) => `- ${w}`), ''] : []),
    '## Candidatos (elegidos por audio + movimiento visual; NO revisados por una persona)',
    '',
    '| # | Inicio | Puntuacion | Horizontal | Vertical | Avisos |',
    '|---|---|---|---|---|---|',
    ...r.clips.map((c) => `| ${c.id} | ${c.startHms} | ${c.score} | ${c.horizontal ? 'si' : 'no'} | ${c.vertical ? 'si' : 'no'} | ${c.flags.join(', ') || '-'} |`),
    '',
    '## Antes de aprobar',
    '- Mira cada clip entero: privacidad (nombres de archivo, commits), cuadro gris, audio raro.',
    '- La seleccion automatica no entiende el contenido: puede elegir menus o momentos flojos.',
    '- Solo aprueba lo que quieras publicar. El script no publica nada.',
    '',
  ];
  return lines.join('\n');
}

export async function main(argv) {
  const arg = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
  const has = (name) => argv.includes(name);
  const hDir = arg('--horizontal-dir'), vDir = arg('--vertical-dir'), outRoot = arg('--out');
  const forced = arg('--file');
  const dry = has('--dry');
  const opts = { ...(arg('--count') ? { count: Number(arg('--count')) } : {}) };
  if (!outRoot || (!hDir && !forced)) { console.error('uso: --horizontal-dir <dir> [--vertical-dir <dir>] --out <dir> [--dry] [--file <mkv>] [--count N] [--no-obs-check]'); return 2; }
  if (!has('--no-obs-check')) {
    const st = await obsState();
    if (st === 'live') { console.log('OBS esta en directo: no se procesa nada ahora.'); return 0; }
    if (st === 'unknown') { console.log('OBS esta abierto pero su websocket no responde: no se sabe si hay directo, no se procesa nada.'); return 0; }
  }

  const stateFile = path.join(outRoot, '.processed.json');
  const state = readJson(stateFile, {});
  const hFiles = forced ? [forced] : listMkv(hDir);
  const pairs = pairRecordings(hFiles, vDir ? listMkv(vDir) : []);
  const now = Date.now();
  let did = 0;
  for (const p of pairs) {
    const key = path.basename(p.h);
    if (!p.stamp) continue;
    const st = fs.statSync(p.h);
    if (!forced && state[key]) continue;
    if (!forced && !isFinished(st, now)) { console.log(`[${p.stamp}] aun se esta escribiendo, se omite.`); continue; }
    if (!forced && p.v && !isFinished(fs.statSync(p.v), now)) { console.log(`[${p.stamp}] el vertical aun se esta escribiendo, se omite.`); continue; }
    let dur;
    try { dur = probe(p.h).duration; } catch { continue; }
    if (dur < DEFAULTS.minDurationSeconds) { console.log(`[${p.stamp}] dura ${hms(dur)}, menos de 10 min: se omite.`); if (!dry) state[key] = { skipped: 'too-short', at: new Date().toISOString() }; continue; }
    const res = processRecording(p, { outRoot, opts, dry });
    console.log(`[${p.stamp}] ${res.clips.length} candidatos -> ${res.outDir}${dry ? ' (dry-run)' : ''}`);
    for (const c of res.clips) console.log(`   #${c.id} ${c.startHms} score=${c.score} audio=${c.audioDb}dB motion=${c.motion} ${c.flags.join(',')}`);
    for (const w of res.warnings) console.log(`   AVISO ${w}`);
    if (!dry) {
      const queueFile = path.join(outRoot, 'publish-queue.json');
      const queue = readJson(queueFile, []);
      const { entries } = scheduleQueue(queue, res);
      fs.writeFileSync(queueFile, JSON.stringify([...queue, ...entries], null, 2));
      console.log(`   cola de publicacion: +${entries.length} (borrador, requiere aprobacion; nada se sube)`);
      state[key] = { at: new Date().toISOString(), outDir: res.outDir, clips: res.clips.length };
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    }
    did++;
  }
  if (!did) console.log('Nada nuevo que procesar.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.message); process.exit(1); });
}
