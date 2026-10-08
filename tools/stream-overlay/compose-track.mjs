// Compositor offline del tema "AI Factory": render determinista (semilla fija) a WAV 24 bit + stems + MP3 + informe.
// El motivo melodico sale de las notas que los agentes tocaron en las sesiones grabadas (session.mid).
// Uso: node compose-track.mjs [--title "Midnight Merge"] [--seed 20261007] [--out D:/Content/Music/Factory/tracks]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const TITLE = arg('title', 'Midnight Merge'), SEED = +arg('seed', 20261007), OUT = arg('out', 'D:/Content/Music/Factory/tracks');
const SESSIONS = 'D:/Content/Music/Factory';
const FFMPEG = 'C:/Users/opsly/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe';

const SR = 48000, BPM = 124, BEAT = 60 / BPM, STEP = BEAT / 4, BAR = BEAT * 4;
const SECTIONS = [['INTRO', 16], ['BUILD', 8], ['DROP', 32], ['BREAKDOWN', 16], ['BUILD', 8], ['DROP', 32], ['OUTRO', 16]];
const BARS = SECTIONS.reduce((a, s) => a + s[1], 0), N = Math.round(BARS * BAR * SR) + SR * 5;
const secOf = [], posIn = []; SECTIONS.forEach(([n, b], si) => { for (let i = 0; i < b; i++) { secOf.push(n + (n === 'DROP' || n === 'BUILD' ? (si < 4 ? '1' : '2') : '')); posIn.push(i); } });

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEED);
const mk = () => new Float32Array(N);
const S = { kick: mk(), bass: mk(), sub: mk(), drumsL: mk(), drumsR: mk(), padL: mk(), padR: mk(), leadL: mk(), leadR: mk(), fxL: mk(), fxR: mk() };
const rev = mk(), spaceL = mk(), spaceR = mk(), duck = new Float32Array(N).fill(1);
const sampleAt = (bar, step) => Math.round((bar * 16 + step) * STEP * SR);
const clampN = (i) => Math.min(N - 1, i);

// ---------- utilidades DSP ----------
function polyblep(t, dt) { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; }
const saw = (ph, dt) => 2 * ph - 1 - polyblep(ph, dt);
function biquad(type, f, q, sr = SR) { const w = 2 * Math.PI * f / sr, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q); let b0, b1, b2; const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
  if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; } else if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = a; b1 = 0; b2 = -a; }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0, x1: 0, x2: 0, y1: 0, y2: 0 }; }
const run = (f, x) => { const y = f.b0 * x + f.b1 * f.x1 + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2; f.x2 = f.x1; f.x1 = x; f.y2 = f.y1; f.y1 = y; return y; };
function noiseBuf(sec, type, f, q) { const n = Math.round(sec * SR), b = new Float32Array(n), flt = biquad(type, f, q); for (let i = 0; i < n; i++) b[i] = run(flt, rnd() * 2 - 1); return b; }
const HAT = (() => { const b = noiseBuf(2, 'hp', 6000, 0.7), lp = biquad('lp', 14000, 0.7), lp2 = biquad('lp', 14000, 0.7); for (let i = 0; i < b.length; i++) b[i] = run(lp2, run(lp, b[i])); return b; })(), CLAP = noiseBuf(2, 'bp', 1700, 0.9), SNARE = noiseBuf(2, 'bp', 2400, 0.6), WHITE = noiseBuf(4, 'hp', 40, 0.7);
function lerp(a, b, t) { return a + (b - a) * t; }

// ---------- motivo a partir de las sesiones de los agentes ----------
function readMidiNotes(file) { const b = fs.readFileSync(file), out = []; let p = 14;
  while (p < b.length) { if (b.toString('latin1', p, p + 4) !== 'MTrk') break; const len = b.readUInt32BE(p + 4); let i = p + 8; const end = i + len, tr = []; let tick = 0;
    while (i < end) { let d = 0, c; do { c = b[i++]; d = (d << 7) | (c & 0x7f); } while (c & 0x80); tick += d; const st = b[i++];
      if (st === 0xff) { i++; let l = 0; do { c = b[i++]; l = (l << 7) | (c & 0x7f); } while (c & 0x80); i += l; } else if ((st & 0xf0) === 0x90 || (st & 0xf0) === 0x80) { const n = b[i++], v = b[i++]; if ((st & 0xf0) === 0x90 && v > 0) tr.push({ tick, n, ch: st & 15 }); } else i += 2; }
    out.push(...tr); p = end; } return out; }
