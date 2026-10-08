// Panel "VIBE CODING · EN VIVO" para OBS. Servidor aparte (127.0.0.1:8766), solo lectura.
// Muestra actividad real: herramientas/archivos de Claude Code (nunca el contenido de codigo ni comandos)
// y archivos que cambian en Git. Uso: node vibe-live.mjs   ->  fuente de navegador http://127.0.0.1:8766/
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { factoryPage } from './factory-page.mjs';
import { festivalPage } from './festival-page.mjs';
import { withObs, scenes as SCENE_MAP } from './obs.mjs';
import { controlPage } from './control-page.mjs';

const PORT = 8766;
const REPOS = ['C:/Users/opsly/OneDrive/Documents/ChatGPT/intcloudsysops', 'C:/Users/opsly/opsly'];
const PROJECTS = path.join(os.homedir(), '.claude', 'projects');
const SECRET = /(^|[\\/])(\.env|id_rsa|.*\.(pem|key|pfx|p12)|.*secret.*|.*token.*|.*credential.*|.*password.*)([\\/.]|$)/i;
const SKIP_DIR = /(node_modules|\.git|\.next|dist|build)[\\/]/i;
const LABELS = { Read: 'Lee', Edit: 'Edita', Write: 'Crea', Grep: 'Busca', Glob: 'Busca archivos', Bash: 'Terminal', PowerShell: 'Terminal', Agent: 'Agente', WebSearch: 'Busca en la web', WebFetch: 'Lee la web', Artifact: 'Publica' };

function recentTranscripts() {
  const out = [];
  try {
    for (const d of fs.readdirSync(PROJECTS)) {
      const dir = path.join(PROJECTS, d);
      for (const f of fs.readdirSync(dir)) if (f.endsWith('.jsonl')) { const p = path.join(dir, f); out.push({ p, m: fs.statSync(p).mtimeMs }); }
    }
  } catch {}
  return out.sort((a, b) => b.m - a.m).slice(0, 2);
}

// ---- actividad de otros agentes (Cursor, Codex/ChatGPT, Claude desktop) por uso de CPU de sus procesos
const PROC = [];
const MAP = { Cursor: { tool: 'Edit', label: 'Cursor' }, ChatGPT: { tool: 'Write', label: 'Codex' }, codex: { tool: 'Write', label: 'Codex' }, claude: { tool: 'Agent', label: 'Claude' } };
let prevCpu = null, prevT = 0;
function sampleProcs() {
  execFile('powershell', ['-NoProfile', '-Command', "Get-Process claude,Cursor,ChatGPT,codex -ErrorAction SilentlyContinue | Group-Object ProcessName | ForEach-Object { [pscustomobject]@{ n = $_.Name; c = ($_.Group | Measure-Object CPU -Sum).Sum } } | ConvertTo-Json -Compress"], { windowsHide: true, timeout: 5000 }, (e, out) => {
    if (e || !out.trim()) return;
    let arr; try { arr = JSON.parse(out); } catch { return; } if (!Array.isArray(arr)) arr = [arr];
    const now = Date.now(), cur = Object.fromEntries(arr.map((x) => [x.n, x.c]));
    if (prevCpu) { const dt = (now - prevT) / 1000; for (const n of Object.keys(cur)) { const d = (cur[n] - (prevCpu[n] ?? cur[n])) / dt; if (d > 0.12 && MAP[n]) PROC.push({ t: now, tool: MAP[n].tool, label: MAP[n].label, target: 'trabajando ' + Math.round(d * 100) + '% CPU' }); } }
    prevCpu = cur; prevT = now; while (PROC.length > 60) PROC.shift();
  });
}
setInterval(sampleProcs, 3000); sampleProcs();

