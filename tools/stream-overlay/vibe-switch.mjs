// Muestra en la escena VIBE_PIP solo la herramienta del agente activo.
// Señal (en orden): activity.json "pinned" (fijo, gana siempre) -> "active" -> última entrada "tool".
// Fase 2: Mission Control escribe "active" (solo lectura de sesiones, sin secretos).
// Seguridad: SOLO cambia visibilidad de items dentro de VIBE_PIP. Nunca escenas ni stream.
// Uso: node vibe-switch.mjs            (vigía, cada 3 s)
//      node vibe-switch.mjs <claude|chatgpt|cursor|opencode|mission>   (fija la herramienta una vez)
import fs from 'node:fs';
import { withObs } from './obs.mjs';

const SCENE = 'VIBE_PIP';
const ITEMS = { claude: 'VIBE · Claude', chatgpt: 'VIBE · ChatGPT', codex: 'VIBE · ChatGPT', cursor: 'VIBE · Cursor', terminal: 'VIBE · Terminal', opencode: 'VIBE · Terminal', mission: 'MISSION_CONTROL_DEV_PANEL', mc: 'MISSION_CONTROL_DEV_PANEL', 'mission-control': 'MISSION_CONTROL_DEV_PANEL' };
const file = new URL('./activity.json', import.meta.url);

function activeTool() {
  try {
    const a = JSON.parse(fs.readFileSync(file, 'utf8'));
    const t = String(a.pinned || a.active || a.items?.at(-1)?.tool || 'terminal').toLowerCase();
    return ITEMS[t] ? t : 'terminal';
  } catch { return 'terminal'; }
}

async function apply(tool) {
  const want = ITEMS[tool];
  return withObs(async (req) => {
    const { sceneItems } = await req('GetSceneItemList', { sceneName: SCENE });
    let changed = false;
    for (const it of sceneItems) {
      if (!Object.values(ITEMS).includes(it.sourceName)) continue;
      const on = it.sourceName === want;
      if (it.sceneItemEnabled !== on) { await req('SetSceneItemEnabled', { sceneName: SCENE, sceneItemId: it.sceneItemId, sceneItemEnabled: on }); changed = true; }
    }
    return { tool, item: want, changed };
  });
}

const arg = process.argv[2]?.toLowerCase();
const save = (patch) => { try { const a = JSON.parse(fs.readFileSync(file, 'utf8')); Object.assign(a, patch); for (const k of Object.keys(patch)) if (patch[k] == null) delete a[k]; fs.writeFileSync(file, JSON.stringify(a, null, 2)); } catch {} };
if (arg === 'pin' || arg === 'unpin') {
  const t = process.argv[3]?.toLowerCase();
  if (arg === 'pin' && !ITEMS[t]) { console.log('uso: vibe-switch.mjs pin <claude|chatgpt|cursor|opencode|mission>'); process.exit(1); }
  save({ pinned: arg === 'pin' ? t : null });
  const r = await apply(arg === 'pin' ? t : activeTool()).catch((e) => ({ ok: false, reason: e.message }));
  console.log(JSON.stringify({ ...r, pinned: arg === 'pin' ? t : null }));
} else if (arg) {
  if (!ITEMS[arg]) { console.log('uso: vibe-switch.mjs [claude|chatgpt|cursor|opencode|mission]'); process.exit(1); }
  try { const a = JSON.parse(fs.readFileSync(file, 'utf8')); a.active = arg; fs.writeFileSync(file, JSON.stringify(a, null, 2)); } catch {}
  console.log(JSON.stringify(await apply(arg).catch((e) => ({ ok: false, reason: e.message }))));
} else {
  let last = null;
  const tick = async () => {
    const t = activeTool();
    if (t === last) return;
    const r = await apply(t).catch((e) => ({ ok: false, reason: e.message }));
    if (r.ok !== false) { last = t; console.log(JSON.stringify(r)); }
  };
  await tick();
  setInterval(() => tick().catch(() => undefined), 3000);
}