let agentNotes = [], motifSource = [];
try { for (const d of fs.readdirSync(SESSIONS).filter((x) => x.startsWith('session_'))) { const f = path.join(SESSIONS, d, 'session.mid'); if (fs.existsSync(f)) { const ns = readMidiNotes(f).filter((x) => x.ch === 1 || x.ch === 3); if (ns.length) { agentNotes.push(...ns.sort((a, b) => a.tick - b.tick)); motifSource.push(d); } } } } catch {}
const SCALE = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33, 698.46, 783.99, 880.0]; // Re menor pentatonica
let motif = Array(16).fill(-1);
if (agentNotes.length >= 8) { let k = 0; for (let s = 0; s < 16; s++) { const n = agentNotes[(s * 5 + k) % agentNotes.length]; if ((n.n * 7 + s) % 10 < 7) motif[s] = n.n % SCALE.length; k += (n.n & 3); } }
else { for (let s = 0; s < 16; s++) motif[s] = rnd() < 0.7 ? Math.floor(rnd() * SCALE.length) : -1; }
motif[0] = motif[0] < 0 ? 0 : motif[0]; motif[8] = motif[8] < 0 ? 3 : motif[8];

// ---------- armonia ----------
const CH = [[146.83, 174.61, 220.0], [116.54, 146.83, 174.61], [174.61, 220.0, 261.63], [130.81, 164.81, 196.0]];
const ROOT = [73.42, 58.27, 87.31, 65.41];

// ---------- instrumentos ----------
const kickTimes = [];
function kick(i0, gain = 1) { kickTimes.push(i0); const n = Math.round(0.45 * SR); let ph = 0; for (let i = 0; i < n && i0 + i < N; i++) { const t = i / SR, f = 44 + 120 * Math.exp(-t * 32); ph += 2 * Math.PI * f / SR;
  S.kick[i0 + i] += (Math.sin(ph) * Math.exp(-t * 7.2) + (i < 120 ? (rnd() * 2 - 1) * 0.35 * (1 - i / 120) : 0)) * gain; } }
function bassNote(i0, len, f, gain = 1, cut = 600, sweep = 2.0) { const n = Math.round(len * SR), subF = f > 90 ? f / 2 : f; let p1 = rnd(), p2 = rnd(), ps = 0; const d1 = f * Math.pow(2, 6 / 1200) / SR, d2 = f * Math.pow(2, -6 / 1200) / SR; const flt = biquad('lp', cut, 2.2);
  for (let i = 0; i < n && i0 + i < N; i++) { const t = i / SR;
    if (i % 32 === 0) { const c = cut * (1 + sweep * Math.exp(-t * 16)); Object.assign(flt, biquad('lp', Math.min(c, 9000), 2.2), { x1: flt.x1, x2: flt.x2, y1: flt.y1, y2: flt.y2 }); }
    const env = Math.min(1, t / 0.003) * (i > n - 900 ? (n - i) / 900 : 1) * (0.55 + 0.45 * Math.exp(-t * 7));
    p1 += d1; if (p1 >= 1) p1 -= 1; p2 += d2; if (p2 >= 1) p2 -= 1; ps += subF / SR; if (ps >= 1) ps -= 1;
    const mid = Math.tanh(run(flt, (saw(p1, d1) + saw(p2, d2)) * 0.5) * 2.4) * 0.55;
    S.bass[i0 + i] += mid * env * gain; S.sub[i0 + i] += Math.sin(2 * Math.PI * ps) * env * gain * 1.0; } }
