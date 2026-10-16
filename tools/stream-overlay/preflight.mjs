// Revisión antes de salir en vivo: node preflight.mjs
import { execFile } from 'node:child_process';
import { scenes as sceneMap, withObs } from './obs.mjs';

const rows = [];
const check = (ok, name, detail = '') => rows.push({ ok, name, detail });
const sh = (cmd, args) => new Promise((r) => execFile(cmd, args, { windowsHide: true }, (_e, out) => r(out || '')));

try {
  const m = await fetch('http://127.0.0.1:8765/metrics').then((r) => r.json());
  check(true, 'Servidor de overlays', `CPU ${m.cpu}% · GPU ${m.gpu}% ${m.gpuTemp ?? '?'}°C`);
  const sc = await fetch('http://127.0.0.1:8765/schedule').then((r) => r.json());
  const left = `${Math.floor(sc.remaining / 3600)}h ${Math.floor((sc.remaining % 3600) / 60)}m`;
  check(sc.remaining > 0, 'Cuenta regresiva', sc.remaining > 0 ? `${sc.label} (${sc.timezone}) · faltan ${left} → "${sc.scene}"` : 'la hora de schedule.json ya pasó');
  for (const p of ['starting', 'brb', 'ending', 'hud', 'summary', 'stream', 'alerts']) {
    const r = await fetch(`http://127.0.0.1:8765/${p}`);
    check(r.ok, `Página /${p}`);
  }
} catch { check(false, 'Servidor de overlays', 'no responde en 127.0.0.1:8765'); }

try {
  await withObs(async (req) => {
    const v = await req('GetVersion');
    check(true, 'OBS conectado', `OBS ${v.obsVersion}`);
    const scenes = (await req('GetSceneList')).scenes.map((s) => s.sceneName);
    for (const [k, s] of Object.entries(sceneMap)) check(scenes.includes(s), `Escena "${s}" (${k})`);
    const special = await req('GetSpecialInputs');
    for (const [k, name] of Object.entries(special).filter(([, n]) => n)) {
      const { inputMuted } = await req('GetInputMute', { inputName: name });
      check(!inputMuted, `Audio ${k}`, inputMuted ? `"${name}" está SILENCIADO` : name);
    }
    // Pista 2 = VOD de Twitch: debe llevar micrófono y juego, y nunca la música.
    for (const name of ['MIC_OPERATOR', 'GAME_AUDIO']) {
      try {
        const t = (await req('GetInputAudioTracks', { inputName: name })).inputAudioTracks, muted = (await req('GetInputMute', { inputName: name })).inputMuted;
        check(Boolean(t[1] && t[2]) && !muted, `${name} en pistas 1 y 2 (directo + VOD), sin silenciar`, JSON.stringify(t) + (muted ? ' SILENCIADO' : ''));
      } catch { check(false, `Fuente "${name}"`, 'no existe'); }
    }
    try { // motor de musica de la factory: solo directo (pista 1), nunca VOD
      const t = (await req('GetInputAudioTracks', { inputName: 'FACTORY Hacker Overlay' })).inputAudioTracks;
      check(t[1] && !t[2], 'Motor de música (FACTORY) en pista 1 y NO en la 2 (VOD)', JSON.stringify(t));
    } catch { check(false, 'Fuente "FACTORY Hacker Overlay"', 'no existe'); }
    try { const r = await fetch('http://127.0.0.1:8766/sonify').then((x) => x.json()); check(true, 'Servidor de música/visuales (:8766)', `sonido ${r.on ? 'ENCENDIDO' : 'apagado'} · vol ${r.vol}`); }
    catch { check(false, 'Servidor de música/visuales (:8766)', 'no responde: node vibe-live.mjs'); }
    try {
      const tracks = (await req('GetInputAudioTracks', { inputName: 'Strudel Música' })).inputAudioTracks;
      const monitor = (await req('GetInputAudioMonitorType', { inputName: 'Strudel Música' })).monitorType;
      check(tracks[1] && !tracks[2], 'Música (Strudel) en pista 1 y NO en la 2 (VOD)', JSON.stringify(tracks));
      check(true, 'Monitoreo de la música', monitor === 'OBS_MONITORING_TYPE_NONE' ? 'apagado (ver instructivo antes de activarlo)' : monitor);
    } catch { check(false, 'Fuente "Strudel Música"', 'no existe: run.ps1 music-setup'); }
    const stats = await req('GetStats');
    check(stats.availableDiskSpace > 20000, 'Espacio en disco', `${Math.round(stats.availableDiskSpace / 1024)} GB libres`);
    check(stats.activeFps > 55, 'FPS de OBS', `${Math.round(stats.activeFps)} fps`);
    const st = await req('GetStreamServiceSettings');
    check(Boolean(st.streamServiceType), 'Destino de stream', `${st.streamServiceType} (clave configurada: ${st.streamServiceSettings?.key ? 'sí' : 'NO'})`);
    const s = await req('GetStreamStatus');
    check(true, 'Estado', s.outputActive ? 'YA ESTÁS EN VIVO' : 'fuera de línea');
  });
} catch (e) { check(false, 'OBS', e.message); }

check(/bf6\.exe/i.test(await sh('tasklist', ['/FI', 'IMAGENAME eq bf6.exe', '/NH'])), 'Battlefield 6 abierto', 'opcional si haces Vibe Coding');

for (const r of rows) console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
process.exitCode = rows.some((r) => !r.ok && r.name !== 'Battlefield 6 abierto') ? 1 : 0;
