// Revisión antes de salir en vivo: node preflight.mjs
import { execFile } from 'node:child_process';
import { withObs } from './obs.mjs';
import { tenantConfig } from './tenant-config.mjs';

const { obsSceneNames = {}, audioTracks = {}, game, apiBase = 'http://127.0.0.1:8765' } = tenantConfig();
const rows = [];
const check = (ok, name, detail = '') => rows.push({ ok, name, detail });
const sh = (cmd, args) => new Promise((r) => execFile(cmd, args, { windowsHide: true }, (_e, out) => r(out || '')));

try {
  const m = await fetch(`${apiBase}/metrics`).then((r) => r.json());
  check(true, 'Servidor de overlays', `CPU ${m.cpu}% · GPU ${m.gpu}% ${m.gpuTemp ?? '?'}°C`);
  if (m.gpuAlert) check(false, 'GPU sostenida en alerta', `lleva ${m.gpuHighMinutes}min alta — revisar antes de salir en vivo`);
  const sc = await fetch(`${apiBase}/schedule`).then((r) => r.json());
  const left = `${Math.floor(sc.remaining / 3600)}h ${Math.floor((sc.remaining % 3600) / 60)}m`;
  check(sc.remaining > 0, 'Cuenta regresiva', sc.remaining > 0 ? `${sc.label} (${sc.timezone}) · faltan ${left} → "${sc.scene}"` : 'la hora de schedule.json ya pasó');
  for (const p of ['starting', 'brb', 'ending', 'hud', 'summary', 'stream', 'alerts']) {
    const r = await fetch(`${apiBase}/${p}`);
    check(r.ok, `Página /${p}`);
  }
} catch { check(false, 'Servidor de overlays', `no responde en ${apiBase}`); }

try {
  await withObs(async (req) => {
    const v = await req('GetVersion');
    check(true, 'OBS conectado', `OBS ${v.obsVersion}`);
    const scenes = (await req('GetSceneList')).scenes.map((s) => s.sceneName);
    for (const s of Object.values(obsSceneNames)) check(scenes.includes(s), `Escena "${s}"`);
    const special = await req('GetSpecialInputs');
    for (const [k, name] of Object.entries(special).filter(([, n]) => n)) {
      const { inputMuted } = await req('GetInputMute', { inputName: name });
      check(!inputMuted, `Audio ${k}`, inputMuted ? `"${name}" está SILENCIADO` : name);
    }
    // Pista 2 = VOD de Twitch: verifica el routing declarado en audioTracks (stream.config.json).
    for (const [name, tracks] of Object.entries(audioTracks)) {
      try {
        const t = (await req('GetInputAudioTracks', { inputName: name })).inputAudioTracks;
        const expected = new Set(tracks);
        const ok = [1, 2, 3, 4, 5, 6].every((n) => Boolean(t[n]) === expected.has(n));
        check(ok, `${name} en pistas ${tracks.join(',')}`, JSON.stringify(t));
      } catch { check(false, `Fuente "${name}"`, 'no existe'); }
    }
    const stats = await req('GetStats');
    check(stats.availableDiskSpace > 20000, 'Espacio en disco', `${Math.round(stats.availableDiskSpace / 1024)} GB libres`);
    check(stats.activeFps > 55, 'FPS de OBS', `${Math.round(stats.activeFps)} fps`);
    const st = await req('GetStreamServiceSettings');
    const hasStreamKey = Boolean(st.streamServiceSettings?.key);\n    check(Boolean(st.streamServiceType) && hasStreamKey, 'Destino de stream', `${st.streamServiceType || 'sin servicio'} (clave configurada: ${hasStreamKey ? 'sí' : 'NO'})`);
    const s = await req('GetStreamStatus');
    check(true, 'Estado', s.outputActive ? 'YA ESTÁS EN VIVO' : 'fuera de línea');
  });
} catch (e) { check(false, 'OBS', e.message); }

if (game?.processName) {
  const running = new RegExp(game.processName.replace('.', '\\.'), 'i').test(await sh('tasklist', ['/FI', `IMAGENAME eq ${game.processName}`, '/NH']));
  check(running, `${game.label ?? game.processName} abierto`, 'opcional si haces Vibe Coding');
}

for (const r of rows) console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
process.exitCode = rows.some((r) => !r.ok && r.name !== `${game?.label ?? game?.processName} abierto`) ? 1 : 0;