function subDrone(i0, len, f, gain) { const n = Math.round(len * SR); let ph = 0; for (let i = 0; i < n && i0 + i < N; i++) { const t = i / SR; ph += 2 * Math.PI * f / SR; const env = Math.min(1, t / 0.08) * (i > n - 2400 ? (n - i) / 2400 : 1) * (0.85 + 0.15 * Math.sin(t * 3)); S.sub[i0 + i] += Math.sin(ph) * env * gain; } }
function hat(i0, open, gain = 1, pan = 0) { const n = Math.round((open ? 0.22 : 0.05) * SR), off = Math.floor(rnd() * (HAT.length - n - 1)); for (let i = 0; i < n && i0 + i < N; i++) { const t = i / SR, e = Math.exp(-t * (open ? 16 : 85)) * gain * 0.8; S.drumsL[i0 + i] += HAT[off + i] * e * (1 - pan * 0.3); S.drumsR[i0 + i] += HAT[off + i] * e * (1 + pan * 0.3); } }
function clap(i0, gain = 1) { const bursts = [0, 0.011, 0.022, 0.034]; for (const b of bursts) { const n = Math.round(0.012 * SR), s0 = i0 + Math.round(b * SR); for (let i = 0; i < n && s0 + i < N; i++) { const e = (1 - i / n) * gain * 0.9; S.drumsL[s0 + i] += CLAP[i] * e; S.drumsR[s0 + i] += CLAP[i] * e; rev[s0 + i] += CLAP[i] * e * 0.5; } }
  const n = Math.round(0.2 * SR); for (let i = 0; i < n && i0 + Math.round(0.034 * SR) + i < N; i++) { const e = Math.exp(-i / SR * 20) * gain * 0.55, j = i0 + Math.round(0.034 * SR) + i; S.drumsL[j] += CLAP[500 + i] * e; S.drumsR[j] += CLAP[500 + i] * e; rev[j] += CLAP[500 + i] * e * 0.6; } }
function snare(i0, gain = 1, len = 0.14) { const n = Math.round(len * SR); let ph = 0; for (let i = 0; i < n && i0 + i < N; i++) { const t = i / SR, e = Math.exp(-t * 28) * gain; ph += 2 * Math.PI * 190 / SR; const v = (SNARE[i] * 0.8 + Math.sin(ph) * 0.45) * e; S.drumsL[i0 + i] += v; S.drumsR[i0 + i] += v; } }
function padChord(bar, chord) { const i0 = sampleAt(bar, 0), len = BAR + 0.55, n = Math.round(len * SR); const det = [-7, 7];
  for (const f of chord) for (let v = 0; v < 2; v++) { const fr = f * 2 * Math.pow(2, det[v] / 1200), dt = fr / SR; let ph = rnd(); const L = v === 0 ? 0.95 : 0.15, R = v === 0 ? 0.15 : 0.95;
    for (let i = 0; i < n && i0 + i < N; i++) { const t = i / SR, env = Math.min(1, t / 0.4) * (t > BAR ? Math.max(0, 1 - (t - BAR) / 0.55) : 1); ph += dt; if (ph >= 1) ph -= 1; const x = saw(ph, dt) * env * 0.11; S.padL[i0 + i] += x * L; S.padR[i0 + i] += x * R; } } }
function pluck(i0, f, len, gain, pan) { const n = Math.round(len * SR), d1 = f * Math.pow(2, 9 / 1200) / SR, d2 = f * Math.pow(2, -9 / 1200) / SR; let p1 = rnd(), p2 = rnd(), ps = 0;
  for (let i = 0; i < n && i0 + i < N; i++) { const t = i / SR, env = Math.min(1, t / 0.003) * Math.exp(-t * 9) * gain; p1 += d1; if (p1 >= 1) p1 -= 1; p2 += d2; if (p2 >= 1) p2 -= 1; ps += f / SR; if (ps >= 1) ps -= 1;
    const x = (saw(p1, d1) + saw(p2, d2)) * 0.5 + Math.sin(2 * Math.PI * ps) * 0.3; const v = x * env; S.leadL[i0 + i] += v * (1 - pan * 0.4); S.leadR[i0 + i] += v * (1 + pan * 0.4); rev[i0 + i] += v * 0.25; } }
function riser(i0, secs, gain) { const n = Math.round(secs * SR); const flt = biquad('bp', 400, 2); let blk = 0;
  for (let i = 0; i < n && i0 + i < N; i++) { if (i % 256 === 0) { const f = 300 * Math.pow(9000 / 300, i / n); Object.assign(flt, biquad('bp', f, 1.8 + 2 * i / n), { x1: flt.x1, x2: flt.x2, y1: flt.y1, y2: flt.y2 }); }
    const e = Math.pow(i / n, 2.2) * gain, x = run(flt, WHITE[i % WHITE.length]) * e * 2.2; S.fxL[i0 + i] += x * (0.8 + 0.2 * Math.sin(i / 6000)); S.fxR[i0 + i] += x * (0.8 - 0.2 * Math.sin(i / 6000)); } }
