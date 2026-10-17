// Optimizacion de OBS para el PC de stream (OpsAfterDark): respaldo + vista previa + aplicacion de ajustes.
//
//   node optimize-obs.mjs --backup     respalda perfil/escenas/canvas vertical (sin la clave de stream)
//   node optimize-obs.mjs --dry        muestra que cambiaria (no modifica nada)
//   node optimize-obs.mjs --apply      aplica; hace un respaldo antes. Se niega a correr con el directo o la grabacion activos.
//   node optimize-obs.mjs --restore <carpeta-de-respaldo>   vuelve a los archivos respaldados (con OBS cerrado)
//
// Cambios:
//  - Fuentes de navegador (via websocket, sin cambiar tamano ni layout): 30 fps en overlays y apagar-si-no-visible en Alertas/Reloj/Vibe LIVE V.
//  - Codificadores NVENC (archivos del perfil, SOLO con OBS cerrado): preset p4, sin psico-visual, grabacion sin multipass y CQP 21.
// NO se cambia el tamano de las fuentes 2560x1440: sin ver el resultado podria romper el layout de las paginas.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { withObs } from 'file://wsl.localhost/Ubuntu/home/opsly/opsly-wt-stream-ops-kit/packages/stream-ops-kit/src/obs.mjs';

const APPDATA = process.env.APPDATA;
const PROFILE = 'OpsAfterDark-DualRec-TEST';
const COLLECTION = 'OpsAfterDark-DualRec-TEST';
const profileDir = path.join(APPDATA, 'obs-studio', 'basic', 'profiles', PROFILE);
const sceneFile = path.join(APPDATA, 'obs-studio', 'basic', 'scenes', `${COLLECTION}.json`);
const verticalCfg = path.join(APPDATA, 'obs-studio', 'plugin_config', 'vertical-canvas', 'config.json');
const BACKUP_ROOT = 'D:\\Content\\Backups';

const FILES = [
  [path.join(profileDir, 'basic.ini'), 'profile/basic.ini'],
  [path.join(profileDir, 'streamEncoder.json'), 'profile/streamEncoder.json'],
  [path.join(profileDir, 'recordEncoder.json'), 'profile/recordEncoder.json'],
  [sceneFile, `scenes/${COLLECTION}.json`],
  [verticalCfg, 'plugin_config/vertical-canvas/config.json'],
]; // service.json (clave de stream) NO se copia a proposito

const NO_FPS = new Set(['FACTORY Engine (audio)', 'Strudel Música']); // motores de audio: no se tocan
const SHUTDOWN = new Set(['Alertas', 'Reloj', 'Vibe LIVE V']);

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const arg = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

function backup() {
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const dir = path.join(BACKUP_ROOT, `obs-${stamp}`);
  for (const [src, rel] of FILES) {
    if (!fs.existsSync(src)) { console.log(`  (no existe, se omite) ${rel}`); continue; }
    const dst = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
  fs.writeFileSync(path.join(dir, 'LEEME.txt'), `Respaldo de OBS ${new Date().toISOString()}\nPerfil: ${PROFILE}\nSin service.json (clave de stream).\nRestaurar: node optimize-obs.mjs --restore "${dir}" (con OBS cerrado)\n`);
  console.log(`Respaldo en ${dir}`);
  return dir;
}

const obsRunning = () => /obs64\.exe/i.test(spawnSync('tasklist', ['/FI', 'IMAGENAME eq obs64.exe', '/NH'], { encoding: 'utf8' }).stdout || '');
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));

function encoderPlan() {
  const plan = [];
  const rec = readJson(path.join(profileDir, 'recordEncoder.json'));
  const str = readJson(path.join(profileDir, 'streamEncoder.json'));
  const want = [
    ['recordEncoder.json', rec, { preset2: 'p4', multipass: 'disabled', psycho_aq: false, cqp: 21 }],
    ['streamEncoder.json', str, { preset2: 'p4', psycho_aq: false }],
  ];
  for (const [file, cur, patch] of want) {
    const diff = Object.entries(patch).filter(([k, v]) => cur[k] !== v).map(([k, v]) => ({ clave: k, de: cur[k], a: v }));
    plan.push({ file, diff, next: { ...cur, ...patch } });
  }
  return plan;
}

async function browserPlan(req) {
  const inputs = (await req('GetInputList')).inputs.filter((i) => i.inputKind === 'browser_source');
  const plan = [];
  for (const i of inputs) {
    const s = (await req('GetInputSettings', { inputName: i.inputName })).inputSettings;
    const patch = {};
    if (!NO_FPS.has(i.inputName) && !(s.fps_custom && s.fps === 30)) { patch.fps_custom = true; patch.fps = 30; }
    if (SHUTDOWN.has(i.inputName) && !s.shutdown) patch.shutdown = true;
    if (Object.keys(patch).length) plan.push({ inputName: i.inputName, patch });
  }
  return plan;
}

