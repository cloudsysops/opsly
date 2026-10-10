// Imprime en JSON el estado de OBS que le interesa a la revision previa (solo lectura).
import { withObs } from './obs.mjs';
try {
  const o = await withObs(async (r) => {
    const st = await r('GetStreamStatus'), rc = await r('GetRecordStatus'), s = await r('GetStats'), v = await r('GetVideoSettings');
    return { ok: true, live: st.outputActive, recording: rc.outputActive, scene: (await r('GetCurrentProgramScene')).sceneName, studio: (await r('GetStudioModeEnabled')).studioModeEnabled,
      profile: (await r('GetProfileList')).currentProfileName, canvas: `${v.baseWidth}x${v.baseHeight}`, output: `${v.outputWidth}x${v.outputHeight}`, fps: v.fpsNumerator / v.fpsDenominator, activeFps: +s.activeFps.toFixed(1),
      cpuOBS: +s.cpuUsage.toFixed(1), renderMs: +s.averageFrameRenderTime.toFixed(2), skipped: st.outputSkippedFrames, total: st.outputTotalFrames };
  }, 8000);
  console.log(JSON.stringify(o));
} catch (e) { console.log(JSON.stringify({ ok: false, error: e.message })); }