function impact(i0, gain = 1) { const n = Math.round(2.2 * SR); let ph = 0; for (let i = 0; i < n && i0 + i < N; i++) { const t = i / SR; ph += 2 * Math.PI * (38 + 60 * Math.exp(-t * 6)) / SR;
  const x = Math.sin(ph) * Math.exp(-t * 2.4) * 0.9 + HAT[i % HAT.length] * Math.exp(-t * 2.1) * 0.5; S.fxL[i0 + i] += x * gain; S.fxR[i0 + i] += x * gain; rev[i0 + i] += x * gain * 0.2; } }

// ---------- arreglo ----------
const rBars = (a, b) => { const o = []; for (let i = a; i < b; i++) o.push(i); return o; };
let startBar = 0; const bounds = SECTIONS.map(([n, b]) => { const s = startBar; startBar += b; return { n, s, e: s + b }; });
for (let bar = 0; bar < BARS; bar++) {
  const sec = secOf[bar], pos = posIn[bar], base = sec.replace(/[12]$/, ''), prog = bar % 4, chord = CH[prog], root = ROOT[prog];
  const drop = base === 'DROP', build = base === 'BUILD', brk = base === 'BREAKDOWN', intro = base === 'INTRO', outro = base === 'OUTRO';
  const last = bounds.find((b) => bar >= b.s && bar < b.e).e - 1 === bar;
  padChord(bar, chord);
  // bombo
  const kickOn = drop || (build && pos >= 0) || (intro && pos >= 8) || (outro && pos < 8);
  if (kickOn) for (let b = 0; b < 4; b++) kick(sampleAt(bar, b * 4), intro ? 0.55 : outro ? 0.85 : build ? 0.78 : 1);
  // hats
  const hatOn = !brk || pos >= 8;
  if (hatOn) for (let s = 0; s < 16; s++) { if (s % 4 === 2) hat(sampleAt(bar, s), true, drop ? 0.9 : 0.6, 0.4); else if (s % 2 === 0 || drop) hat(sampleAt(bar, s), false, (s % 4 === 0 ? 0.25 : 0.45) * (drop ? 1 : 0.7), s % 2 ? 0.5 : -0.5); }
  // clap / caja
  if (drop || outro) { clap(sampleAt(bar, 4), 0.9); clap(sampleAt(bar, 12), 0.9); }
  if (brk && pos >= 12) clap(sampleAt(bar, 12), 0.45);
  if (build) { const steps = pos < 4 ? [4, 12] : pos < 6 ? [4, 8, 12, 14] : pos < 7 ? [0, 2, 4, 6, 8, 10, 12, 14] : Array.from({ length: 16 }, (_, i) => i); for (const s of steps) snare(sampleAt(bar, s), 0.18 + 0.26 * (pos / 8), 0.12); }
  // bajo: rodante techno (hueco en cada bombo), octavas/quintas, filtro que se mueve
  const rolling = drop || (build && pos >= 4) || (outro && pos < 12);
  const half = (intro && pos >= 8) || (build && pos < 4);
  if (rolling) { const v = bar % 4, cutBase = drop ? 520 + 380 * Math.sin(bar * 0.55) : build ? lerp(260, 900, pos / 8) : lerp(520, 260, pos / 12);
    for (let s2 = 0; s2 < 16; s2++) { if (s2 % 4 === 0) continue; const off = s2 % 4 === 2; let r = 1;
      if (s2 === 7 || (v === 2 && s2 === 3)) r = 2; if (s2 === 11 && v % 2 === 0) r = 1.5; if (s2 === 15 && v === 3) r = 2; if (s2 === 14 && v === 1) r = 1.5;
      bassNote(sampleAt(bar, s2), STEP * (off ? 0.95 : 0.7), root * r, (off ? 0.95 : 0.62) * (build ? 0.72 : 1), cutBase * (off ? 1.15 : 1), drop ? 2.4 : 1.5); } }
  else if (half) { for (const s2 of [2, 6, 10, 14]) bassNote(sampleAt(bar, s2), STEP * 1.6, root, 0.8, 240 + 10 * pos, 0.8); }
  else if (brk) { subDrone(sampleAt(bar, 0), BAR * 0.98, root, 0.28); }
  if (drop && pos % 8 === 7) bassNote(sampleAt(bar, 14), STEP * 1.8, root * 2, 0.9, 1400, 3.0);
  // melodia (motivo de los agentes)
  const dropSecond = sec === 'DROP2';
  const leadOn = (sec === 'DROP1' && pos >= 8) || dropSecond || (build && pos >= 2) || (brk && pos >= 4) || (intro && pos >= 8 && pos % 2 === 1);
  if (leadOn) { const sparse = brk || intro; for (let s = 0; s < 16; s++) { let d = motif[s]; if (d < 0) continue; if (sparse && s % 4 !== 0) continue; if (bar % 4 === 3 && s >= 12) d = Math.min(SCALE.length - 1, d + 2);
    const f = SCALE[d] * (dropSecond && s % 8 === 4 ? 2 : 1); pluck(sampleAt(bar, s), f, sparse ? STEP * 3.5 : STEP * 2.2, sparse ? 0.22 : 0.3, s % 2 ? 0.6 : -0.6); } }
  // FX
  if (build && pos === 0) riser(sampleAt(bar, 0), 8 * BAR, 0.2);
  if (drop && pos === 0) impact(sampleAt(bar, 0), 1);
  if (brk && pos === 0) impact(sampleAt(bar, 0), 0.5);
  if (last && build) { for (let s = 12; s < 16; s++) kick(sampleAt(bar, s), 0); }
}

