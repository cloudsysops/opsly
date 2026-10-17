// Post-stream: detecta grabaciones de OBS terminadas, elige momentos candidatos y corta borradores
// (horizontal + vertical) listos para que un humano los apruebe.
//
// NUNCA publica nada ni toca cuentas de redes. Escribe solo en la carpeta de PostStream.
// No corre mientras OBS esta en directo (para no robar CPU/GPU al stream).
//
//   node post-stream-clips.mjs --horizontal-dir D:\\...\\horizontal --vertical-dir D:\\...\\vertical --out D:\\Content\\PostStream
//   opciones: --dry (solo analiza y lista) · --file <ruta .mkv horizontal> (forzar una) · --count N · --no-obs-check
//             --spectate-template <json> (excluye tramos con el jugador muerto) · --debug-dump <json> (guarda las series por segundo)
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

// Segundos desde la epoca de un sello de OBS ("2026-10-16_19-57-41"). Solo importan las diferencias.
export function stampToSeconds(stamp) {
  const m = stamp?.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) / 1000 : null;
}

export const PAIR_TOLERANCE_SECONDS = 600;

// Empareja cada horizontal con la grabacion vertical que EMPEZO despues (hasta 10 min) mas cercana, sin reutilizar verticales.
// offsetSeconds = cuanto mas tarde empezo el vertical: el instante t del horizontal es t - offsetSeconds en el vertical.
// (Antes se exigia el mismo segundo de inicio y una vertical que arrancaba 3 min despues quedaba sin emparejar.)
export function pairRecordings(horizontals, verticals, { tolerance = PAIR_TOLERANCE_SECONDS } = {}) {
  const used = new Set();
  return horizontals.map((h) => {
    const stamp = stampOf(h);
    const t0 = stampToSeconds(stamp);
    let best = null;
    if (t0 !== null) {
      for (const v of verticals) {
        if (used.has(v)) continue;
        const dv = stampToSeconds(stampOf(v));
        if (dv === null) continue;
        const offset = dv - t0;
        if (offset >= 0 && offset <= tolerance && (!best || offset < best.offset)) best = { v, offset };
      }
    }
    if (best) used.add(best.v);
    return { h, v: best?.v ?? null, stamp, offsetSeconds: best?.offset ?? 0 };
  });
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

const STILL_MOTION = 0.5; // diferencia media entre fotogramas clave por debajo de la cual la imagen se considera quieta
const STILL_SHARE = 0.3; // una ventana con mas del 30 % de segundos quietos se descarta como congelada

// audioDb[s]: RMS dB por segundo; motion[s]: cambio visual por segundo; black[s]: 1 si el frame es negro.
export function scoreWindows({ audioDb, motion, black, spectate = [] }, opts = {}) {
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
      spectate: spectate.slice(t, t + win).reduce((s, x) => s + x, 0),
      still: motion.slice(t, t + win).filter((m) => m < STILL_MOTION).length,
    });
  }
  if (!rows.length) return [];
  const pa = percentileRanks(rows.map((r) => r.audio));
  const pm = percentileRanks(rows.map((r) => r.motion));
  const motionFloor = [...rows.map((r) => r.motion)].sort((x, y) => x - y)[Math.floor(rows.length * 0.15)];
  return rows.map((r, i) => ({
    ...r,
    score: 0.5 * pa[i] + 0.5 * pm[i],
    excluded: r.still >= STILL_SHARE * win ? 'frozen' : r.black >= 3 ? 'black-frames' : r.spectate >= 3 ? 'spectating' : r.audio < -60 ? 'silent' : r.motion < motionFloor ? 'low-motion' : null,
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

// Segundos congelados que reporta ffmpeg freezedetect (stderr). Una congelacion abierta hasta el final del clip cuenta hasta `totalSeconds`.
export function parseFreezeSeconds(stderr, totalSeconds = 0) {
  const starts = [...String(stderr).matchAll(/freeze_start:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  const durations = [...String(stderr).matchAll(/freeze_duration:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  let total = durations.reduce((a, b) => a + b, 0);
  if (starts.length > durations.length && totalSeconds) total += Math.max(0, totalSeconds - starts[starts.length - 1]);
  return Math.round(total * 10) / 10;
}

export const FROZEN_MAX_SHARE = 0.3; // un clip con mas del 30 % congelado se rechaza

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

// ---------- deteccion del modo espectador (jugador muerto) ----------
// El juego muestra la etiqueta SPECTATING siempre en el mismo sitio; se compara contra una mascara de esa etiqueta.
// La plantilla es del layout del tenant (--spectate-template); sin plantilla no se detecta.

export function loadSpectateTemplate(file) {
  const j = readJson(file, null);
  if (!j) return null;
  const { width: w, height: h, rows, brightThreshold = 200 } = j;
  const mask = new Uint8Array(w * h);
  rows.forEach((r, y) => { for (let x = 0; x < w; x++) mask[y * w + x] = r[x] === '1' ? 1 : 0; });
  const near = new Uint8Array(w * h); // mascara dilatada 1 px: tolera el suavizado del escalado
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!mask[y * w + x]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < h && xx >= 0 && xx < w) near[yy * w + xx] = 1;
    }
  }
  return { w, h, mask, near, bright: brightThreshold, maskPixels: mask.reduce((a, b) => a + b, 0), crop: j.crop };
}

// crop: bytes grises (w*h) de la zona de la etiqueta. recall = cuanta etiqueta aparece; extra = brillo fuera de ella.
export function spectateScore(crop, t) {
  let hit = 0, extra = 0, outside = 0;
  for (let i = 0; i < t.w * t.h; i++) {
    const bright = crop[i] > t.bright;
    if (t.mask[i] && bright) hit++;
    if (!t.near[i]) { outside++; if (bright) extra++; }
  }
  return { recall: hit / t.maskPixels, extra: extra / outside };
}
export const isSpectating = ({ recall, extra }) => recall >= 0.7 && extra < 0.25;

// Una pasada de video que decodifica SOLO fotogramas clave (OBS: 1 por segundo) y devuelve por segundo:
// movimiento visual, negro y (si hay plantilla) modo espectador.
function motionAndBlack(file, duration, template) {
  const W = 64, H = 36, FW = 130, CH = 25, FH = H + CH, size = FW * FH;
  const vf = `showinfo,split[a][b];[a]scale=${W}:${H},pad=${FW}:${H}[m];[b]crop=${template?.crop?.w ?? 260}:${template?.crop?.h ?? 50}:${template?.crop?.x ?? 830}:${template?.crop?.y ?? 800},scale=${FW}:${CH}[c];[m][c]vstack,format=gray`;
  const r = run(FFMPEG, ['-hide_banner', '-v', 'info', '-skip_frame', 'nokey', '-i', file, '-map', '0:v:0', '-fps_mode', 'passthrough', '-vf', vf, '-f', 'rawvideo', '-'], { binary: true });
  if (r.status !== 0) throw new Error(`ffmpeg video fallo: ${String(r.stderr).slice(-500)}`);
  const times = [...String(r.stderr).matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]));
  const buf = r.stdout, frames = Math.min(Math.floor(buf.length / size), times.length);
  const n = Math.ceil(duration);
  const motion = new Array(n).fill(0), black = new Array(n).fill(0), spectate = new Array(n).fill(0), seen = new Array(n).fill(false);
  let prev = null, prevT = 0, f = 0;
  for (let s = 0; s < n; s++) {
    while (f < frames && times[f] <= s + 0.5) {
      const cur = buf.subarray(f * size, (f + 1) * size);
      let sum = 0, d = 0;
      const small = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = cur[y * FW + x]; small[y * W + x] = v; sum += v; }
      const isBlack = sum / (W * H) < 10 ? 1 : 0;
      if (prev) { for (let i = 0; i < W * H; i++) d += Math.abs(small[i] - prev[i]); }
      const dt = Math.max(1, times[f] - prevT);
      const lab = template ? isSpectating(spectateScore(cur.subarray(H * FW), template)) ? 1 : 0 : 0;
      // se asigna al segundo mas cercano al fotograma
      const sec = Math.min(n - 1, Math.max(0, Math.round(times[f])));
      motion[sec] = prev ? d / (W * H) / dt : 0;
      black[sec] = isBlack;
      spectate[sec] = lab;
      seen[sec] = true;
      prev = small; prevT = times[f];
      f++;
    }
  }
  // Relleno hacia delante SOLO de segundos sin fotograma clave. Un movimiento 0 medido (imagen congelada) es un dato real:
  // antes se confundia con "sin dato" y se sustituia por el ultimo movimiento, lo que hacia pasar por buenas ventanas congeladas.
  for (let s = 1; s < n; s++) if (!seen[s]) { motion[s] = motion[s - 1]; black[s] = black[s - 1]; spectate[s] = spectate[s - 1]; }
  return { motion, black, spectate, frames, duration };
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

function frozenSeconds(file, totalSeconds) {
  const r = run(FFMPEG, ['-hide_banner', '-i', file, '-map', '0:v:0', '-vf', 'freezedetect=n=-55dB:d=1.5', '-an', '-f', 'null', '-']);
  return parseFreezeSeconds(r.stderr || '', totalSeconds);
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

export function processRecording({ h, v, stamp, offsetSeconds = 0 }, { outRoot, opts, dry, template = null, dumpFile = null, log = console.log }) {
  const info = probe(h);
  log(`[${stamp}] ${path.basename(h)} ${hms(info.duration)}`);
  const tmp = path.join(outRoot, `.tmp-${stamp}.txt`);
  fs.mkdirSync(outRoot, { recursive: true });
  const audioDb = rmsPerSecond(h, info.mixIdx, tmp);
  const { motion, black, spectate } = motionAndBlack(h, info.duration, template);
  if (dumpFile) fs.writeFileSync(dumpFile, JSON.stringify({ audioDb, motion, black, spectate }));
  const scored = scoreWindows({ audioDb, motion, black, spectate }, opts);
  const picked = pickWindows(scored, opts);
  const mic = micIsSilent(h, info);
  let vDuration = 0;
  if (v) { try { vDuration = probe(v).duration; } catch { vDuration = 0; } }
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
      if (cutClip({ src: h, out: hOut, start: w.t, seconds: clip.seconds, audioIdx: info.mixIdx })) {
        const frozen = frozenSeconds(hOut, clip.seconds);
        if (frozen / clip.seconds > FROZEN_MAX_SHARE) {
          fs.renameSync(hOut, path.join(outDir, 'rejected', `REJECTED_${base}_H_frozen-${Math.round(frozen)}s.mp4`));
          clip.flags.push(`FROZEN_REJECTED:${Math.round(frozen)}s`);
        } else clip.horizontal = hOut;
      } else clip.flags.push('H_CUT_FAILED');
      const vStart = w.t - offsetSeconds; // el vertical empezo offsetSeconds despues del horizontal
      if (v && (vStart < 0 || vStart + clip.seconds > vDuration)) clip.flags.push('VERTICAL_NOT_COVERED');
      else if (v) {
        const vOut = path.join(outDir, 'reels', `${base}_V.mp4`);
        if (cutClip({ src: v, out: vOut, start: vStart, seconds: clip.seconds, audioIdx: info.mixIdx })) {
          const vFrozen = frozenSeconds(vOut, clip.seconds);
          if (isVerticalBlank(verticalYavg(vOut))) {
            const rej = path.join(outDir, 'rejected', `REJECTED_${base}_V_top-half-black.mp4`);
            fs.renameSync(vOut, rej);
            clip.flags.push('VERTICAL_BLANK_REJECTED');
          } else if (vFrozen / clip.seconds > FROZEN_MAX_SHARE) {
            fs.renameSync(vOut, path.join(outDir, 'rejected', `REJECTED_${base}_V_frozen-${Math.round(vFrozen)}s.mp4`));
            clip.flags.push(`FROZEN_REJECTED:${Math.round(vFrozen)}s`);
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

  const templateFile = arg('--spectate-template');
  const template = templateFile ? loadSpectateTemplate(templateFile) : null;
  if (templateFile && !template) console.log(`AVISO: no se pudo leer la plantilla de espectador (${templateFile}); no se detectara.`);
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
    const res = processRecording(p, { outRoot, opts, dry, template, dumpFile: arg('--debug-dump') });
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
