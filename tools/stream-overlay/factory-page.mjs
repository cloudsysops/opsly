// Overlay "AI FACTORY // HACKER" (transparente, 2560x1440). Servido por vibe-live.mjs en /factory.
// Solo visual: lluvia de codigo, grafo de agentes con pulsos, terminal con la actividad real, metricas del PC.
export const factoryPage = `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--g:#39ff88;--c:#47d7ff;--m:#ff3df2;--bg:rgba(2,8,6,.82)}
html,body{margin:0;width:2560px;height:1440px;overflow:hidden;background:transparent;font-family:"Cascadia Mono",Consolas,monospace;color:var(--g)}
#panel{position:absolute;right:30px;top:30px;width:780px;height:1170px;background:var(--bg);border:2px solid rgba(57,255,136,.55);box-shadow:0 0 40px rgba(57,255,136,.25),inset 0 0 60px rgba(57,255,136,.06);overflow:hidden}
#rain{position:absolute;inset:0;opacity:.28}
#in{position:absolute;inset:0;padding:26px 30px;display:flex;flex-direction:column;gap:16px}
.top{display:flex;justify-content:space-between;font-size:20px;letter-spacing:3px;color:#7fcf9f}
h1{margin:0;font-size:60px;letter-spacing:6px;line-height:1;color:#eafff3;text-shadow:0 0 18px var(--g);position:relative}
h1 b{color:var(--c);text-shadow:0 0 18px var(--c)}
h1:before,h1:after{content:attr(data-t);position:absolute;left:0;top:0;opacity:.0;mix-blend-mode:screen}
h1:before{color:var(--m);animation:gl 3.2s infinite steps(1)}h1:after{color:var(--c);animation:gl2 3.2s infinite steps(1)}
@keyframes gl{0%,92%,100%{opacity:0}93%{opacity:.8;transform:translate(-5px,1px)}96%{opacity:.8;transform:translate(4px,-2px)}}
@keyframes gl2{0%,94%,100%{opacity:0}95%{opacity:.8;transform:translate(5px,-1px)}98%{opacity:.8;transform:translate(-4px,2px)}}
.sub{font-size:20px;letter-spacing:4px;color:#7fcf9f}
#eq{width:100%;height:84px;border:1px solid rgba(57,255,136,.3);background:rgba(0,0,0,.35)}
.np{font-size:22px;display:flex;justify-content:space-between;color:#7fcf9f;letter-spacing:2px;white-space:nowrap;overflow:hidden}.np b{color:var(--m);text-shadow:0 0 12px var(--m);overflow:hidden;text-overflow:ellipsis;font-weight:700}
#panel.beat{box-shadow:0 0 70px rgba(255,61,242,.55),inset 0 0 80px rgba(57,255,136,.12);border-color:rgba(255,61,242,.8)}
canvas#net{width:100%;height:360px;border:1px solid rgba(57,255,136,.3);background:rgba(0,0,0,.35)}
.m{display:grid;grid-template-columns:80px 1fr 210px;gap:12px;align-items:center;font-size:22px}
.b{height:16px;background:rgba(255,255,255,.08);border:1px solid rgba(57,255,136,.3)}.b i{display:block;height:100%;background:linear-gradient(90deg,var(--g),var(--c));transition:width 1s;box-shadow:0 0 10px var(--g)}
#log{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;font-size:24px;line-height:1.35}
.l{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:ln .3s}.l .t{color:#5aa07a}.l .k{color:var(--c)}.l .o{color:var(--g)}.l.h{color:var(--m)}
@keyframes ln{from{opacity:0;transform:translateX(-14px)}}
.cur{display:inline-block;width:13px;height:24px;background:var(--g);vertical-align:-4px;animation:bl .8s steps(1) infinite}@keyframes bl{50%{opacity:0}}
.foot{display:flex;justify-content:space-between;font-size:20px;color:#7fcf9f;letter-spacing:2px}
.st{color:var(--g);animation:bl 1.4s infinite}
#scan{position:absolute;left:0;right:0;height:140px;top:-140px;background:linear-gradient(transparent,rgba(57,255,136,.10),transparent);animation:sc 5s linear infinite;pointer-events:none}@keyframes sc{to{top:100%}}
</style></head><body><div id="panel"><canvas id="rain"></canvas><div id="scan"></div><div id="in">
<div class="top"><span>root@opsly:~#</span><span id="clk"></span></div>
<h1 data-t="AI FACTORY">AI <b>FACTORY</b></h1><div class="sub">AGENT MESH // <span class="st" id="mesh">ONLINE</span></div>
<canvas id="net" width="720" height="360"></canvas>
<div class="m"><span>FPS</span><div class="b"><i id="bf"></i></div><span id="vf"></span></div>
<div class="m"><span>CPU</span><div class="b"><i id="bc"></i></div><span id="vc"></span></div>
<div class="m"><span>GPU</span><div class="b"><i id="bg"></i></div><span id="vg"></span></div>
<div class="m"><span>RAM</span><div class="b"><i id="br"></i></div><span id="vr"></span></div>
<div class="np"><span>♫ <b id="npt">sin música</b></span><span id="bpm"></span></div>
<canvas id="eq" width="720" height="84"></canvas>
<div id="log"></div>
<div class="foot"><span>$ <span id="cmd"></span><span class="cur"></span></span><span id="ev">0 ops</span></div>
</div></div><script>
const $=id=>document.getElementById(id),rnd=(a,b)=>a+Math.random()*(b-a);
const Q0=new URLSearchParams(location.search),ENGINE=Q0.has('engine'),VISUAL=Q0.has('visual'); // engine = solo audio (ligero); visual = solo imagen (sin audio)
// ---- lluvia de codigo
const R=$('rain'),rc=R.getContext('2d');R.width=780;R.height=1170;const cols=Math.floor(R.width/18),drops=Array.from({length:cols},()=>rnd(-60,0));
const chars='01アイウエオカキクケコサシスセソ{}[]<>=/\\\\;:#\\$%&*+-ABCDEF'.split('');
!ENGINE&&setInterval(()=>{rc.fillStyle='rgba(2,8,6,.16)';rc.fillRect(0,0,R.width,R.height);rc.font='18px monospace';
  drops.forEach((y,i)=>{rc.fillStyle=Math.random()>.97?'#eafff3':'#39ff88';rc.fillText(chars[Math.random()*chars.length|0],i*18,y*18);drops[i]=y*18>R.height&&Math.random()>.975?0:y+1})},60);
// ---- grafo de agentes
const N=$('net'),g=N.getContext('2d');const W=N.width,H=N.height;
const nodes=[{n:'CORE',x:W/2,y:H/2,c:'#eafff3'},{n:'CLAUDE',x:120,y:70,c:'#ffb267'},{n:'CODEX',x:W-120,y:70,c:'#39ff88'},{n:'CURSOR',x:110,y:H-60,c:'#47d7ff'},{n:'TERMINAL',x:W-120,y:H-60,c:'#ff3df2'},{n:'MISSION',x:W/2,y:H-62,c:'#9aa7ff'}];
const pulses=[];let ph=0;
function ping(to){pulses.push({to:to%nodes.length||1,p:0,out:Math.random()>.5})}
setInterval(()=>ping(1+Math.random()*5|0),700);
function draw(){ph+=.03;g.clearRect(0,0,W,H);
  nodes.slice(1).forEach(n=>{g.strokeStyle='rgba(57,255,136,.28)';g.lineWidth=1.5;g.beginPath();g.moveTo(nodes[0].x,nodes[0].y);g.lineTo(n.x,n.y);g.stroke()});
  pulses.forEach(p=>{p.p+=.02;const n=nodes[p.to],a=p.out?nodes[0]:n,b=p.out?n:nodes[0],t=Math.min(p.p,1);
    g.fillStyle=n.c;g.shadowColor=n.c;g.shadowBlur=14;g.beginPath();g.arc(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,5,0,7);g.fill();g.shadowBlur=0});
  for(let i=pulses.length-1;i>=0;i--)if(pulses[i].p>=1)pulses.splice(i,1);
  nodes.forEach((n,i)=>{const r=(i?22:30)+Math.sin(ph*2+i)*3;g.strokeStyle=n.c;g.lineWidth=2.5;g.shadowColor=n.c;g.shadowBlur=16;g.beginPath();g.arc(n.x,n.y,r,0,7);g.stroke();g.shadowBlur=0;
    g.fillStyle=n.c;g.font='bold 17px monospace';g.textAlign='center';g.fillText(n.n,n.x,n.y+(i?r+22:5))});
  requestAnimationFrame(draw)}if(!ENGINE)draw();
// ---- terminal con actividad real
const log=$('log');let seen=new Set(),ops=0;
const hex=()=>Array.from({length:4},()=>(Math.random()*65535|0).toString(16).padStart(4,'0')).join(':');
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function line(h){const d=document.createElement('div');d.className='l';d.innerHTML=h;log.appendChild(d);while(log.children.length>14)log.firstChild.remove()}
const stamp=()=>new Date().toLocaleTimeString('es-CO',{hour12:false});
function noise(){const m=['sync agents… <span class="o">ok</span>','heartbeat '+hex(),'queue.bullmq depth=<span class="k">'+(Math.random()*4|0)+'</span>','scan lanes… <span class="o">clean</span>','verify evidence <span class="o">PASS</span>','route -> '+['claude','codex','cursor'][Math.random()*3|0]];line('<span class="t">['+stamp()+']</span> '+m[Math.random()*m.length|0])}
setInterval(noise,2300);
async function tick(){try{const d=await fetch('/feed',{cache:'no-store'}).then(r=>r.json());
  $('mesh').textContent=d.working?'ACTIVE':'IDLE';
  d.events.filter(e=>!seen.has(e.t+e.tool+e.target)).forEach(e=>{seen.add(e.t+e.tool+e.target);ops++;ping(1+Math.random()*5|0);feedEvent(e);
    line('<span class="t">['+new Date(e.t).toLocaleTimeString('es-CO',{hour12:false})+']</span> <span class="k">'+esc(e.label.toLowerCase().replace(/ /g,'_'))+'</span> '+esc(e.target||'')+' <span class="o">✔</span>');
    $('cmd').textContent=(e.label.toLowerCase()+' '+(e.target||'')).slice(0,34)});
  $('ev').textContent=ops+' ops';if(d.commits[0]&&d.commits[0].t!==lastCommit){if(lastCommit)feedEvent({tool:'commit',target:d.commits[0].msg});lastCommit=d.commits[0].t}
  const m=await fetch('/metrics',{cache:'no-store'}).then(r=>r.json());
  [['c',m.cpu,Math.round(m.cpu)+'%'],['g',m.gpu,Math.round(m.gpu)+'% · '+(m.gpuTemp??'-')+'°C'],['r',m.ram,Math.round(m.ram)+'% · '+(m.ramGb||'').split(' / ')[0]+'G'],['f',(m.fps||0)/60*100,(m.fps??'-')+(m.drop!=null?' · '+m.drop+'%d':'')]].forEach(([k,v,t])=>{$('b'+k).style.width=Math.min(100,v)+'%';$('v'+k).textContent=t});
}catch{}}
tick();setInterval(tick,2000);
// ---- musica reactiva (medidores de OBS: Strudel + DDJ-SX2)
const E=$('eq'),eg=E.getContext('2d'),bars=Array(36).fill(0),ph2=Array.from({length:36},()=>Math.random()*6);let lvl=0,lastBeats=0,spd=1;
function eqDraw(t){eg.clearRect(0,0,E.width,E.height);const w=E.width/bars.length;
  bars.forEach((b,i)=>{const target=Math.min(1,lvl*(0.55+0.7*Math.abs(Math.sin(t/260+ph2[i]+i*.45)))*1.6);bars[i]=Math.max(target,b*0.86);
    const h=Math.max(3,bars[i]*(E.height-6));const gr=eg.createLinearGradient(0,E.height,0,0);gr.addColorStop(0,'#39ff88');gr.addColorStop(.65,'#47d7ff');gr.addColorStop(1,'#ff3df2');
    eg.fillStyle=gr;eg.shadowColor='#39ff88';eg.shadowBlur=8;eg.fillRect(i*w+2,E.height-h,w-4,h)});eg.shadowBlur=0;requestAnimationFrame(eqDraw)}if(!ENGINE)requestAnimationFrame(eqDraw);
const SIM=location.search.includes('sim');let simB=0;
async function audioTick(){if(SIM){const t=Date.now();lvl=Math.max(0,.45+.4*Math.sin(t/230)+.1*Math.random());const b=Math.floor(t/470);if(b!==simB){simB=b;const p=$('panel');p.classList.add('beat');setTimeout(()=>p.classList.remove('beat'),140);for(let i=1;i<nodes.length;i++)ping(i)}$('npt').textContent='demo · techno oscuro';$('bpm').textContent='128 BPM';return}try{const a=await fetch('/audio',{cache:'no-store'}).then(r=>r.json());lvl=Math.max(a.strudel,a.ddj);
  $('npt').textContent=(a.playing[0]||(lvl>0.02?'en vivo':'sin música')).slice(0,30);$('bpm').textContent=a.bpm?a.bpm+' BPM':'';
  if(a.beats!==lastBeats){lastBeats=a.beats;const p=$('panel');p.classList.add('beat');setTimeout(()=>p.classList.remove('beat'),140);for(let i=1;i<nodes.length;i++)ping(i)}
}catch{}}
setInterval(audioTick,80);
// ---- SONIFICACION: el trabajo de los agentes se convierte en musica (Web Audio, D menor, 124 BPM)
const Q=new URLSearchParams(location.search);const BPM=124,STEP=60/BPM/4;
let armT=0,ac,master,comp,out,recDest,dly,noiseBuf,recOn=false,recorder=null,recT0=0,rid='',evlog=[],sOn=Q.has('sound'),sVol=+(Q.get('vol')||0.25),inten=0,recent=[],queue=[],stepN=0,nextT=0,lastCommit=0;
const PENT=[293.66,349.23,392,440,523.25,587.33,698.46,783.99,880,1046.5];
const CHORDS=[[146.83,174.61,220],[116.54,146.83,174.61],[174.61,220,261.63],[130.81,164.81,196]];
const ROOTS=[73.42,58.27,87.31,65.41];
const hash=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h};
function initAudio(){if(ac)return;ac=new(window.AudioContext||window.webkitAudioContext)();comp=ac.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=12;comp.knee.value=6;master=ac.createGain();master.gain.value=0.6;
  dly=ac.createDelay(1);dly.delayTime.value=STEP*3;const fb=ac.createGain();fb.gain.value=.38;const wet=ac.createGain();wet.gain.value=.28;dly.connect(fb);fb.connect(dly);dly.connect(wet);wet.connect(master);
  master.connect(comp);const lim=ac.createWaveShaper(),cv=new Float32Array(4096);for(let i=0;i<4096;i++){const x=i/2047.5-1;cv[i]=Math.tanh(x*1.2)/Math.tanh(1.2)*.98}lim.curve=cv;lim.oversample='2x';comp.connect(lim);out=ac.createGain();out.gain.value=0;lim.connect(out);out.connect(ac.destination);recDest=ac.createMediaStreamDestination();lim.connect(recDest);armT=ac.currentTime+1.5;
  noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;nextT=ac.currentTime+.1}
function ml(ch,f,t,dur,vel){if(recOn)evlog.push({ch,n:ch===9?f:Math.round(69+12*Math.log2(f/440)),t:t-recT0,d:dur,v:vel})}
function env(g,t,a,d,pk){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(.0008,t+a+d)}
function osc(type,f,t,dur,pk,lp,send){const o=ac.createOscillator(),g=ac.createGain(),fl=ac.createBiquadFilter();o.type=type;o.frequency.setValueAtTime(f,t);fl.type='lowpass';fl.frequency.setValueAtTime(lp||2400,t);
  ml(type==='triangle'?3:type==='square'?4:(lp&&lp<=500)?2:1,f,t,dur,Math.min(127,Math.round(pk*500)));env(g,t,.005,dur,pk);o.connect(fl);fl.connect(g);g.connect(master);if(send){const s=ac.createGain();s.gain.value=send;g.connect(s);s.connect(dly)}o.start(t);o.stop(t+dur+.05)}
function kick(t){ml(9,36,t,.2,110);const o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(42,t+.13);env(g,t,.003,.28,.9);o.connect(g);g.connect(master);o.start(t);o.stop(t+.35)}
function noise(t,dur,hp,pk){if(hp>=7000&&dur<.2)ml(9,42,t,.05,70);const s=ac.createBufferSource(),g=ac.createGain(),f=ac.createBiquadFilter();s.buffer=noiseBuf;f.type='highpass';f.frequency.value=hp;env(g,t,.002,dur,pk);s.connect(f);f.connect(g);g.connect(master);s.start(t,Math.random()*.5);s.stop(t+dur+.05)}
function riser(t){const s=ac.createBufferSource(),g=ac.createGain(),f=ac.createBiquadFilter();s.buffer=noiseBuf;f.type='bandpass';f.Q.value=2;f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(7000,t+1.4);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.35,t+1.35);g.gain.linearRampToValueAtTime(0,t+1.5);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+1.6)}
function pad(t,ch){ch.forEach(x=>ml(5,x*2,t,STEP*16,60));ch.forEach((f,i)=>{[-6,6].forEach(dt=>{const o=ac.createOscillator(),g=ac.createGain(),fl=ac.createBiquadFilter();o.type='sawtooth';o.frequency.value=f*2;o.detune.value=dt;fl.type='lowpass';fl.frequency.value=900;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.5);g.gain.linearRampToValueAtTime(0,t+STEP*16);o.connect(fl);fl.connect(g);g.connect(master);o.start(t);o.stop(t+STEP*16+.1)})})}
function voice(ev,t){const n=PENT[hash(ev.target||ev.tool)%PENT.length];
  if(ev.tool==='commit'){riser(t);setTimeout(()=>{if(ac){const tt=ac.currentTime+.05;kick(tt);noise(tt,.6,3000,.4);CHORDS[0].forEach(f=>osc('sawtooth',f*4,tt,1.2,.12,3500,.3))}},1400)}
  else if(/Edit|Write|Notebook/.test(ev.tool)){osc('sawtooth',n,t,.22,.16,3200,.35);osc('sawtooth',n*1.5,t+STEP,.18,.1,3000,.35)}
  else if(/Read|Grep|Glob/.test(ev.tool)){osc('triangle',n*2,t,.35,.22,5000,.5)}
  else if(/Bash|PowerShell|Monitor/.test(ev.tool)){noise(t,.12,7000,.3);osc('sine',n/2,t,.18,.25,800,.2)}
  else{CHORDS[stepN>>4&3].forEach((f,i)=>osc('square',f*4,t+i*STEP*.5,.3,.07,2500,.4))}}
function sched(){if(!ac)return;if(ac.currentTime<armT){nextT=ac.currentTime+.1;return}const win=ac.currentTime+.15;
  while(nextT<win){const s=stepN%16,bar=stepN>>4&3,t=nextT;
    if(pendingHit&&s%4===0){hit(pendingHit,t);pendingHit=''}
    if((setS||sOn)&&s%2===0&&!queue.length&&Math.random()<(setS?.25+inten*.55:.1+inten*.3)){const T=['Edit','Read','Bash','Agent','Write','Grep'];queue.push({tool:T[Math.random()*T.length|0],target:'set'+(Math.random()*40|0)})}
    if(inten>.12){if(s%4===0&&inten>.25&&!(setS&&(setS.name==='INTRO'||setS.name==='BREAKDOWN')))kick(t);if(s%4===2)noise(t,.05,8500,.12*Math.min(1,inten+.3));if(inten>.5&&(s%8===0||s===6||s===14))osc('sawtooth',ROOTS[bar],t,.2,.3,420,0);if(s===0&&inten>.2)pad(t,CHORDS[bar])}
    if(s%2===0&&queue.length)voice(queue.shift(),t);
    nextT+=STEP;stepN++}}
setInterval(sched,25);
function feedEvent(ev){recent.push(Date.now());if(sOn||recOn||Q.has('sound'))queue.push(ev);if(queue.length>12)queue.shift()}
setInterval(()=>{const n=Date.now();recent=recent.filter(x=>n-x<20000);const target=setS?setS.target:Math.max(sOn?.22:0,Math.min(1,recent.length/7));inten+=(target-inten)*.15;if(ac&&out)out.gain.setTargetAtTime(sOn&&Number.isFinite(sVol)&&ac.currentTime>=armT?Math.min(sVol,.6):0,ac.currentTime,.4)},200);
async function sonState(){try{const s=await fetch('/sonify',{cache:'no-store'}).then(r=>r.json());if(!Q.has('sound')){sOn=!!s.on;sVol=Number.isFinite(+s.vol)?+s.vol:0.22}if((sOn||s.rec)&&!VISUAL){initAudio();if(ac.state==='suspended')ac.resume()}recCtl(s);setCtl(s.set)}catch{}}
let setS=null,lastIdx=-1,pendingHit='';
function setCtl(x){setS=x&&x.on?x:null;if(setS&&setS.idx!==lastIdx){lastIdx=setS.idx;pendingHit=setS.name}if(!setS)lastIdx=-1}
function hit(n,t){if(n==='DROP'){kick(t);noise(t,.9,2500,.5);CHORDS[stepN>>4&3].forEach(f=>osc('sawtooth',f*4,t,1.4,.14,3800,.4))}else if(n==='BUILD'){riser(t)}else if(n==='BREAKDOWN'){pad(t,CHORDS[0])}}
function recCtl(s){
  if(s.rec&&!recOn&&ac&&recDest){recOn=true;rid=s.rid;evlog=[];recT0=ac.currentTime;
    const mt=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm';
    recorder=new MediaRecorder(recDest.stream,{mimeType:mt,audioBitsPerSecond:256000});
    recorder.ondataavailable=e=>{if(e.data.size)fetch('/rec/chunk',{method:'POST',body:e.data}).catch(()=>{})};
    recorder.onstop=()=>setTimeout(()=>fetch('/rec/finish',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({events:evlog,bpm:BPM,secs:ac.currentTime-recT0})}).catch(()=>{}),400);
    recorder.start(1000)}
  if(!s.rec&&recOn){recOn=false;if(recorder&&recorder.state!=='inactive')recorder.stop()}}
sonState();setInterval(sonState,2000);
if(Q.has('sound')){document.addEventListener('click',()=>{initAudio();ac.resume()});initAudio()}
if(SIM_ON()){const T=['Edit','Read','Bash','Write','Grep','Agent'],F=['server.mjs','chat.html','scenes.mjs','obs.mjs','vibe-live.mjs','README.md','factory-page.mjs'];
  setInterval(()=>feedEvent({tool:T[Math.random()*T.length|0],target:F[Math.random()*F.length|0]}),520)}
function SIM_ON(){return location.search.includes('sim')}
setInterval(()=>$('clk').textContent=new Date().toLocaleTimeString('es-CO',{hour12:false}),1000);
</script></body></html>`;