// ---------- sidechain, delay, reverb ----------
for (const k of kickTimes) { const n = Math.round(0.28 * SR); for (let i = 0; i < n && k + i < N; i++) { const t = i / SR, d = 1 - 0.7 * Math.exp(-t * 11) * (t < 0.002 ? t / 0.002 : 1); if (d < duck[k + i]) duck[k + i] = d; } }
function pingPong(L, R, time, fb, wet) { const d = Math.round(time * SR), bl = new Float32Array(d), br = new Float32Array(d); let p = 0; for (let i = 0; i < N; i++) { const yl = bl[p], yr = br[p]; bl[p] = L[i] * 0.6 + yr * fb; br[p] = R[i] * 0.6 + yl * fb; L[i] += yl * wet; R[i] += yr * wet; p++; if (p >= d) p = 0; } }
pingPong(S.leadL, S.leadR, STEP * 3, 0.42, 0.45);
function reverb(inp, outL, outR, mix) { const C = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((x) => Math.round(x * 2.1)), A = [556, 441, 341, 225].map((x) => Math.round(x * 2.1));
  const run1 = (spread) => { const cb = C.map((c) => new Float32Array(c + spread)), ci = C.map(() => 0), cs = C.map(() => 0), ab = A.map((a) => new Float32Array(a + spread)), ai = A.map(() => 0); const out = new Float32Array(N);
    for (let i = 0; i < N; i++) { let s = 0; const x = inp[i] * 0.03; for (let k = 0; k < cb.length; k++) { const b = cb[k], y = b[ci[k]]; cs[k] = y * 0.8 + cs[k] * 0.2; b[ci[k]] = x + cs[k] * 0.86; if (++ci[k] >= b.length) ci[k] = 0; s += y; }
      for (let k = 0; k < ab.length; k++) { const b = ab[k], y = b[ai[k]]; b[ai[k]] = s + y * 0.5; s = y - s * 0.5; if (++ai[k] >= b.length) ai[k] = 0; } out[i] = s; } return out; };
  const l = run1(0), r = run1(23); for (let i = 0; i < N; i++) { outL[i] = l[i] * mix; outR[i] = r[i] * mix; } }
