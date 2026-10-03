// Automatiza la parte tediosa del post-stream: baja el audio del VOD (yt-dlp) y
// detecta picos de volumen (ffmpeg/astats) para proponer candidatos a clip.
// NO corta clips ni publica nada — solo entrega la lista de timestamps para que
// el humano elija cuáles vale la pena producir (igual que el flujo manual de hoy).
// Requiere yt-dlp y ffmpeg/ffprobe instalados en la máquina donde corre esto.
//   node post-stream-analyze.mjs <url-del-VOD>
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { tenantPath } from './tenant-paths.mjs';
import { tenantConfig } from './tenant-config.mjs';

const url = process.argv[2];
if (!url) { console.log('uso: post-stream-analyze.mjs <url-del-VOD>'); process.exit(1); }

const { postStream = {} } = tenantConfig();
const candidateCount = postStream.candidateCount ?? 15;
const minGapSeconds = postStream.minGapSeconds ?? 90;

function checkTool(cmd, hint) {
  try { execSync(`${cmd} --version`, { stdio: 'ignore' }); }
  catch { console.error(`Falta "${cmd}" en el PATH. ${hint}`); process.exit(1); }
}
checkTool('yt-dlp', 'Instalar desde https://github.com/yt-dlp/yt-dlp/releases (no necesita admin: el binario suelto alcanza con un Python instalado).');
checkTool('ffmpeg', 'Instalar ffmpeg y agregarlo al PATH.');

const vodId = url.match(/videos\/(\d+)/)?.[1] ?? Date.now().toString();
const workDir = tenantPath('post-stream', vodId);
fs.mkdirSync(workDir, { recursive: true });

console.log(`Metadata del VOD...`);
const meta = JSON.parse(execFileSync('yt-dlp', ['-J', '--no-warnings', url], { maxBuffer: 32 * 1024 * 1024 }));
console.log(`"${meta.title}" · ${Math.round(meta.duration / 60)}min · ${meta.view_count ?? '?'} vistas`);

const audioPath = path.join(workDir, 'audio.mp3');
if (!fs.existsSync(audioPath)) {
  console.log('Bajando audio (esto puede tardar unos minutos)...');
  execFileSync('yt-dlp', ['-f', 'worst[vcodec=none]/worstaudio', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '5', '-o', audioPath, '--no-warnings', '--no-playlist', url], { stdio: 'inherit' });
} else {
  console.log('Audio ya estaba descargado, reutilizando.');
}

console.log('Analizando picos de volumen...');
const rmsLog = path.join(workDir, 'rms.log');
execFileSync('ffmpeg', ['-v', 'error', '-i', audioPath, '-af', `asetnsamples=n=44100,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=${rmsLog}`, '-f', 'null', '-']);

const text = fs.readFileSync(rmsLog, 'utf8');
const entries = [];
for (const m of text.matchAll(/pts_time:([\d.]+)\s*\nlavfi\.astats\.Overall\.RMS_level=(-?[\d.]+|-inf)/g)) {
  const t = Number(m[1]);
  const raw = m[2];
  if (raw === '-inf') continue;
  entries.push([t, Number(raw)]);
}
entries.sort((a, b) => b[1] - a[1]);

const fmt = (t) => { const h = Math.floor(t / 3600), mi = Math.floor((t % 3600) / 60), s = Math.floor(t % 60); return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };
const picked = [];
for (const [t, rms] of entries) {
  if (picked.every(([pt]) => Math.abs(t - pt) > minGapSeconds)) picked.push([t, rms]);
  if (picked.length >= candidateCount) break;
}
picked.sort((a, b) => a[0] - b[0]);

const candidates = picked.map(([t, rms]) => ({ timestamp: fmt(t), seconds: Math.round(t), rmsDb: Math.round(rms * 10) / 10 }));
fs.writeFileSync(path.join(workDir, 'candidates.json'), JSON.stringify({ url, title: meta.title, durationSec: meta.duration, candidates }, null, 2));

console.log(`\n${candidates.length} momentos candidatos:\n`);
for (const c of candidates) console.log(`  ${c.timestamp}  (${c.rmsDb}dB)`);
console.log(`\nGuardado en: ${path.join(workDir, 'candidates.json')}`);
console.log('Siguiente paso (con tu aprobación de cuáles vale la pena): cortar los clips de los timestamps que elijas.');
