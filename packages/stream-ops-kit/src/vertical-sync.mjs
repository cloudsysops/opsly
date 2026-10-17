// Mantiene la escena del canvas vertical (Aitum Stream Suite) alineada con la escena de programa horizontal.
//
// Problema que resuelve: el canvas vertical tiene sus propias escenas y no sigue al horizontal. Si el horizontal
// pasa a una escena sin juego (p. ej. AI Factory) y el vertical se queda en V_GAMING (Game Capture vacio),
// la mitad de juego del reel sale en negro.
//
// Config del tenant (stream.config.json):  "verticalSync": { "canvas": "Aitum Vertical", "map": { "<escena horizontal>": "<escena vertical>" } }
// Solo cambia la escena VERTICAL. Nunca toca la escena horizontal, el audio ni las salidas. Escenas sin mapa: no hace nada.
//
//   node vertical-sync.mjs            (bucle: escucha cambios de escena y se reconecta si OBS se cae)
//   node vertical-sync.mjs --once     (alinea una vez y sale)
//   node vertical-sync.mjs --dry      (solo registra lo que haria)
import { pathToFileURL } from 'node:url';

const VENDOR = 'aitum-stream-suite';
const SCENES_EVENT = 1 << 2; // obs-websocket EventSubscription.Scenes

export function targetVerticalScene(map, program) {
  return map && Object.hasOwn(map, program) ? map[program] : null;
}

const vendor = async (req, requestType, requestData) => {
  const r = await req('CallVendorRequest', { vendorName: VENDOR, requestType, requestData });
  const d = r.responseData ?? r;
  if (d?.success === false) throw new Error(`${requestType}: ${d.error}`);
  return d;
};

// Devuelve { action: 'switched'|'unchanged'|'unmapped'|'unknown-target'|'dry', ... }. No lanza por escenas sin mapa.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// switch_scene es asincrono en el plugin: la escena nueva tarda unos ms en verse en current_scene.
async function confirmScene(req, canvas, target, { tries = 8, delayMs = 150 } = {}) {
  let now = null;
  for (let i = 0; i < tries; i++) {
    now = (await vendor(req, 'current_scene', { canvas })).scene;
    if (now === target) return now;
    if (delayMs) await sleep(delayMs);
  }
  return now;
}

export async function applyOnce(req, cfg, program, { dry = false, log = () => {}, confirmDelayMs = 150 } = {}) {
  const target = targetVerticalScene(cfg.map, program);
  if (!target) { log(`"${program}": sin mapa, el vertical no cambia.`); return { action: 'unmapped', program }; }
  const available = (await vendor(req, 'get_scenes', { canvas: cfg.canvas })).scenes.map((s) => s.name);
  if (!available.includes(target)) { log(`"${program}" -> "${target}": esa escena no existe en el vertical (${available.join(', ')}). No se cambia.`); return { action: 'unknown-target', program, target }; }
  const current = (await vendor(req, 'current_scene', { canvas: cfg.canvas })).scene;
  if (current === target) { log(`"${program}": el vertical ya esta en "${target}".`); return { action: 'unchanged', program, target }; }
  if (dry) { log(`[dry] "${program}": vertical "${current}" -> "${target}".`); return { action: 'dry', program, from: current, target }; }
  await vendor(req, 'switch_scene', { canvas: cfg.canvas, scene: target });
  const after = await confirmScene(req, cfg.canvas, target, { delayMs: confirmDelayMs });
  log(after === target ? `"${program}": vertical "${current}" -> "${target}" (confirmado).` : `"${program}": se pidio "${target}" pero el vertical sigue en "${after}".`);
  return { action: after === target ? 'switched' : 'switch-not-confirmed', program, from: current, target, after };
}

// obs.mjs (withObs) no avisa cuando OBS cierra el websocket: sin esto el bucle se quedaba esperando para siempre tras
// reiniciar OBS y el vertical dejaba de seguir al horizontal. El latido lanza un error si OBS deja de responder.
export async function heartbeat(req, { intervalMs = 15000, timeoutMs = 5000, ping = () => req('GetVersion'), signal } = {}) {
  while (!signal?.aborted) {
    await sleep(intervalMs);
    if (signal?.aborted) return;
    let timer;
    try {
      await Promise.race([ping(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('OBS no responde')), timeoutMs); })]);
    } finally { clearTimeout(timer); }
  }
}

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

export async function run(cfg, { once = false, dry = false, log = (m) => console.log(`[${stamp()}] ${m}`) } = {}) {
  const { withObs } = await import('./obs.mjs');
  let chain = Promise.resolve(); // un cambio a la vez, en orden
  do {
    try {
      let reqFn = null;
      await withObs(async (req) => {
        reqFn = req;
        const program = (await req('GetCurrentProgramScene')).sceneName;
        await applyOnce(req, cfg, program, { dry, log });
        if (once) return;
        await heartbeat(req); // seguir escuchando eventos; lanza si OBS deja de responder y el bucle reconecta
      }, once ? 15000 : 2_000_000_000, {
        eventSubscriptions: SCENES_EVENT,
        onEvent: (e) => {
          if (once || e.eventType !== 'CurrentProgramSceneChanged') return;
          chain = chain.then(() => applyOnce(reqFn, cfg, e.eventData.sceneName, { dry, log })).catch((err) => log(`error: ${err.message}`));
        },
      });
    } catch (e) {
      log(`sin conexion con OBS (${e.message}); reintento en 10 s.`);
    }
    if (!once) await new Promise((r) => setTimeout(r, 10000));
  } while (!once);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { tenantConfig } = await import('./tenant-config.mjs');
  const cfg = tenantConfig().verticalSync;
  if (!cfg?.canvas || !cfg?.map) { console.error('stream.config.json no define verticalSync { canvas, map }.'); process.exit(2); }
  run(cfg, { once: process.argv.includes('--once'), dry: process.argv.includes('--dry') }).then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
}