// ---------- automatizacion de filtros en pad y lead ----------
function autoLP(L, R, fAt) { const a = biquad('lp', 1000, 0.7), b = biquad('lp', 1000, 0.7), c = biquad('lp', 1000, 0.7), d = biquad('lp', 1000, 0.7); for (let i = 0; i < N; i++) { if (i % 128 === 0) { const f = fAt(i / SR / BAR); for (const q of [a, b, c, d]) Object.assign(q, biquad('lp', f, 0.7), { x1: q.x1, x2: q.x2, y1: q.y1, y2: q.y2 }); } L[i] = run(b, run(a, L[i])); R[i] = run(d, run(c, R[i])); } }
const fPad = (bar) => { const b = bounds, g = (n, k) => b.filter((x) => x.n === n)[k]; const sec = b.find((x) => bar >= x.s && bar < x.e) || b[b.length - 1], p = (bar - sec.s) / (sec.e - sec.s);
  if (sec.n === 'INTRO') return lerp(250, 1400, p); if (sec.n === 'BUILD') return lerp(1400, 5200, p); if (sec.n === 'DROP') return lerp(1600, 1000, p) + 300 * Math.sin(bar * 0.8); if (sec.n === 'BREAKDOWN') return lerp(2600, 4200, p); return lerp(2000, 250, p); };
autoLP(S.padL, S.padR, fPad);
autoLP(S.leadL, S.leadR, (bar) => { const sec = bounds.find((x) => bar >= x.s && bar < x.e) || bounds[bounds.length - 1]; return sec.n === 'DROP' ? 3600 + 2400 * Math.sin(bar * 0.45) : sec.n === 'BUILD' ? lerp(1500, 6000, (bar - sec.s) / (sec.e - sec.s)) : 3200; });

for (let i = 0; i < N; i++) rev[i] += (S.padL[i] + S.padR[i]) * 0.12;
reverb(rev, spaceL, spaceR, 1.0);

// ---------- mezcla ----------
const GAIN = { kick: 0.85, bass: 0.95, sub: 0.7, drums: 0.7, pad: 1.0, lead: 1.25, fx: 0.5, space: 0.85 };
const duckBy = (i, amt) => 1 - (1 - duck[i]) * amt;
const stems = {
  kick: { L: S.kick, R: S.kick, g: GAIN.kick }, sub: { L: S.sub, R: S.sub, g: GAIN.sub, d: 0.9 }, bass: { L: S.bass, R: S.bass, g: GAIN.bass, d: 0.8 }, drums: { L: S.drumsL, R: S.drumsR, g: GAIN.drums },
  pad: { L: S.padL, R: S.padR, g: GAIN.pad, d: 0.9 }, lead: { L: S.leadL, R: S.leadR, g: GAIN.lead, d: 0.45 }, fx: { L: S.fxL, R: S.fxR, g: GAIN.fx }, space: { L: spaceL, R: spaceR, g: GAIN.space, d: 0.4 },
};
for (const s of Object.values(stems)) { for (let i = 0; i < N; i++) { const k = s.g * (s.d ? duckBy(i, s.d) : 1); s.L[i] *= k; if (s.R !== s.L) s.R[i] *= k; } }
const mixL = mk(), mixR = mk(); let pk = 0;
for (let i = 0; i < N; i++) { let l = 0, r = 0; for (const s of Object.values(stems)) { l += s.L[i]; r += s.R[i]; } mixL[i] = l; mixR[i] = r; }
const hp = [biquad('hp', 28, 0.7), biquad('hp', 28, 0.7)];
for (let i = 0; i < N; i++) { mixL[i] = Math.tanh(run(hp[0], mixL[i]) * 1.15); mixR[i] = Math.tanh(run(hp[1], mixR[i]) * 1.15); pk = Math.max(pk, Math.abs(mixL[i]), Math.abs(mixR[i])); }
const norm = 0.89 / pk;

