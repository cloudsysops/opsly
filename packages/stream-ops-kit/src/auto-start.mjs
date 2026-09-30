// Cambia de "Iniciando Stream" a la escena de juego al llegar a cero. NUNCA inicia ni detiene el stream.
//   node auto-start.mjs            vigila schedule.json (hora de Nueva York)
//   node auto-start.mjs --test 15  prueba de 15 s contra OBS y restaura la escena previa
import { withObs, scenes, api, tool } from './obs.mjs';

const testIndex = process.argv.indexOf('--test');
const testSeconds = testIndex > -1 ? Number(process.argv[testIndex + 1]) || 10 : 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = () => fetch(`${api}/schedule`).then((r) => r.json());

let previous = null;
if (testSeconds) {
  previous = await withObs((req) => req('GetCurrentProgramScene')).then((x) => x.currentProgramSceneName);
  if ((await withObs((req) => req('GetStreamStatus'))).outputActive) console.log('AVISO: ya estás en vivo; la prueba solo cambia escenas.');
  await tool(`/schedule/test?secs=${testSeconds}`);
  await withObs((req) => req('SetCurrentProgramScene', { sceneName: scenes.inicio }));
  console.log(`Prueba: ${testSeconds}s en "${scenes.inicio}"`);
} else if ((await get()).remaining <= 0) {
  console.log('La hora de schedule.json ya pasó. Edita "at" o usa --test.');
  process.exit(1);
}

const deadline = Date.now() + 6 * 3600 * 1000;
while (Date.now() < deadline) {
  const s = await get();
  if (s.remaining <= 0) {
    const target = scenes[s.scene] ?? s.scene;
    const result = await withObs(async (req) => {
      const now = (await req('GetCurrentProgramScene')).currentProgramSceneName;
      if (now !== scenes.inicio) return { switched: false, reason: `escena actual "${now}" no es la de inicio; no se toca` };
      await req('SetCurrentProgramScene', { sceneName: target });
      return { switched: true, scene: (await req('GetCurrentProgramScene')).currentProgramSceneName };
    });
    console.log(JSON.stringify(result));
    if (testSeconds) {
      await tool('/schedule/test?secs=0');
      await sleep(1500);
      await withObs((req) => req('SetCurrentProgramScene', { sceneName: previous }));
      console.log(`Escena restaurada: "${previous}"`);
      process.exit(result.switched && result.scene === target ? 0 : 1);
    }
    break;
  }
  await sleep(500);
}