function tailEvents() {
  const events = [];
  for (const { p } of recentTranscripts()) {
    try {
      const fd = fs.openSync(p, 'r'); const size = fs.fstatSync(fd).size; const len = Math.min(size, 600_000);
      const buf = Buffer.alloc(len); fs.readSync(fd, buf, 0, len, size - len); fs.closeSync(fd);
      for (const line of buf.toString('utf8').split('\n').slice(1)) {
        if (!line.includes('"tool_use"')) continue;
        let j; try { j = JSON.parse(line); } catch { continue; }
        const t = Date.parse(j.timestamp);
        for (const c of j.message?.content ?? []) {
          if (c.type !== 'tool_use') continue;
          const name = c.name.replace(/^mcp__.*__/, '');
          const inp = c.input ?? {};
          let target = '';
          const fp = inp.file_path || inp.path || inp.notebook_path;
          if (fp && !SECRET.test(fp)) target = path.basename(String(fp));
          else if (inp.pattern && !fp) target = '';
          else if ((name === 'Bash' || name === 'PowerShell') && inp.description) target = String(inp.description).slice(0, 70);
          events.push({ t: Number.isFinite(t) ? t : Date.now(), tool: name, label: LABELS[name] ?? name.replace(/_/g, ' '), target });
        }
      }
    } catch {}
  }
  events.push(...PROC);
  const since = Date.now() - 30 * 60_000;
  return events.filter((e) => e.t >= since).sort((a, b) => a.t - b.t).slice(-40);
}

const sh = (cwd, args) => new Promise((res) => execFile('git', args, { cwd, timeout: 4000, windowsHide: true }, (e, out) => res(e ? '' : out)));
async function gitInfo() {
  const files = []; const commits = [];
  for (const r of REPOS) {
    const [num, log] = await Promise.all([sh(r, ['diff', 'HEAD', '--numstat']), sh(r, ['log', '-3', '--pretty=%ct|%s'])]);
    for (const l of num.split('\n')) { const [a, d, f] = l.split('\t'); if (!f || SKIP_DIR.test(f) || SECRET.test(f)) continue; files.push({ name: path.basename(f), add: +a || 0, del: +d || 0 }); }
    const un = await sh(r, ['ls-files', '--others', '--exclude-standard']);
    for (const f of un.split('\n').filter(Boolean).slice(0, 400)) {
      if (SKIP_DIR.test(f + '/') || SECRET.test(f) || !/\.(m?[jt]sx?|json|md|ps1|css|html|py)$/i.test(f)) continue;
      try { const p = path.join(r, f); const st = fs.statSync(p); if (Date.now() - st.mtimeMs < 3_600_000 && st.size < 400_000) files.push({ name: path.basename(f), add: fs.readFileSync(p, 'utf8').split('\n').length, del: 0 }); } catch {}
    }
    for (const l of log.split('\n')) { const i = l.indexOf('|'); if (i > 0) commits.push({ t: +l.slice(0, i) * 1000, msg: l.slice(i + 1).slice(0, 80) }); }
  }
  return { files: files.sort((a, b) => b.add + b.del - (a.add + a.del)).slice(0, 5), commits: commits.sort((a, b) => b.t - a.t).slice(0, 3) };
}

// ---- audio de OBS (medidores) -> /audio
const audio = { factory: 0, strudel: 0, ddj: 0, game: 0, beats: 0, bpm: 0, last: 0, ema: 0, iv: [] };
const NAMES = { factory: /FACTORY Hacker/i, strudel: /strudel/i, ddj: /METER DDJ/i, game: /^GAME_AUDIO$/ };
function onMeters(e) {
  if (e.eventType !== 'InputVolumeMeters') return;
  for (const i of e.eventData.inputs) {
    const k = Object.keys(NAMES).find((n) => NAMES[n].test(i.inputName)); if (!k) continue;
    const peak = Math.max(0, ...i.inputLevelsMul.map((c) => c[1] || 0));
    audio[k] = peak;
  }
  const lvl = Math.max(audio.strudel, audio.ddj, audio.factory); const now = Date.now();
  if (lvl > 0.06 && lvl > audio.ema * 1.45 && now - audio.last > 260) {
    audio.beats++; if (audio.last) { audio.iv.push(now - audio.last); audio.iv = audio.iv.slice(-12); const med = [...audio.iv].sort((a, b) => a - b)[audio.iv.length >> 1]; let b = 60000 / med; while (b < 80) b *= 2; while (b > 180) b /= 2; audio.bpm = Math.round(b); } audio.last = now;
  }
  audio.ema = audio.ema * 0.92 + lvl * 0.08;
}
(async function meters() {
  for (;;) { try { await withObs(() => new Promise(() => {}), 2_000_000_000, { eventSubscriptions: 1 << 16, onEvent: onMeters }); } catch {} await new Promise((r) => setTimeout(r, 3000)); }
})();
const nowPlaying = () => { try { return fs.readFileSync(new URL('./music/nowplaying.txt', import.meta.url), 'utf8').trim().split(/\r?\n/).slice(0, 2); } catch { return []; } };