// ---------- exportar ----------
const slug = TITLE.toLowerCase().replace(/[^a-z0-9]+/g, '-'), dir = path.join(OUT, `${slug}_${new Date().toISOString().slice(0, 10)}`);
fs.mkdirSync(path.join(dir, 'stems'), { recursive: true });
const trimN = Math.round((BARS * BAR + 3.5) * SR);
function writeF32(L, R, g, file) { const buf = Buffer.alloc(trimN * 8); for (let i = 0; i < trimN; i++) { buf.writeFloatLE(L[i] * g, i * 8); buf.writeFloatLE(R[i] * g, i * 8 + 4); } fs.writeFileSync(file, buf); }
const ff = (args) => execFileSync(FFMPEG, ['-y', '-v', 'error', ...args], { windowsHide: true });
const raw = path.join(dir, '_mix.f32');
writeF32(mixL, mixR, norm, raw);
ff(['-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', raw, '-c:a', 'pcm_s24le', path.join(dir, '_premaster.wav')]);
// stems con ganancia comun (sin tanh), para el DAW
const stemG = 0.5 * norm;
for (const [n, s] of Object.entries(stems)) { const f = path.join(dir, `_${n}.f32`); writeF32(s.L, s.R, stemG, f); ff(['-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', f, '-c:a', 'pcm_s24le', path.join(dir, 'stems', `${slug}_stem_${n}.wav`)]); fs.unlinkSync(f); }
fs.unlinkSync(raw);
// masterizado: loudnorm en dos pasadas (lineal), objetivo -9.5 LUFS / -1 dBTP
const pre = path.join(dir, '_premaster.wav'), TGT = 'I=-10:TP=-1.5:LRA=9';
const m1 = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', pre, '-af', `loudnorm=${TGT}:print_format=json`, '-f', 'null', '-'], { windowsHide: true, encoding: 'utf8' }).stderr;
const mj = JSON.parse(m1.slice(m1.lastIndexOf('{'), m1.lastIndexOf('}') + 1));
const lnorm = `loudnorm=${TGT}:measured_I=${mj.input_i}:measured_TP=${mj.input_tp}:measured_LRA=${mj.input_lra}:measured_thresh=${mj.input_thresh}:offset=${mj.target_offset}:linear=true`;
const master = path.join(dir, `${slug}_master.wav`);
ff(['-i', pre, '-af', `${lnorm},alimiter=limit=0.84:level=false`, '-ar', '48000', '-c:a', 'pcm_s24le', master]);
const meta = ['-metadata', `title=${TITLE}`, '-metadata', 'artist=OpsAfterDark x AI Factory', '-metadata', 'album=AI Factory Sessions', '-metadata', 'genre=Techno/House', '-metadata', `comment=Compuesto por codigo (semilla ${SEED}). Motivo derivado de la actividad de agentes.`];
ff(['-i', master, '-c:a', 'libmp3lame', '-b:a', '320k', ...meta, path.join(dir, `${slug}_master.mp3`)]);
fs.unlinkSync(pre);
// medicion final + imagenes de revision
const m2 = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', master, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { windowsHide: true, encoding: 'utf8' }).stderr;
const grab = (re) => { const m = m2.match(re); return m ? +m[1] : null; };
const sumIdx = m2.lastIndexOf('Summary:'), sum = m2.slice(sumIdx);
const loud = { integrated_lufs: +(sum.match(/I:\s+(-?[\d.]+) LUFS/) || [])[1], lra: +(sum.match(/LRA:\s+([\d.]+) LU/) || [])[1], true_peak_dbtp: +(sum.match(/Peak:\s+(-?[\d.]+) dBFS/) || [])[1] };
ff(['-i', master, '-lavfi', 'showspectrumpic=s=1800x700:legend=0:scale=log', path.join(dir, 'review_spectrogram.png')]);
ff(['-i', master, '-lavfi', 'showwavespic=s=1800x300:colors=#39ff88', path.join(dir, 'review_waveform.png')]);
const report = { title: TITLE, artist: 'OpsAfterDark x AI Factory', created: new Date().toISOString(), seed: SEED, bpm: BPM, key: 'D minor', bars: BARS, duration_sec: Math.round(BARS * BAR),
  structure: bounds.map((b) => ({ section: b.n, bars: b.e - b.s, start_sec: +(b.s * BAR).toFixed(1) })), motif_steps: motif, motif_from_sessions: motifSource, agent_notes_used: agentNotes.length, loudness: loud,
  files: [`${slug}_master.wav`, `${slug}_master.mp3`, 'stems/*.wav', 'review_spectrogram.png', 'review_waveform.png'],
  provenance: 'Generado 100% por codigo (compose-track.mjs) sin muestras ni material de terceros. Requiere arreglo/mezcla humana para reforzar autoria; revisar derechos antes de publicar.' };
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ dir, duration_sec: report.duration_sec, loudness: loud, sections: report.structure.length, agent_notes_used: agentNotes.length }, null, 2));
