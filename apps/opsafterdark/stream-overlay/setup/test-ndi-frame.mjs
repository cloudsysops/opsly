// Comprueba que el DJ NDI queda dentro del marco 640x360 (x 1820-2460, y 860-1220) con cualquier resolución.
// Método: escena temporal con una fuente roja de cada tamaño, mismo transform que el DJ real, captura de pantalla
// y medición del rectángulo rojo. La escena se borra al final y se restaura la escena previa. Nunca con stream en vivo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withObs } from '@intcloudsysops/stream-ops-kit/obs';

const scene = '__ndi-frame-test__';
const sizes = [[1920, 1080], [1280, 720], [2560, 1440], [1920, 1200], [3840, 2160]];
const measure = new URL('./measure-box.ps1', import.meta.url).pathname.slice(1);
const shot = path.join(os.tmpdir(), 'ndi-frame-test.png');

const ok = await withObs(async (req) => {
  if ((await req('GetStreamStatus')).outputActive) throw new Error('stream-live-refusing-to-test');
  const dj = (await req('GetSceneItemList', { sceneName: 'Streaming' })).sceneItems.find((i) => i.sourceName === 'DJ NDI (Mac)').sceneItemTransform;
  const frame = { x: 1820, y: 860, w: 640, h: 360 };
  console.log(`Transform real del DJ: ${dj.boundsType} ${dj.boundsWidth}x${dj.boundsHeight} en (${dj.positionX},${dj.positionY})`);
  let pass = dj.boundsType === 'OBS_BOUNDS_SCALE_INNER' && dj.boundsWidth === frame.w && dj.boundsHeight === frame.h && dj.positionX === frame.x && dj.positionY === frame.y;
  const previous = (await req('GetCurrentProgramScene')).currentProgramSceneName;
  await req('CreateScene', { sceneName: scene });
  await req('SetCurrentProgramScene', { sceneName: scene });
  try {
    for (const [w, h] of sizes) {
      const name = `__ndi-test-${w}x${h}`;
      const { sceneItemId } = await req('CreateInput', { sceneName: scene, inputName: name, inputKind: 'color_source_v3', inputSettings: { width: w, height: h, color: 4278190335 }, sceneItemEnabled: true });
      const { alignment, positionX, positionY, boundsType, boundsAlignment, boundsWidth, boundsHeight } = dj;
      await req('SetSceneItemTransform', { sceneName: scene, sceneItemId, sceneItemTransform: { alignment, positionX, positionY, boundsType, boundsAlignment, boundsWidth, boundsHeight } });
      await new Promise((r) => setTimeout(r, 400));
      const { imageData } = await req('GetSourceScreenshot', { sourceName: scene, imageFormat: 'png', imageWidth: 2560, imageHeight: 1440 });
      fs.writeFileSync(shot, Buffer.from(imageData.split(',')[1], 'base64'));
      const [x, y, bw, bh] = execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', measure, shot], { encoding: 'utf8' }).trim().split(' ').map(Number);
      const inside = x >= frame.x - 2 && y >= frame.y - 2 && x + bw <= frame.x + frame.w + 2 && y + bh <= frame.y + frame.h + 2 && (bw >= frame.w - 3 || bh >= frame.h - 3);
      pass &&= inside;
      console.log(`${w}x${h} -> caja ${bw}x${bh} en (${x},${y}) ${inside ? 'OK' : 'FUERA DEL MARCO'}`);
      await req('RemoveInput', { inputName: name });
    }
  } finally { await req('SetCurrentProgramScene', { sceneName: previous }); await req('RemoveScene', { sceneName: scene }); }
  return pass;
}, 60000);
console.log(ok ? 'RESULTADO: el marco 640x360 se mantiene' : 'RESULTADO: FALLA');
process.exitCode = ok ? 0 : 1;