const sonFile = new URL('./music/sonify.json', import.meta.url);
let son = { on: false, vol: 0.25 }; try { son = { ...son, ...JSON.parse(fs.readFileSync(sonFile, 'utf8')) }; } catch {}
son.on = false; // siempre arranca apagado: nunca suena al aire sin que lo actives

// ---- grabacion de la musica de la factory: audio + MIDI + registro de procedencia
const MUSIC_DIR = 'D:/Content/Music/Factory';
const FFMPEG = 'C:/Users/opsly/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe';
const rec = { on: false, id: '', dir: '', stream: null, started: 0, bytes: 0 };
const vlq = (n) => { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; };
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
function buildMidi(events, bpm) {
  const PPQ = 480, tick = (s) => Math.max(0, Math.round(s * (bpm / 60) * PPQ));
  const chunk = (data) => Buffer.from([0x4d, 0x54, 0x72, 0x6b, ...u32(data.length), ...data]);
  const names = { 1: 'Lead (Edit/Write)', 2: 'Bass', 3: 'Pluck (Read/Grep)', 4: 'Stab (Agent)', 5: 'Pad', 9: 'Drums' };
  const meta = (ch) => { const nm = Buffer.from(names[ch] ?? 'Track'); return [0, 0xff, 0x03, nm.length, ...nm]; };
  const mpqn = Math.round(60_000_000 / bpm);
  const tracks = [chunk([0, 0xff, 0x03, 7, ...Buffer.from('Factory'), 0, 0xff, 0x51, 3, (mpqn >> 16) & 255, (mpqn >> 8) & 255, mpqn & 255, 0, 0xff, 0x58, 4, 4, 2, 24, 8, 0, 0xff, 0x2f, 0])];
  for (const ch of [...new Set(events.map((e) => e.ch))].sort()) {
    const ev = [];
    for (const e of events.filter((x) => x.ch === ch)) {
      const n = Math.min(127, Math.max(0, e.n)), v = Math.min(127, Math.max(30, e.v | 0));
      ev.push({ t: tick(e.t), b: [0x90 | ch, n, v] }, { t: tick(e.t + Math.max(0.05, e.d)), b: [0x80 | ch, n, 0] });
    }
    ev.sort((a, b) => a.t - b.t || (a.b[0] & 0xf0) - (b.b[0] & 0xf0));
    let last = 0; const data = [...meta(ch)];
    for (const e of ev) { data.push(...vlq(e.t - last), ...e.b); last = e.t; }
    data.push(0, 0xff, 0x2f, 0); tracks.push(chunk(data));
  }
  return Buffer.concat([Buffer.from([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length, PPQ >> 8, PPQ & 255]), ...tracks]);
}
function recStart() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  rec.id = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  rec.dir = `${MUSIC_DIR}/session_${rec.id}`; fs.mkdirSync(rec.dir, { recursive: true });
  rec.stream = fs.createWriteStream(`${rec.dir}/raw.webm`); rec.started = Date.now(); rec.bytes = 0; rec.on = true;
}
function recFinish(body) {
  try { rec.stream?.end(); } catch {}
  const dir = rec.dir, id = rec.id; rec.stream = null;
  let info = {}; try { info = JSON.parse(body); } catch {}
  const events = Array.isArray(info.events) ? info.events : [];
  const bpm = info.bpm || 124;
  if (events.length) fs.writeFileSync(`${dir}/session.mid`, buildMidi(events, bpm));
  fs.writeFileSync(`${dir}/session.json`, JSON.stringify({
    id, created: new Date().toISOString(), seconds: Math.round(info.secs || 0), bpm, key: 'D minor', notes: events.length,
    generator: 'Opsly AI Factory sonification (stream-overlay/factory-page.mjs)',
    provenance: 'Notas generadas por codigo propio a partir de la actividad de agentes de software. Sin muestras ni material de terceros.',
    files: ['session.wav', 'session.mid', 'raw.webm'],
  }, null, 2));
  execFile(FFMPEG, ['-y', '-v', 'error', '-i', `${dir}/raw.webm`, '-ar', '48000', '-c:a', 'pcm_s24le', `${dir}/session.wav`], { windowsHide: true }, (e) => {
    if (e) console.log('ffmpeg wav fallo:', e.message); else console.log('sesion guardada:', dir);
  });
}

