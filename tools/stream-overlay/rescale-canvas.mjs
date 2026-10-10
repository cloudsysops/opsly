// Cambia el lienzo base de OBS de 2560x1440 a 1920x1080 y reescala TODAS las escenas (x0,75) para que se vean igual.
// La salida ya era 1920x1080, asi que el video final no cambia; OBS compone menos pixeles (menos GPU).
//   node rescale-canvas.mjs            -> solo muestra el plan (no cambia nada)
//   node rescale-canvas.mjs --apply    -> guarda copia en obs-canvas-backup.json y aplica
//   node rescale-canvas.mjs --revert   -> restaura el lienzo y las posiciones desde la copia
// Se niega a actuar si OBS esta en vivo o grabando.
import fs from 'node:fs';
import { withObs } from './obs.mjs';
const MODE = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--revert') ? 'revert' : 'dry';
const BACKUP = new URL('./obs-canvas-backup.json', import.meta.url), F = 0.75;
const r2 = (n) => Math.round(n * 1000) / 1000;
await withObs(async (r) => {
  const st = await r('GetStreamStatus'), rc = await r('GetRecordStatus');
  if (st.outputActive || rc.outputActive) { console.log('OBS esta en vivo o grabando: no toco nada.'); return; }
  const v = await r('GetVideoSettings');
  if (MODE === 'revert') {
    const b = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
    await r('SetVideoSettings', { baseWidth: b.video.baseWidth, baseHeight: b.video.baseHeight, outputWidth: b.video.outputWidth, outputHeight: b.video.outputHeight, fpsNumerator: b.video.fpsNumerator, fpsDenominator: b.video.fpsDenominator });
    let n = 0; for (const it of b.items) { try { await r('SetSceneItemTransform', { sceneName: it.scene, sceneItemId: it.id, sceneItemTransform: it.t }); n++; } catch (e) { console.log('no pude restaurar', it.scene, it.name, e.message); } }
    console.log(`restaurado: lienzo ${b.video.baseWidth}x${b.video.baseHeight} y ${n} elementos`); return;
  }
  if (v.baseWidth === 1920 && v.baseHeight === 1080) { console.log('El lienzo ya es 1920x1080: nada que hacer.'); return; }
  const scenes = (await r('GetSceneList')).scenes.map((s) => s.sceneName), items = [];
  for (const scene of scenes) for (const i of (await r('GetSceneItemList', { sceneName: scene })).sceneItems) {
    if (/wasapi/.test(i.inputKind || '')) continue;               // audio: sin geometria
    items.push({ scene, id: i.sceneItemId, name: i.sourceName, t: i.sceneItemTransform });
  }
  console.log(`${scenes.length} escenas, ${items.length} elementos con geometria; lienzo actual ${v.baseWidth}x${v.baseHeight} -> 1920x1080 (x${F})`);
  if (MODE === 'dry') { for (const it of items.slice(0, 6)) console.log('  ej.', it.scene, '|', it.name, `pos(${Math.round(it.t.positionX)},${Math.round(it.t.positionY)}) -> (${Math.round(it.t.positionX * F)},${Math.round(it.t.positionY * F)})`); console.log('(prueba: no se cambio nada; usa --apply)'); return; }
  fs.writeFileSync(BACKUP, JSON.stringify({ created: new Date().toISOString(), video: v, items }));
  await r('SetVideoSettings', { baseWidth: 1920, baseHeight: 1080, outputWidth: 1920, outputHeight: 1080, fpsNumerator: v.fpsNumerator, fpsDenominator: v.fpsDenominator });
  let ok = 0, fail = 0;
  for (const it of items) {
    const t = it.t, nt = { positionX: r2(t.positionX * F), positionY: r2(t.positionY * F) };
    if (t.boundsType === 'OBS_BOUNDS_NONE') { nt.scaleX = r2(t.scaleX * F); nt.scaleY = r2(t.scaleY * F); }
    else { nt.boundsWidth = Math.max(1, r2(t.boundsWidth * F)); nt.boundsHeight = Math.max(1, r2(t.boundsHeight * F)); }
    try { await r('SetSceneItemTransform', { sceneName: it.scene, sceneItemId: it.id, sceneItemTransform: nt }); ok++; } catch (e) { fail++; console.log('fallo', it.scene, it.name, e.message); }
  }
  const nv = await r('GetVideoSettings');
  console.log(`aplicado: ${ok} elementos reescalados, ${fail} fallos | lienzo ahora ${nv.baseWidth}x${nv.baseHeight} -> salida ${nv.outputWidth}x${nv.outputHeight} @${nv.fpsNumerator / nv.fpsDenominator}`);
}, 180000);
