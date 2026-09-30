// Prueba LOCAL de pistas de audio (sin transmitir): graba ~140 s en D:\Content\Media\OBS con 3 fases
//   A) 0-40 s sin música · B) 40-110 s Strudel sonando · C) 110-140 s sin música
// La grabación lleva las mismas pistas que el directo: 1 Mezcla, 2 VOD (juego+voz), 3 Micro, 4 DJ.
// Nunca inicia el stream. Al terminar restaura la fuente Strudel, la escena "inicio" y oculta el widget.
//   node test-vod-audio.mjs           (imprime la ruta del archivo y los picos por fase)
import { withObs, api, tool } from '../../../../packages/stream-ops-kit/src/obs.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PHASES = [['A', 40], ['B', 70], ['C', 30]];
const peaks = { A: {}, B: {}, C: {} };
let phase = null;
const onEvent = (e) => {
  if (e.eventType !== 'InputVolumeMeters' || !phase) return;
  for (const i of e.eventData.inputs) {
    if (!/Mic|Desktop|Strudel/.test(i.inputName)) continue;
    const v = Math.max(0, ...i.inputLevelsMul.flat().map(Number));
    peaks[phase][i.inputName] = Math.max(peaks[phase][i.inputName] ?? 0, v);
  }
};

const result = await withObs(async (req) => {
  if ((await req('GetStreamStatus')).outputActive) throw new Error('stream-live-refusing-to-test');
  if ((await req('GetRecordStatus')).outputActive) throw new Error('ya-se-esta-grabando');
  const source = 'Strudel Música';
  const saved = { scene: (await req('GetCurrentProgramScene')).currentProgramSceneName, settings: (await req('GetInputSettings', { inputName: source })).inputSettings };
  let file = null;
  try {
    await tool('/music-test/state?play=0');
    await req('SetInputSettings', { inputName: source, inputSettings: { url: `${api}/music-test` }, overlay: true });
    await req('SetCurrentProgramScene', { sceneName: 'Battlefield 6 — Día 2' });
    await sleep(5000);
    await req('StartRecord');
    await sleep(2000);
    for (const [name, secs] of PHASES) {
      phase = name;
      if (name === 'B') await tool('/music-test/state?play=1&file=01-techno-oscuro.strudel');
      if (name === 'C') await tool('/music-test/state?play=0');
      console.log(`fase ${name} (${secs}s)`);
      await sleep(secs * 1000);
    }
    phase = null;
    file = (await req('StopRecord')).outputPath;
  } finally {
    await tool('/music-test/state?play=0').catch(() => {});
    await req('SetInputSettings', { inputName: source, inputSettings: { url: saved.settings.url }, overlay: true }).catch(() => {});
    await req('SetCurrentProgramScene', { sceneName: 'Iniciando Stream' }).catch(() => {});
  }
  return { file, restoredUrl: saved.settings.url, wasScene: saved.scene };
}, 240000, { eventSubscriptions: 1 << 16, onEvent });

const db = (v) => (20 * Math.log10(v || 1e-9)).toFixed(1);
for (const [p, inputs] of Object.entries(peaks)) console.log(`picos fase ${p}:`, Object.entries(inputs).map(([k, v]) => `${k}=${db(v)}dBFS`).join('  '));
console.log(JSON.stringify(result));
