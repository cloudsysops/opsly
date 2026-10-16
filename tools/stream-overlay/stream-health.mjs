// Vigilante de salud del directo (solo lectura). Espera a que salgas en vivo; entonces anota una linea cada 10 s en stream-health.log y avisa si algo se degrada. Termina al cortar el directo.
// Uso: node stream-health.mjs [minutos]      (por defecto 120)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { withObs } from './obs.mjs';
const MIN = +process.argv[2] || 120, LOG = new URL('./stream-health.log', import.meta.url);
const smi = () => { try { const o = execFileSync('nvidia-smi', ['--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu', '--format=csv,noheader,nounits'], { encoding: 'utf8' }).trim().split(/,\s*/); return { gpu: +o[0], vram: Math.round(100 * o[1] / o[2]), temp: +o[3] }; } catch { return { gpu: 0, vram: 0, temp: 0 }; } };
const out = (l) => { fs.appendFileSync(LOG, l + '\n'); };
out(`--- vigilante iniciado ${new Date().toISOString()} (${MIN} min)`);
await withObs(async (r) => {
  let prev = await r('GetStreamStatus'); let wasLive = prev.outputActive; const end = Date.now() + MIN * 60_000; let bad = 0;
  while (Date.now() < end) {
    await new Promise((s) => setTimeout(s, 10_000));
    const st = await r('GetStreamStatus'), s = await r('GetStats'), g = smi();
    if (!st.outputActive) { if (!wasLive) { prev = st; continue; } out(`${new Date().toLocaleTimeString('es-CO')} fuera de linea`); break; }
    if (!wasLive) { wasLive = true; out(`${new Date().toLocaleTimeString('es-CO')} directo detectado: empieza el registro`); prev = st; continue; }
    const dSk = st.outputSkippedFrames - prev.outputSkippedFrames, dTot = Math.max(1, st.outputTotalFrames - prev.outputTotalFrames), pct = 100 * dSk / dTot;
    const flag = pct > 5 ? ' ⚠ CODIFICADOR' : s.activeFps < 45 ? ' ⚠ FPS' : st.outputCongestion > 0.5 ? ' ⚠ RED' : g.vram > 95 ? ' ⚠ VRAM' : '';
    bad = flag ? bad + 1 : 0;
    out(`${new Date().toLocaleTimeString('es-CO')} fps ${s.activeFps.toFixed(0)} | perdidos ${pct.toFixed(1)}% | red ${st.outputCongestion.toFixed(2)} | GPU ${g.gpu}% VRAM ${g.vram}% ${g.temp}C | cpuOBS ${s.cpuUsage.toFixed(1)}%${flag}${bad >= 3 ? '  <<< 3 lecturas malas seguidas' : ''}`);
    prev = st;
  }
}, (MIN + 2) * 60_000);
out('--- vigilante terminado');
