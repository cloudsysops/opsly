import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { schedule, setTest } from './schedule.mjs';
import { musicTest } from './music-test.mjs';
import { analyzePage } from './analyze-page.mjs';
import { tenantPath } from './tenant-paths.mjs';
import { tenantConfig } from './tenant-config.mjs';
// GPU vía el telemetry compartido del worker pc-gamer (mismo host, mismo nvidia-smi;
// evita una segunda lectura/parseo de GPU — ver docs/04-infrastructure/PC-GAMER-WORKER.md).
// Ruta relativa dentro del monorepo: packages/stream-ops-kit/src -> scripts/ops.
import { collectNvidiaTelemetry } from '../../../scripts/ops/creator-system-telemetry.mjs';

// El branding (starting/brb/ending/hud/summary/stream/alerts/overlay/coding/vibe) vive
// en scenes.mjs dentro de la carpeta de datos del tenant, no en este motor genérico.
const tenantScenes = await import(pathToFileURL(tenantPath('scenes.mjs')).href);
const { starting, brb, ending, hud, summary, stream, alerts, overlay, coding, vibe } = tenantScenes;

const config = tenantConfig();
const apiBase = config.apiBase ?? 'http://127.0.0.1:8765';
const port = Number(new URL(apiBase).port) || 8765;
const host = new URL(apiBase).hostname || '127.0.0.1';

let previous = os.cpus().map((cpu) => ({ ...cpu.times }));
let gpu = { usage: null, temperature: null };
let gpuHighSince = null; // timestamp desde que el uso de GPU está >= umbral sin bajar

const alertsCfg = config.alerts ?? {};
const GPU_HIGH_PERCENT = alertsCfg.gpuHighPercent ?? 95;
const GPU_HIGH_SUSTAINED_MIN = alertsCfg.gpuHighSustainedMinutes ?? 5;

async function refreshGpu() {
  const t = await collectNvidiaTelemetry({ timeoutMs: 1200 });
  const device = t.devices?.[0];
  if (!device) return; // no disponible ahora mismo; se conserva la última lectura buena
  gpu = { usage: device.utilizationGpuPercent, temperature: device.temperatureC };
  if (gpu.usage >= GPU_HIGH_PERCENT) gpuHighSince ??= Date.now();
  else gpuHighSince = null;
}

refreshGpu();
setInterval(refreshGpu, 1500).unref();

function cpuLoad() {
  const current = os.cpus().map((cpu) => cpu.times);
  let idle = 0;
  let total = 0;
  for (let index = 0; index < current.length; index += 1) {
    const before = previous[index];
    const after = current[index];
    const beforeTotal = Object.values(before).reduce((sum, value) => sum + value, 0);
    const afterTotal = Object.values(after).reduce((sum, value) => sum + value, 0);
    idle += after.idle - before.idle;
    total += afterTotal - beforeTotal;
  }
  previous = current.map((times) => ({ ...times }));
  return total ? Math.round((1 - idle / total) * 100) : 0;
}

function metricsSnapshot() {
  const total = os.totalmem();
  const used = total - os.freemem();
  const gpuHighMinutes = gpuHighSince ? (Date.now() - gpuHighSince) / 60000 : 0;
  return {
    cpu: cpuLoad(),
    ram: Math.round((used / total) * 100),
    ramGb: `${(used / 1024 ** 3).toFixed(1)} / ${(total / 1024 ** 3).toFixed(1)} GB`,
    gpu: gpu.usage,
    gpuTemp: gpu.temperature,
    status: config.game?.liveStatusLabel ?? 'LIVE',
    gpuHighMinutes: Math.round(gpuHighMinutes * 10) / 10,
    gpuAlert: gpuHighMinutes >= GPU_HIGH_SUSTAINED_MIN,
  };
}
function response() {
  return JSON.stringify(metricsSnapshot());
}

// Historial liviano para poder ver tendencia entre streams (¿esto necesita
// mantenimiento/upgrade?), no solo el estado del momento. Un renglón cada 60s.
const METRICS_LOG_INTERVAL_MS = 60000;
function logMetricsSnapshot() {
  const snap = metricsSnapshot();
  if (snap.cpu == null && snap.gpu == null) return; // aún sin datos válidos de nvidia-smi
  const line = JSON.stringify({ t: new Date().toISOString(), ...snap }) + '\n';
  try { fs.appendFileSync(tenantPath('metrics-history.jsonl'), line); } catch {}
}
setInterval(logMetricsSnapshot, METRICS_LOG_INTERVAL_MS).unref();

