import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { starting, brb, ending, hud, summary, stream, alerts } from './scenes.mjs';
import { schedule, setTest } from './schedule.mjs';
import { musicTest } from './music-test.mjs';
import { analyzePage } from './analyze-page.mjs';

const port = 8765;
let previous = os.cpus().map((cpu) => ({ ...cpu.times }));
let gpu = { usage: null, temperature: null };

function refreshGpu() {
  execFile('nvidia-smi', ['--query-gpu=utilization.gpu,temperature.gpu', '--format=csv,noheader,nounits'], { windowsHide: true }, (error, stdout) => {
    if (error) return;
    const [usage, temperature] = stdout.trim().split(',').map((value) => Number.parseInt(value.trim(), 10));
    if (Number.isFinite(usage) && Number.isFinite(temperature)) gpu = { usage, temperature };
  });
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

function response() {
  const total = os.totalmem();
  const used = total - os.freemem();
  const battlefield = process.platform === 'win32';
  return JSON.stringify({
    cpu: cpuLoad(),
    ram: Math.round((used / total) * 100),
    ramGb: `${(used / 1024 ** 3).toFixed(1)} / ${(total / 1024 ** 3).toFixed(1)} GB`,
    gpu: gpu.usage,
    gpuTemp: gpu.temperature,
    status: battlefield ? 'LIVE · BATTLEFIELD' : 'LIVE',
  });
}

const overlay = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;background:transparent;color:#f8fbff;font-family:Bahnschrift,Arial,sans-serif}
.card{position:relative;width:500px;height:320px;padding:22px 27px;background:linear-gradient(135deg,rgba(6,10,18,.86),rgba(11,22,37,.78));border:1px solid rgba(75,196,255,.58);border-left:5px solid #47d7ff;box-shadow:0 0 22px rgba(27,174,255,.25)}
.title{font-family:Impact,Bahnschrift,Arial,sans-serif;font-size:37px;font-stretch:condensed;letter-spacing:1px;color:#f6f8fb;text-shadow:2px 2px 0 rgba(0,0,0,.7)}.title span{color:#65dfff}.live{float:right;color:#70ffac;font-size:12px;letter-spacing:1px;padding-top:11px}.line{height:1px;background:rgba(126,228,255,.35);margin:10px 0 14px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.metric{padding:10px 12px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.09)}.label{font-size:12px;letter-spacing:1px;color:#a8c4d6}.value{font-size:36px;font-weight:800;line-height:1.05;margin-top:3px}.unit{font-size:16px;color:#7ee4ff}.sub{font-size:12px;color:#a8c4d6;margin-top:3px}
</style></head><body><div class="card"><span class="title">BATTLEFIELD <span>6</span></span><span id="live" class="live">LIVE</span><div class="line"></div><div class="grid"><div class="metric"><div class="label">CPU</div><div class="value"><span id="cpu">--</span><span class="unit">%</span></div><div class="sub">SYSTEM LOAD</div></div><div class="metric"><div class="label">GPU</div><div class="value"><span id="gpu">--</span><span class="unit">%</span></div><div id="gpuTemp" class="sub">GPU LOAD</div></div><div class="metric"><div class="label">MEMORY</div><div class="value"><span id="ram">--</span><span class="unit">%</span></div><div id="ramGb" class="sub">SYSTEM MEMORY</div></div><div class="metric"><div class="label">STREAM FPS</div><div class="value">60<span class="unit"> FPS</span></div><div class="sub">OUTPUT TARGET</div></div></div></div><script>async function tick(){try{const d=await fetch('/metrics',{cache:'no-store'}).then(r=>r.json());cpu.textContent=d.cpu;gpu.textContent=d.gpu??'--';gpuTemp.textContent=d.gpuTemp?d.gpuTemp+' °C':'GPU LOAD';ram.textContent=d.ram;ramGb.textContent=d.ramGb;live.textContent=d.status}catch{live.textContent='LOCAL OVERLAY'}}tick();setInterval(tick,1500)</script></body></html>`;

const coding = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:100%;height:100%;background:transparent;font-family:Bahnschrift,Arial,sans-serif}.layout{position:relative;width:100%;height:100%;box-sizing:border-box;border:1px solid rgba(92,222,255,.4)}.terminal-frame{position:absolute;left:0;top:0;width:50%;height:100%;box-sizing:border-box;border-left:5px solid #48d8ff;border-right:1px solid rgba(92,222,255,.4);box-shadow:0 0 35px rgba(36,179,255,.18)}.side{position:absolute;right:0;top:0;width:50%;height:100%;box-sizing:border-box;padding:110px 80px;background:linear-gradient(135deg,rgba(6,14,24,.40),rgba(6,14,24,.08))}.title{font-family:Impact,Bahnschrift,Arial,sans-serif;font-size:82px;letter-spacing:5px;color:#f4f8ff;text-shadow:3px 3px 0 rgba(0,0,0,.65)}.title b{color:#64e1ff}.sub{margin-top:16px;color:#9fc4d6;font-size:20px;letter-spacing:2px}.line{height:1px;background:rgba(116,225,255,.35);margin:30px 0}.status{color:#70ffac;font-size:18px;letter-spacing:2px}.note{position:absolute;right:80px;bottom:70px;color:#749aaa;font-size:15px;letter-spacing:2px}
</style></head><body><div class="layout"><div class="terminal-frame"></div><div class="side"><div class="title">VIBE <b>CODING</b></div><div class="sub">OPS AFTER DARK · LIVE BUILD SESSION</div><div class="line"></div><div class="status">● LOCAL DEVELOPMENT</div><div class="note">WINDOW CAPTURE ONLY · DESKTOP HIDDEN</div></div></div></body></html>`;

const vibe = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:transparent;font-family:Bahnschrift,Arial,sans-serif}.tag{height:80px;box-sizing:border-box;padding:16px 20px;border-left:4px solid #50ddff;border-top:1px solid rgba(102,224,255,.45);background:linear-gradient(90deg,rgba(6,14,24,.68),rgba(6,14,24,.10));color:#f6fbff;font-size:29px;font-weight:800;letter-spacing:3px;text-shadow:1px 1px 0 rgba(0,0,0,.8)}.tag b{color:#62e3ff}.tag small{display:block;margin-top:3px;font-size:10px;letter-spacing:1.8px;color:#a7cbd8}
</style></head><body><div class="tag">VIBE <b>CODING</b><small>OPS AFTER DARK · LIVE</small></div></body></html>`;


// Alertas: solo eventos simulados. Nada aquí se conecta a Twitch; ver README.
let musicTestState = { play: false, file: '' };
const alertQueue = [];
const alertTypes = new Set(['follow', 'sub', 'raid']);
const isLocalTool = (request) => request.method === 'POST' && request.headers['x-stream-tool'] === '1';
function json(reply, status, body) {
  reply.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  reply.end(JSON.stringify(body));
}
function handleApi(request, reply) {
  const url = new URL(request.url, 'http://127.0.0.1');
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
      reply.end(fs.readFileSync(new URL('./.analysis/' + analysisFile[1], import.meta.url)));
    } catch { reply.writeHead(404); reply.end(); }
    return true;
  }
  if (url.pathname === '/nowplaying') {
    // Primera línea de music/nowplaying.txt = nombre; segunda (opcional) = detalle. Vacío = widget oculto.
    let lines = [];
    try { lines = fs.readFileSync(new URL('./music/nowplaying.txt', import.meta.url), 'utf8').split(/\r?\n/).map((l) => l.trim()); } catch {}
    return json(reply, 200, { name: (lines[0] || '').slice(0, 60), detail: (lines[1] || '').slice(0, 80) }), true;
  }
  const pattern = url.pathname.match(/^\/music\/([\w-]+\.strudel)$/);
  if (pattern) {
    // Solo lectura de los patrones; CORS abierto para poder cargarlos desde el REPL de Strudel.
    try {
      reply.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'no-store' });
      reply.end(fs.readFileSync(new URL(`./music/${pattern[1]}`, import.meta.url)));
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
    reply.end(fs.readFileSync(new URL('./activity.json', import.meta.url)));
    return;
  }
  reply.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  const pages = { '/coding': coding, '/vibe': vibe, '/starting': starting, '/brb': brb, '/ending': ending, '/hud': hud, '/summary': summary, '/stream': stream, '/alerts': alerts };
  reply.end(pages[request.url] ?? overlay);
}).listen(port, '127.0.0.1', () => console.log(`Stream overlay listening on 127.0.0.1:${port}`));