// ---- SET: estructura de festival (intro -> build -> drop -> breakdown -> build -> drop -> outro)
const BASE = [['INTRO', 120, 0.3], ['BUILD', 120, 0.65], ['DROP', 240, 1], ['BREAKDOWN', 120, 0.35], ['BUILD', 90, 0.7], ['DROP', 240, 1], ['OUTRO', 120, 0.25]];
const setSt = { on: false, start: 0, scale: 1, prevScene: '', rec: false };
const SET_SCENE = 'Festival — AI Set';
function setInfo() {
  if (!setSt.on) return { on: false };
  const secs = BASE.map(([n, d, t]) => ({ n, d: d * setSt.scale, t }));
  const total = secs.reduce((a, x) => a + x.d, 0), el = (Date.now() - setSt.start) / 1000;
  if (el >= total) { endSet(); return { on: false }; }
  let acc = 0, i = 0; while (i < secs.length - 1 && el >= acc + secs[i].d) { acc += secs[i].d; i++; }
  const left = acc + secs[i].d - el;
  return { on: true, idx: i, name: secs[i].n, target: secs[i].t, next: (secs[i + 1] ?? { n: 'FIN' }).n, secLeft: left, elapsed: el, total, remaining: total - el };
}
async function obsScene(name) { try { return await withObs(async (r) => { const prev = (await r('GetCurrentProgramScene')).sceneName; if (name) await r('SetCurrentProgramScene', { sceneName: name }); return prev; }, 4000); } catch { return ''; } }
async function startSet(min, dry = false) {
  setSt.scale = Math.max(0.05, (min * 60) / BASE.reduce((a, x) => a + x[1], 0)); setSt.start = Date.now(); setSt.on = true; setSt.dry = dry;
  if (dry) return;
  son.on = true; son.vol = Math.max(son.vol, 0.35);
  if (!rec.on) { recStart(); setSt.rec = true; }
  setSt.prevScene = await obsScene(SET_SCENE);
}
async function endSet() {
  if (!setSt.on) return; setSt.on = false; if (setSt.dry) return; son.on = false;
  if (setSt.rec) { rec.on = false; setSt.rec = false; }
  if (setSt.prevScene && setSt.prevScene !== SET_SCENE) await obsScene(setSt.prevScene);
}

// ---- look (colores del proyector), persistente
const lookFile = new URL('./music/look.json', import.meta.url);
const PALETTES = ['neon', 'fuego', 'hielo', 'matrix', 'ultravioleta', 'oro', 'arcoiris', 'mono'];
let look = { palette: 'neon', hue: 0 }; try { look = { ...look, ...JSON.parse(fs.readFileSync(lookFile, 'utf8')) }; } catch {}
const saveLook = () => { try { fs.writeFileSync(lookFile, JSON.stringify(look)); } catch {} };

