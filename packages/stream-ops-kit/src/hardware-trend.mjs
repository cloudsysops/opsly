// Lee metrics-history.jsonl (un renglón cada 60s, escrito por server.mjs) y agrupa
// por sesión de stream (huecos > 30 min = sesión nueva). Da una señal heurística de
// tendencia, NO un diagnóstico de hardware real — solo indica cuándo vale la pena
// mirar con más cuidado (curva de temps, mantenimiento físico, o considerar upgrade).
//   node hardware-trend.mjs            reporte de las últimas 10 sesiones
//   node hardware-trend.mjs --all      todas las sesiones registradas
import fs from 'node:fs';
import { tenantPath } from './tenant-paths.mjs';

const SESSION_GAP_MS = 30 * 60 * 1000;

function loadRows() {
  let text;
  try { text = fs.readFileSync(tenantPath('metrics-history.jsonl'), 'utf8'); }
  catch { return []; }
  return text.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

function groupSessions(rows) {
  const sessions = [];
  let current = null;
  let lastT = null;
  for (const r of rows) {
    const t = new Date(r.t).getTime();
    if (!current || (lastT !== null && t - lastT > SESSION_GAP_MS)) {
      current = { start: r.t, rows: [] };
      sessions.push(current);
    }
    current.rows.push(r);
    lastT = t;
  }
  return sessions;
}

function summarize(session) {
  const rows = session.rows.filter((r) => Number.isFinite(r.gpu));
  if (!rows.length) return null;
  const gpuVals = rows.map((r) => r.gpu);
  const tempVals = rows.map((r) => r.gpuTemp).filter(Number.isFinite);
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const maxSustainedHighMin = Math.max(0, ...rows.map((r) => r.gpuHighMinutes ?? 0));
  return {
    date: session.start.slice(0, 10),
    minutes: Math.round((rows.length * 1) ), // ~1 renglón/min
    avgGpu: Math.round(avg(gpuVals)),
    maxGpu: Math.max(...gpuVals),
    avgTemp: tempVals.length ? Math.round(avg(tempVals)) : null,
    maxTemp: tempVals.length ? Math.max(...tempVals) : null,
    maxSustainedHighMin: Math.round(maxSustainedHighMin * 10) / 10,
    alertHit: rows.some((r) => r.gpuAlert),
  };
}

const rows = loadRows();
if (!rows.length) {
  console.log('Sin historial todavía (metrics-history.jsonl vacío o no existe). Corre unas sesiones con el servidor activo primero.');
  process.exit(0);
}

const all = groupSessions(rows).map(summarize).filter(Boolean);
const showAll = process.argv.includes('--all');
const sessions = showAll ? all : all.slice(-10);

console.log(`${sessions.length} de ${all.length} sesiones registradas:\n`);
console.log('fecha        min   GPU avg/max   temp avg/max   alerta sostenida');
for (const s of sessions) {
  console.log(`${s.date}   ${String(s.minutes).padStart(3)}   ${String(s.avgGpu).padStart(3)}%/${String(s.maxGpu).padStart(3)}%      ${s.avgTemp ?? '?'}°/${s.maxTemp ?? '?'}°       ${s.alertHit ? `⚠️  ${s.maxSustainedHighMin}min` : '—'}`);
}

// Señal heurística: si las últimas 3 sesiones tuvieron alerta sostenida, o la temp
// promedio viene subiendo sesión a sesión, vale la pena mirarlo con más cuidado.
const last3 = all.slice(-3);
const alertStreak = last3.length === 3 && last3.every((s) => s.alertHit);
const temps = all.map((s) => s.avgTemp).filter(Number.isFinite);
const tempTrendUp = temps.length >= 4 && temps.slice(-3).every((t, i, arr) => i === 0 || t >= arr[i - 1]) && temps.at(-1) - temps.at(-4) >= 5;

console.log('');
if (alertStreak || tempTrendUp) {
  console.log('🟠 SEÑAL: ' + [
    alertStreak && 'las últimas 3 sesiones tuvieron GPU sostenida en alerta',
    tempTrendUp && 'la temperatura promedio viene subiendo sesión a sesión (+5°C o más)',
  ].filter(Boolean).join(' y ') + '.');
  console.log('   Vale la pena revisar limpieza/pasta térmica, o si el equipo ya está en su límite para este juego a esta calidad.');
} else {
  console.log('🟢 Sin señal de tendencia preocupante en las sesiones registradas. Esto es heurístico, no un diagnóstico de hardware real.');
}