if (has('--revert-browsers')) {
  const dir = arg('--revert-browsers');
  const prev = JSON.parse(fs.readFileSync(path.join(dir, 'browser-prev.json'), 'utf8'));
  await withObs(async (req) => { for (const [inputName, inputSettings] of Object.entries(prev)) await req('SetInputSettings', { inputName, inputSettings, overlay: true }); }, 30000);
  console.log(`Fuentes de navegador revertidas (${Object.keys(prev).length}).`);
  process.exit(0);
}
if (has('--restore')) {
  const dir = arg('--restore');
  if (!dir || !fs.existsSync(dir)) { console.error('indica la carpeta de respaldo'); process.exit(2); }
  if (obsRunning()) { console.error('Cierra OBS antes de restaurar.'); process.exit(3); }
  for (const [dst, rel] of FILES) { const src = path.join(dir, rel); if (fs.existsSync(src)) { fs.copyFileSync(src, dst); console.log(`restaurado ${rel}`); } }
  process.exit(0);
}
if (has('--backup')) { backup(); process.exit(0); }

const dry = has('--dry'), apply = has('--apply');
if (!dry && !apply) { console.error('uso: --backup | --dry | --apply | --restore <carpeta>'); process.exit(2); }

const encPlan = encoderPlan();
const state = await withObs(async (req) => {
  const live = (await req('GetStreamStatus')).outputActive, rec = (await req('GetRecordStatus')).outputActive;
  return { live, rec, browsers: await browserPlan(req) };
}, 20000).catch(() => ({ live: false, rec: false, browsers: [], obsDown: true }));

console.log(`OBS: ${state.obsDown ? 'cerrado/sin websocket' : state.live ? 'EN DIRECTO' : 'sin directo'}${state.rec ? ' + GRABANDO' : ''}`);
console.log('\nFuentes de navegador:');
for (const b of state.browsers) console.log(`  ${b.inputName}: ${JSON.stringify(b.patch)}`);
if (!state.browsers.length) console.log(state.obsDown ? '  (OBS cerrado: se aplicaran al abrirlo con --apply)' : '  (nada que cambiar)');
console.log('\nCodificadores (archivos del perfil):');
for (const p of encPlan) console.log(`  ${p.file}: ${p.diff.length ? p.diff.map((d) => `${d.clave} ${JSON.stringify(d.de)} -> ${JSON.stringify(d.a)}`).join(', ') : 'sin cambios'}`);

if (dry) { console.log('\n[dry] no se modifico nada.'); process.exit(0); }
const liveBrowsers = has('--browsers-live'); // solo fuentes de navegador, se permite con directo/grabacion activos
if ((state.live || state.rec) && !liveBrowsers) { console.error('\nRECHAZADO: hay directo o grabacion activos. Termina y vuelve a ejecutar (o usa --browsers-live para tocar solo las fuentes de navegador).'); process.exit(4); }
const dir = backup();
if (state.browsers.length && !state.obsDown) {
  await withObs(async (req) => {
    const prev = {};
    for (const b of state.browsers) {
      const cur = (await req('GetInputSettings', { inputName: b.inputName })).inputSettings;
      prev[b.inputName] = Object.fromEntries(Object.keys(b.patch).map((k) => [k, cur[k] ?? (k === 'fps_custom' || k === 'shutdown' ? false : null)]));
    }
    fs.writeFileSync(path.join(dir, 'browser-prev.json'), JSON.stringify(prev, null, 2));
    for (const b of state.browsers) await req('SetInputSettings', { inputName: b.inputName, inputSettings: b.patch, overlay: true });
  }, 30000);
  console.log('Fuentes de navegador actualizadas (valores previos guardados en browser-prev.json).');
}
if (liveBrowsers && (state.live || state.rec)) {
  console.log('\nCon directo/grabacion activos los codificadores NO se tocan.');
  console.log(`Para revertir las fuentes ahora mismo: node optimize-obs.mjs --revert-browsers "${dir}"`);
  process.exit(0);
}
if (encPlan.some((p) => p.diff.length)) {
  if (obsRunning()) { console.log('\nOBS esta abierto: los codificadores NO se tocan (OBS podria sobrescribirlos). Cierra OBS y repite con --apply.'); }
  else { for (const p of encPlan) if (p.diff.length) { fs.writeFileSync(path.join(profileDir, p.file), JSON.stringify(p.next)); console.log(`Actualizado ${p.file}`); } }
}
console.log(`\nPara deshacer: node optimize-obs.mjs --restore "${dir}" (con OBS cerrado).`);
