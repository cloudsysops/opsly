// Crea la fuente de audio independiente "Strudel Música" (navegador con audio redirigido a OBS).
// No toca Desktop Audio, Mic/Aux, el dispositivo de monitoreo ni los ajustes de salida. Se niega a correr en vivo.
import { withObs } from '@intcloudsysops/stream-ops-kit/obs';

const source = 'Strudel Música';
const scenes = ['Iniciando Stream', 'Gaming', 'Coding', 'Battlefield 6 — Día 2', 'Streaming', 'Vuelvo en un momento', 'Terminando Stream'];
// Fuera del lienzo (2560x1440): la fuente está "activa" en todas las escenas, así el audio nunca se corta al cambiar, y no se ve.
const offCanvas = { positionX: 2700, positionY: 0, scaleX: 1, scaleY: 1 };
const settings = { url: 'https://strudel.cc/', width: 1280, height: 720, reroute_audio: true, shutdown: false, restart_when_active: false };

await withObs(async (req) => {
  if ((await req('GetStreamStatus')).outputActive) throw new Error('stream-live-refusing-to-edit');
  let exists = true;
  try { await req('GetInputSettings', { inputName: source }); } catch { exists = false; }
  if (!exists) await req('CreateInput', { sceneName: scenes[0], inputName: source, inputKind: 'browser_source', inputSettings: settings, sceneItemEnabled: true });
  else await req('SetInputSettings', { inputName: source, inputSettings: settings, overlay: true });

  for (const scene of scenes) {
    let id;
    try { id = (await req('GetSceneItemId', { sceneName: scene, sourceName: source })).sceneItemId; }
    catch { id = (await req('CreateSceneItem', { sceneName: scene, sourceName: source })).sceneItemId; }
    await req('SetSceneItemTransform', { sceneName: scene, sceneItemId: id, sceneItemTransform: offCanvas });
    await req('SetSceneItemEnabled', { sceneName: scene, sceneItemId: id, sceneItemEnabled: true });
  }
  // Solo pista 1 (mezcla del directo). NO en la pista 2, que es la del VOD de Twitch.
  await req('SetInputAudioTracks', { inputName: source, inputAudioTracks: { 1: true, 2: false, 3: false, 4: false, 5: false, 6: false } });
  await req('SetInputVolume', { inputName: source, inputVolumeDb: -18 });
  await req('SetInputAudioMonitorType', { inputName: source, monitorType: 'OBS_MONITORING_TYPE_NONE' });
  console.log(JSON.stringify({ configured: true, source, scenes: scenes.length, tracks: '1 (no 2)', volumeDb: -18, monitor: 'none' }));
});