// Alertas: solo eventos simulados. Nada aquí se conecta a Twitch; ver README del tenant.
let musicTestState = { play: false, file: '' };
const alertQueue = [];
const alertTypes = new Set(['follow', 'sub', 'raid']);
const isLocalTool = (request) => request.method === 'POST' && request.headers['x-stream-tool'] === '1';
function json(reply, status, body) {
  reply.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  reply.end(JSON.stringify(body));
}
function handleApi(request, reply) {
  const url = new URL(request.url, `http://${host}`);
  if (url.pathname === '/schedule') return json(reply, 200, schedule()), true;
  if (url.pathname === '/schedule/test') {
    if (!isLocalTool(request)) return json(reply, 403, { error: 'forbidden' }), true;
    setTest(Number(url.searchParams.get('secs')) || 0);
    return json(reply, 200, schedule()), true;
  }
  if (url.pathname === '/music-test') return reply.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }), reply.end(musicTest), true;
  if (url.pathname === '/music-test/state') {
    if (request.method === 'POST') {
      if (!isLocalTool(request)) return json(reply, 403, { error: 'forbidden' }), true;
      const file = url.searchParams.get('file') || '';
      musicTestState = { play: url.searchParams.get('play') === '1' && /^[\w-]+\.strudel$/.test(file), file };
    }
    return json(reply, 200, musicTestState), true;
  }
  if (url.pathname === '/analyze') return reply.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }), reply.end(analyzePage), true;
  const analysisFile = url.pathname.match(/^\/analysis\/(track\d\.aac|meta\.json)$/);
  if (analysisFile) {
    // Solo las pistas extraídas por extract-audio-tracks.mjs para la prueba de VOD.
    try {
      reply.writeHead(200, { 'content-type': analysisFile[1].endsWith('.json') ? 'application/json' : 'audio/aac', 'cache-control': 'no-store' });
      reply.end(fs.readFileSync(path.join(tenantPath('.analysis'), analysisFile[1])));
    } catch { reply.writeHead(404); reply.end(); }
    return true;
  }
  if (url.pathname === '/nowplaying') {
    // Primera línea de music/nowplaying.txt = nombre; segunda (opcional) = detalle. Vacío = widget oculto.
    let lines = [];
    try { lines = fs.readFileSync(tenantPath('music', 'nowplaying.txt'), 'utf8').split(/\r?\n/).map((l) => l.trim()); } catch {}
    return json(reply, 200, { name: (lines[0] || '').slice(0, 60), detail: (lines[1] || '').slice(0, 80) }), true;
  }
  const pattern = url.pathname.match(/^\/music\/([\w-]+\.strudel)$/);
  if (pattern) {
    // Solo lectura de los patrones; CORS abierto para poder cargarlos desde el REPL de Strudel.
    try {
      reply.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'no-store' });
      reply.end(fs.readFileSync(tenantPath('music', pattern[1])));
    } catch { reply.writeHead(404); reply.end(); }
    return true;
  }
  if (url.pathname === '/alerts/next') return json(reply, 200, alertQueue.shift() ?? null), true;
  if (url.pathname === '/alerts/test') {
    if (!isLocalTool(request)) return json(reply, 403, { error: 'forbidden' }), true;
    const type = url.searchParams.get('type');
    if (!alertTypes.has(type)) return json(reply, 400, { error: 'type must be follow|sub|raid' }), true;
    alertQueue.push({ type, test: true, name: (url.searchParams.get('name') || 'UsuarioDePrueba').slice(0, 25), months: Number(url.searchParams.get('months')) || 1, viewers: Number(url.searchParams.get('viewers')) || 42 });
    return json(reply, 200, { queued: alertQueue.length }), true;
  }
  if (url.pathname === '/alerts/push') {
    // Eventos REALES de Twitch (EventSub vía twitch-eventsub.mjs), no simulados. Local-only.
    if (!isLocalTool(request)) return json(reply, 403, { error: 'forbidden' }), true;
    const type = url.searchParams.get('type');
    if (!alertTypes.has(type)) return json(reply, 400, { error: 'type must be follow|sub|raid' }), true;
    const name = (url.searchParams.get('name') || '').slice(0, 25);
    if (!name) return json(reply, 400, { error: 'name required' }), true;
    alertQueue.push({ type, test: false, name, months: Number(url.searchParams.get('months')) || 1, viewers: Number(url.searchParams.get('viewers')) || 0 });
    return json(reply, 200, { queued: alertQueue.length }), true;
  }
  return false;
}

http.createServer((request, reply) => {
  if (handleApi(request, reply)) return;
  if (request.url === '/metrics') {
    reply.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    reply.end(response());
    return;
  }
  if (request.url === '/activity') {
    reply.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    reply.end(fs.readFileSync(tenantPath('activity.json')));
    return;
  }
  reply.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  const pages = { '/coding': coding, '/vibe': vibe, '/starting': starting, '/brb': brb, '/ending': ending, '/hud': hud, '/summary': summary, '/stream': stream, '/alerts': alerts };
  reply.end(pages[request.url] ?? overlay);
}).listen(port, host, () => console.log(`Stream overlay listening on ${host}:${port}`));
