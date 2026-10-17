// Control rápido de escenas: node stream-ctl.mjs <inicio|coding|juego|dj|brb|fin|live|stop>
import { withObs, scenes } from './obs.mjs';
const cmd = process.argv[2];
if (!scenes[cmd] && !['live', 'stop'].includes(cmd)) { console.log(`uso: stream-ctl.mjs <${Object.keys(scenes).join('|')}|live|stop>`); process.exit(1); }

await withObs(async (req) => {
  if (scenes[cmd]) await req('SetCurrentProgramScene', { sceneName: scenes[cmd] });
  if (cmd === 'live') { await req('SetCurrentProgramScene', { sceneName: scenes.inicio }); await req('StartStream'); }
  if (cmd === 'stop') await req('StopStream');
  console.log(JSON.stringify({ ok: true, cmd, scene: (await req('GetCurrentProgramScene')).currentProgramSceneName }));
});
