// Página de PRUEBA local (no se usa en el directo): reproduce un patrón de music/ con @strudel/web
// dentro de la fuente real "Strudel Música" para comprobar el enrutamiento de audio en OBS.
// Sin samples: prebake vacío. El estado (play/stop) lo controla test-vod-audio.mjs.
export const musicTest = `<!doctype html><html><head><meta charset="utf-8"><title>Strudel test</title>
<script src="https://unpkg.com/@strudel/web@1.2.6"></script></head><body style="margin:0;background:#000;color:#0f0;font:20px monospace"><pre id="log">cargando…</pre><script>
const log=t=>{document.getElementById('log').textContent=t};let ready=false,playing=false,current='';
(async()=>{try{await initStrudel({prebake:()=>{}});ready=true;log('strudel listo')}catch(e){log('ERROR init: '+e.message)}})();
async function tick(){if(!ready)return;try{const s=await fetch('/music-test/state',{cache:'no-store'}).then(r=>r.json());
if(s.play&&(!playing||current!==s.file)){const code=await fetch('/music/'+s.file).then(r=>r.text());try{const ctx=getAudioContext&&getAudioContext();ctx&&ctx.resume&&await ctx.resume()}catch{}
await evaluate(code);playing=true;current=s.file;log('sonando '+s.file+' ctx='+(typeof getAudioContext==='function'?getAudioContext().state:'?'))}
if(!s.play&&playing){hush();playing=false;current='';log('detenido')}}catch(e){log('ERROR: '+e.message)}}
setInterval(tick,700);
</script></body></html>`;