let cache = null, busy = false;
async function refresh() {
  if (busy) return; busy = true;
  try { cache = await buildFeed(); } catch {} finally { busy = false; }
}
async function feed() { if (!cache) await refresh(); return cache ? { ...cache, working: cache.events.length > 0 && Date.now() - cache.events.at(-1).t < 25_000 } : { events: [], rate: [], files: [], commits: [], working: false }; }

async function buildFeed() {
  const events = tailEvents(); const now = Date.now();
  const rate = Array.from({ length: 30 }, (_, i) => events.filter((e) => e.t >= now - (30 - i) * 60_000 && e.t < now - (29 - i) * 60_000).length);
  const git = await gitInfo();
  return { now, working: events.length > 0 && now - events.at(-1).t < 25_000, events: events.slice(-7), rate, ...git };
}

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--c:#47d7ff;--g:#70ffac;--o:#ffb267}
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;font-family:Bahnschrift,"Segoe UI",Arial,sans-serif;color:#f6fbff}
.card{box-sizing:border-box;height:100%;padding:26px 30px;background:linear-gradient(135deg,rgba(6,10,18,.90),rgba(11,22,37,.82));border:1px solid rgba(75,196,255,.55);border-left:8px solid var(--c);box-shadow:0 0 30px rgba(27,174,255,.25);display:flex;flex-direction:column;gap:14px;position:relative;overflow:hidden}
.card:after{content:"";position:absolute;left:0;right:0;height:90px;top:-90px;background:linear-gradient(transparent,rgba(71,215,255,.10),transparent);animation:scan 4.5s linear infinite;pointer-events:none}
@keyframes scan{to{top:100%}}
.head{display:flex;justify-content:space-between;align-items:center}
.title{font-family:Impact,Bahnschrift,Arial,sans-serif;font-size:44px;letter-spacing:3px;text-shadow:3px 3px 0 rgba(0,0,0,.7)}.title b{color:#64e1ff;font-weight:400}
.st{font-size:20px;letter-spacing:3px;color:#7fa5b8;display:flex;align-items:center;gap:10px}.st i{width:14px;height:14px;border-radius:50%;background:#556;display:inline-block}
.st.on{color:var(--g)}.st.on i{background:var(--g);box-shadow:0 0 12px var(--g);animation:p 1s infinite}@keyframes p{50%{opacity:.3}}
.now{font-size:30px;font-weight:800;min-height:44px;border-left:4px solid var(--o);padding-left:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.now small{display:block;font-size:15px;letter-spacing:4px;color:var(--o);font-weight:600}
.cur{display:inline-block;width:12px;height:28px;background:var(--c);vertical-align:-4px;margin-left:4px;animation:p .8s steps(1) infinite}
#ev{display:flex;flex-direction:column;gap:7px;flex:1;min-height:0;overflow:hidden;justify-content:flex-end}
.e{display:flex;gap:14px;align-items:baseline;font-size:23px;padding:7px 12px;background:rgba(255,255,255,.055);border-left:4px solid rgba(126,228,255,.4);animation:in .45s ease-out;white-space:nowrap;overflow:hidden}
@keyframes in{from{opacity:0;transform:translateX(28px)}}
.e b{font-size:15px;letter-spacing:2px;min-width:118px;color:var(--c)}.e span{color:#dbe9f1;overflow:hidden;text-overflow:ellipsis}.e em{margin-left:auto;font-style:normal;color:#7fa5b8;font-size:16px}
.sec{font-size:15px;letter-spacing:4px;color:#7fa5b8}
.f{display:flex;align-items:center;gap:12px;font-size:20px;margin:4px 0}.f .n{min-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar{flex:1;height:12px;background:rgba(255,255,255,.08);display:flex}.bar i{display:block;height:100%;transition:width 1s}.bar .a{background:var(--g)}.bar .d{background:#ff6b8a}
.f small{color:#9fc;min-width:92px;text-align:right}
#spark{height:46px;width:100%}
.cm{font-size:19px;color:#b8cbd6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style></head><body><div class="card">
<div class="head"><span class="title">VIBE <b>CODING</b></span><span class="st" id="st"><i></i><span id="stt">EN ESPERA</span></span></div>
<div class="now"><small>AHORA</small><span id="now">—</span><span class="cur"></span></div>
<div id="ev"></div>
<canvas id="spark" width="600" height="46"></canvas>
<div><div class="sec">ARCHIVOS CAMBIANDO</div><div id="files"></div></div>
<div class="cm" id="cm"></div>
</div><script>
const $=id=>document.getElementById(id);let seen=new Set(),first=true,typing=0;
const ago=ms=>{const s=Math.max(0,Math.round((Date.now()-ms)/1000));return s<60?s+'s':Math.round(s/60)+'m'};
function typeNow(txt){clearInterval(typing);let i=0;typing=setInterval(()=>{$('now').textContent=txt.slice(0,++i);if(i>=txt.length)clearInterval(typing)},28)}
function spark(r){const c=$('spark'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);const m=Math.max(3,...r),w=c.width/r.length;
  g.fillStyle='rgba(112,255,172,.85)';r.forEach((v,i)=>{const h=Math.max(2,v/m*(c.height-4));g.fillRect(i*w+2,c.height-h,w-4,h)})}
async function tick(){try{const d=await fetch('/feed',{cache:'no-store'}).then(r=>r.json());
  $('st').className='st'+(d.working?' on':'');$('stt').textContent=d.working?'TRABAJANDO':'EN ESPERA';
  const key=e=>e.t+e.tool+e.target;const fresh=d.events.filter(e=>!seen.has(key(e)));
  if(fresh.length){const last=fresh.at(-1);typeNow((last.label+' '+(last.target||'')).trim())}
  $('ev').innerHTML=d.events.slice(-5).map(e=>'<div class="e"><b>'+esc(e.label.toUpperCase())+'</b><span>'+esc(e.target||'')+'</span><em>'+ago(e.t)+'</em></div>').join('');
  d.events.forEach(e=>seen.add(key(e)));
  spark(d.rate);
  $('files').innerHTML=d.files.length?d.files.map(f=>{const t=f.add+f.del||1;return '<div class="f"><span class="n">'+esc(f.name)+'</span><div class="bar"><i class="a" style="width:'+f.add/t*100+'%"></i><i class="d" style="width:'+f.del/t*100+'%"></i></div><small>+'+f.add+' −'+f.del+'</small></div>'}).join(''):'<div class="f" style="color:#7fa5b8">sin cambios pendientes</div>';
  $('cm').textContent=d.commits[0]?'⎇ último commit · '+d.commits[0].msg+' · hace '+ago(d.commits[0].t):'';
}catch{}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
tick();setInterval(tick,2000);
</script></body></html>`;

setInterval(refresh, 3000);
refresh();

http.createServer(async (req, res) => {
  if (req.url === '/feed') {
    try { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(await feed())); }
    catch { res.writeHead(500); res.end('{}'); }
    return;
  }
  if (req.url.startsWith('/sonify')) {
    const p = req.url.split('?')[0].split('/').filter(Boolean);
    if (p[1] === 'on') son.on = true; else if (p[1] === 'off') son.on = false; else if (p[1] === 'vol' && Number.isFinite(+p[2])) son.vol = Math.min(0.6, Math.max(0, +p[2]));
    try { fs.writeFileSync(sonFile, JSON.stringify(son)); } catch {}
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify({ ...son, rec: rec.on, rid: rec.id, set: setInfo(), look }));
    return;
  }
  if (req.url.split('?')[0] === '/mapping') {
    const mf = new URL('./music/mapping.json', import.meta.url);
    if (req.method === 'POST') { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { const j = JSON.parse(b); if (Array.isArray(j.pts) && j.pts.length === 4) fs.writeFileSync(mf, JSON.stringify({ pts: j.pts })); } catch {} res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}'); }); return; }
    let m = {}; try { m = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch {}
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(m)); return;
  }
  if (req.url.startsWith('/look')) {
    const p = req.url.split('?')[0].split('/').filter(Boolean);
    if (p[1] === 'palette' && PALETTES.includes(p[2])) look.palette = p[2];
    else if (p[1] === 'hue' && Number.isFinite(+p[2])) look.hue = Math.max(-180, Math.min(180, Math.round(+p[2])));
    saveLook(); res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify({ ...look, palettes: PALETTES })); return;
  }
  if (req.url.startsWith('/scene/')) {
    const key = decodeURIComponent(req.url.split('?')[0].split('/')[2] || ''), name = SCENE_MAP[key];
    res.writeHead(name ? 200 : 404, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    if (!name) { res.end(JSON.stringify({ ok: false, keys: Object.keys(SCENE_MAP) })); return; }
    const prev = await obsScene(name); res.end(JSON.stringify({ ok: true, scene: name, prev })); return;
  }
  if (req.url.startsWith('/set/')) {
    const act = req.url.split('?')[0].split('/')[2], json = (o) => { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(o)); };
    if (act === 'start') { const url = new URL(req.url, 'http://x'); const m = +url.searchParams.get('min') || 30; await startSet(m, url.searchParams.has('dry')); return json({ ok: true, minutes: m, set: setInfo(), rec: rec.dir }); }
    if (act === 'stop') { await endSet(); return json({ ok: true }); }
    if (act === 'skip' && setSt.on) { const secs = BASE.map(([, d]) => d * setSt.scale); const cur = setInfo(); if (cur.on) { let acc = 0; for (let k = 0; k <= cur.idx; k++) acc += secs[k]; setSt.start = Date.now() - acc * 1000; } return json(setInfo()); }
    return json(setInfo());
  }
  if (req.url.startsWith('/rec/')) {
    const act = req.url.split('?')[0].split('/')[2];
    const json = (o) => { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(o)); };
    if (act === 'on') { if (!rec.on) recStart(); return json({ rec: true, dir: rec.dir }); }
    if (act === 'off') { rec.on = false; return json({ rec: false, dir: rec.dir, msg: 'finalizando… el WAV y el MIDI aparecen en unos segundos' }); }
    if (act === 'chunk' && req.method === 'POST') { req.on('data', (c) => { rec.bytes += c.length; rec.stream?.write(c); }); req.on('end', () => json({ ok: true })); return; }
    if (act === 'finish' && req.method === 'POST') { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { recFinish(b); json({ ok: true }); }); return; }
    if (act === 'status') return json({ rec: rec.on, dir: rec.dir, kb: Math.round(rec.bytes / 1024), seconds: rec.on ? Math.round((Date.now() - rec.started) / 1000) : 0 });
    res.writeHead(404); res.end(); return;
  }
  if (req.url === '/audio') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ factory: audio.factory, strudel: audio.strudel, ddj: audio.ddj, game: audio.game, beats: audio.beats, bpm: Date.now() - audio.last < 4000 ? audio.bpm : 0, playing: nowPlaying() }));
    return;
  }
  if (req.url === '/metrics') {
    let m = { cpu: 0, gpu: 0, ram: 0 };
    try { m = await fetch('http://127.0.0.1:8765/metrics').then((r) => r.json()); } catch {}
    try {
      const o = await withObs(async (r) => ({ s: await r('GetStats'), st: await r('GetStreamStatus') }), 1500);
      m.fps = +o.s.activeFps.toFixed(1); m.obsCpu = +o.s.cpuUsage.toFixed(1);
      m.drop = o.st.outputTotalFrames ? +(o.st.outputSkippedFrames / o.st.outputTotalFrames * 100).toFixed(2) : 0;
      m.live = o.st.outputActive;
    } catch {}
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(m));
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  const pth = req.url.split('?')[0]; res.end(pth === '/factory' ? factoryPage : pth === '/festival' ? festivalPage : pth === '/control' ? controlPage : page);
}).listen(PORT, '127.0.0.1', () => console.log(`Vibe live en 127.0.0.1:${PORT}`));
