// Panel de control web de la produccion: http://127.0.0.1:8766/control  (solo local).
// Musica, set, grabacion, colores del proyector y cambio de escena de OBS desde botones.
export const controlPage = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Control OAD</title><style>
:root{--g:#39ff88;--c:#47d7ff;--m:#ff3df2;--bg:#070b12;--card:#0e1624;--line:#1d2b44;--tx:#e8f1ff;--mut:#8aa0bd}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.4 "Segoe UI",system-ui,sans-serif;padding:16px;max-width:900px;margin:auto}
h1{font-size:22px;margin:0 0 4px;letter-spacing:2px}h1 b{color:var(--c)}.sub{color:var(--mut);font-size:13px;margin-bottom:14px}
.st{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}.pill{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:14px}.pill b{color:var(--g)}.pill.off b{color:var(--mut)}
section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:12px}h2{margin:0 0 10px;font-size:13px;letter-spacing:3px;color:var(--mut);font-weight:600}
.row{display:flex;flex-wrap:wrap;gap:8px}button{background:#13213a;color:var(--tx);border:1px solid #27406b;border-radius:10px;padding:11px 14px;font:inherit;font-weight:600;cursor:pointer;min-height:44px}
button:hover{border-color:var(--c)}button:active{transform:scale(.97)}button.go{background:#0c3a25;border-color:#1f8a58}button.stop{background:#3a1220;border-color:#8a2040}button.on{outline:2px solid var(--g)}
.sw{width:28px;height:28px;border-radius:50%;display:inline-block;vertical-align:middle;margin-right:8px;border:1px solid #fff3}
input[type=range]{width:100%;accent-color:var(--c)}.msg{color:var(--mut);font-size:13px;min-height:18px;margin-top:6px}code{background:#0006;padding:2px 6px;border-radius:6px}
</style></head><body>
<h1>OPS<b>AFTERDARK</b> · CONTROL</h1><div class="sub">Producción en vivo — solo local (127.0.0.1)</div>
<div class="st"><span class="pill" id="p-son">Sonido: <b>—</b></span><span class="pill" id="p-set">Set: <b>—</b></span><span class="pill" id="p-rec">Grabando: <b>—</b></span><span class="pill" id="p-look">Colores: <b>—</b></span></div>
<section><h2>MÚSICA</h2><div class="row"><button class="go" onclick="call('/sonify/on')">Encender</button><button class="stop" onclick="call('/sonify/off')">Apagar</button><button onclick="vol(-0.04)">Volumen −</button><button onclick="vol(0.04)">Volumen +</button><span class="pill" id="vol">vol —</span></div></section>
<section><h2>SET DE FESTIVAL (sale al aire)</h2><div class="row"><button class="go" onclick="startSet(30)">Iniciar set 30 min</button><button onclick="startSet(5)">Prueba 5 min</button><button onclick="call('/set/skip')">Saltar sección</button><button class="stop" onclick="call('/set/stop')">Detener set</button></div><div class="msg" id="setmsg"></div></section>
<section><h2>GRABAR (WAV + MIDI)</h2><div class="row"><button class="go" onclick="call('/rec/on')">Grabar</button><button class="stop" onclick="call('/rec/off')">Parar y guardar</button></div><div class="msg">Se guarda en <code>D:\\Content\\Music\\Factory</code></div></section>
<section><h2>COLORES DEL PROYECTOR</h2><div class="row" id="pals"></div><div style="margin-top:12px"><label>Desplazar tono: <b id="hv">0</b>°</label><input id="hue" type="range" min="-180" max="180" value="0" oninput="hue(this.value)"></div></section>
<section><h2>ESCENAS DE OBS (cambia el directo)</h2><div class="row" id="scn"></div></section>
<section><h2>PROYECTOR</h2><div class="row"><a href="/festival?edit=1" target="_blank"><button>Editar mapeo (esquinas)</button></a><a href="/festival?sim=1" target="_blank"><button>Previsualizar</button></a></div><div class="msg">Abrir en el proyector: <code>projector.ps1 -Screen N</code></div></section>
<div class="msg" id="msg"></div>
<script>
const PAL=[['neon','#ff3df2'],['fuego','#ff6a1a'],['hielo','#5ad7ff'],['matrix','#39ff88'],['ultravioleta','#9a5cff'],['oro','#ffc83d'],['arcoiris','conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)'],['mono','#cfd8e3']];
const SC=[['juego','Gaming + Vibe'],['bf6','Battlefield 6'],['zoom','BF6 Zoom'],['hacker','AI Factory'],['festival','Festival'],['inicio','Iniciando'],['brb','Vuelvo'],['fin','Terminando']];
let S={};const \$=id=>document.getElementById(id);
\$('pals').innerHTML=PAL.map(([n,c])=>'<button id="pal-'+n+'" onclick="call(\\'/look/palette/'+n+'\\')"><span class="sw" style="background:'+c+'"></span>'+n+'</button>').join('');
\$('scn').innerHTML=SC.map(([k,t])=>'<button onclick="scene(\\''+k+'\\','+(k==='fin'||k==='inicio'?1:0)+')">'+t+'</button>').join('');
async function call(u){try{const r=await fetch(u,{cache:'no-store'});await r.json();\$('msg').textContent='OK '+u}catch(e){\$('msg').textContent='Error '+u}poll()}
async function vol(d){const v=Math.min(.6,Math.max(0,(S.vol||.22)+d));await call('/sonify/vol/'+v.toFixed(2))}
async function startSet(m){if(!confirm('Esto cambia el directo a la escena Festival, sube el sonido y graba '+m+' min. ¿Continuar?'))return;const r=await fetch('/set/start?min='+m).then(r=>r.json());\$('setmsg').textContent='Set iniciado: '+m+' min';poll()}
async function scene(k,c){if(c&&!confirm('Cambiar el directo a la escena "'+k+'". ¿Continuar?'))return;await call('/scene/'+k)}
let ht;function hue(v){\$('hv').textContent=v;clearTimeout(ht);ht=setTimeout(()=>call('/look/hue/'+v),150)}
async function poll(){try{S=await fetch('/sonify',{cache:'no-store'}).then(r=>r.json());
  \$('p-son').className='pill'+(S.on?'':' off');\$('p-son').innerHTML='Sonido: <b>'+(S.on?'ENCENDIDO':'apagado')+'</b>';\$('vol').textContent='vol '+(S.vol||0).toFixed(2);
  const s=S.set;\$('p-set').className='pill'+(s&&s.on?'':' off');\$('p-set').innerHTML='Set: <b>'+(s&&s.on?s.name+' → '+s.next+' ('+Math.round(s.secLeft)+'s)':'detenido')+'</b>';
  \$('p-rec').className='pill'+(S.rec?'':' off');\$('p-rec').innerHTML='Grabando: <b>'+(S.rec?'SÍ':'no')+'</b>';
  const l=S.look||{palette:'neon',hue:0};\$('p-look').innerHTML='Colores: <b>'+l.palette+(l.hue?' '+(l.hue>0?'+':'')+l.hue+'°':'')+'</b>';
  PAL.forEach(([n])=>{const b=\$('pal-'+n);if(b)b.className=n===l.palette?'on':''});if(document.activeElement!==\$('hue')){\$('hue').value=l.hue||0;\$('hv').textContent=l.hue||0}
}catch{\$('p-son').innerHTML='Sonido: <b>servidor sin respuesta</b>'}}
poll();setInterval(poll,1500);
</script></body></html>`;
