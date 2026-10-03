// Deja las pistas de audio como debe ser para el VOD de Twitch (pista 2):
//   Mic/Aux         -> 1 (directo) + 2 (VOD) + 3 (pista "Micro" para grabar)
//   Desktop Audio   -> 1 + 2 (sin cambios)
//   Strudel Música  -> SOLO 1
// No toca dispositivos, volúmenes, monitoreo ni Desktop Audio. Se niega a correr en vivo.
import { withObs } from './obs.mjs';

const want = {
  'Mic/Aux': [1, 2, 3],
  'Desktop Audio': [1, 2],
  'Strudel Música': [1],
};
await withObs(async (req) => {
  if ((await req('GetStreamStatus')).outputActive) throw new Error('stream-live-refusing-to-edit');
  for (const [inputName, tracks] of Object.entries(want)) {
    const before = (await req('GetInputAudioTracks', { inputName })).inputAudioTracks;
    const next = Object.fromEntries([1, 2, 3, 4, 5, 6].map((t) => [t, tracks.includes(t)]));
    const same = [1, 2, 3, 4, 5, 6].every((t) => Boolean(before[t]) === next[t]);
    if (!same) await req('SetInputAudioTracks', { inputName, inputAudioTracks: next });
    const now = (await req('GetInputAudioTracks', { inputName })).inputAudioTracks;
    console.log(`${inputName.padEnd(16)} ${same ? 'ya estaba' : 'CORREGIDO'} → pistas ${Object.entries(now).filter(([, v]) => v).map(([k]) => k).join(',')}`);
  }
});
