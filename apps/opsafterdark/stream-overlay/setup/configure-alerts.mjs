// Agrega la fuente "Alertas" (mismo navegador, una sola instancia) arriba de cada escena de juego.
import { withObs } from '@intcloudsysops/stream-ops-kit/obs';

const source = 'Alertas';
const targets = ['Streaming', 'Gaming', 'Coding', 'Battlefield 6 — Día 2'];
const settings = { url: 'http://127.0.0.1:8765/alerts', width: 2560, height: 1440, shutdown: false, restart_when_active: false, refreshnocache: true };

await withObs(async (req) => {
  if ((await req('GetStreamStatus')).outputActive) throw new Error('stream-live-refusing-to-edit');
  for (const scene of targets) {
    let id;
    try { id = (await req('GetSceneItemId', { sceneName: scene, sourceName: source })).sceneItemId; }
    catch {
      try { await req('GetInputSettings', { inputName: source }); id = (await req('CreateSceneItem', { sceneName: scene, sourceName: source })).sceneItemId; }
      catch { id = (await req('CreateInput', { sceneName: scene, inputName: source, inputKind: 'browser_source', inputSettings: settings, sceneItemEnabled: true })).sceneItemId; }
    }
    const count = (await req('GetSceneItemList', { sceneName: scene })).sceneItems.length;
    await req('SetSceneItemTransform', { sceneName: scene, sceneItemId: id, sceneItemTransform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 } });
    await req('SetSceneItemIndex', { sceneName: scene, sceneItemId: id, sceneItemIndex: count - 1 });
    await req('SetSceneItemEnabled', { sceneName: scene, sceneItemId: id, sceneItemEnabled: true });
  }
  await req('SetInputSettings', { inputName: source, inputSettings: settings, overlay: true });
  console.log(JSON.stringify({ configured: true, source, scenes: targets }));
});
