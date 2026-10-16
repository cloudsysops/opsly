// Cambio automatico de escena segun Battlefield 6, con salvaguardas. Nunca inicia ni detiene el stream.
//   bf6.exe se ABRE  -> "Battlefield 6"            (solo si estas en una escena de espera)
//   bf6.exe se CIERRA-> "Vuelvo en un momento"     (solo si estabas en una escena de juego: evita pantalla negra)
// Solo reacciona al CAMBIO de estado del proceso; no pelea con tus cambios manuales.
// Uso: node scene-watch.mjs [--dry]     Registro: stream-scene-watch.log
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { withObs } from './obs.mjs';
const DRY = process.argv.includes('--dry'), LOG = new URL('./stream-scene-watch.log', import.meta.url);
const GAME_SCENES = new Set(['Gaming + Vibe Coding', 'Battlefield 6', 'Battlefield 6 — Zoom', 'AI Factory — Hacker', 'Gaming', 'Streaming-Gaming', 'Coding-Game']);
const WAIT_SCENES = new Set(['Vuelvo en un momento', 'Iniciando Stream', 'LG Desktop']);
const ON_OPEN = 'Battlefield 6', ON_CLOSE = 'Vuelvo en un momento';
const log = (m) => { const l = `[${new Date().toLocaleTimeString('es-CO')}] ${m}`; console.log(l); try { fs.appendFileSync(LOG, l + '\n'); } catch {} };
const running = () => new Promise((res) => execFile('tasklist', ['/FI', 'IMAGENAME eq bf6.exe', '/NH'], { windowsHide: true }, (_e, out) => res(/bf6\.exe/i.test(out || ''))));
async function setScene(from, to, why) {
  if (DRY) return log(`(prueba) ${why}: ${from} -> ${to}`);
  try { await withObs(async (r) => { const cur = (await r('GetCurrentProgramScene')).sceneName; if (cur !== from) return log(`omitido: la escena ya no es "${from}" (es "${cur}")`); await r('SetCurrentProgramScene', { sceneName: to }); log(`${why}: ${from} -> ${to}`); }, 4000); }
  catch (e) { log('OBS no disponible: ' + e.message); }
}
let prev = await running(); log(`vigilante iniciado${DRY ? ' (PRUEBA)' : ''}; BF6 ${prev ? 'abierto' : 'cerrado'}`);
for (;;) {
  await new Promise((s) => setTimeout(s, 3000));
  const now = await running(); if (now === prev) continue; prev = now;
  let cur = '';
  try { cur = await withObs(async (r) => (await r('GetCurrentProgramScene')).sceneName, 3000); } catch { continue; }
  if (now && WAIT_SCENES.has(cur)) await setScene(cur, ON_OPEN, 'BF6 abierto');
  else if (!now && GAME_SCENES.has(cur)) await setScene(cur, ON_CLOSE, 'BF6 cerrado');
  else log(`BF6 ${now ? 'abierto' : 'cerrado'}; escena "${cur}" no se toca`);
}
