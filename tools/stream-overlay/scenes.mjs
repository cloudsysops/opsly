const base = `
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#050a13;color:#f6fbff;font-family:Bahnschrift,Arial,sans-serif}
.bg{position:absolute;inset:0;background:radial-gradient(ellipse at 30% 20%,rgba(40,170,255,.22),transparent 55%),radial-gradient(ellipse at 80% 90%,rgba(112,255,172,.10),transparent 50%),#050a13}
.grid{position:absolute;inset:-100px;background-image:linear-gradient(rgba(71,215,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(71,215,255,.08) 1px,transparent 1px);background-size:80px 80px;animation:pan 12s linear infinite}
@keyframes pan{to{transform:translate(80px,80px)}}
.scan{position:absolute;inset:0;background:repeating-linear-gradient(transparent 0 3px,rgba(0,0,0,.18) 3px 4px);pointer-events:none}
.frame{position:absolute;inset:60px;border:1px solid rgba(71,215,255,.35);border-left:8px solid #47d7ff;box-shadow:0 0 60px rgba(27,174,255,.18) inset}
.center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.brand{font-family:Impact,Bahnschrift,Arial,sans-serif;font-size:210px;letter-spacing:12px;line-height:1;text-shadow:6px 6px 0 rgba(0,0,0,.7)}.brand b{color:#64e1ff;font-weight:400}
.sub{margin-top:34px;font-size:56px;letter-spacing:14px;color:#a8c4d6}
.line{width:900px;height:2px;background:linear-gradient(90deg,transparent,#47d7ff,transparent);margin:46px 0}
.live{color:#70ffac;font-size:40px;letter-spacing:8px}.pulse{animation:pulse 1.6s ease-in-out infinite}@keyframes pulse{50%{opacity:.35}}
`;
const page = (extraCss, body, script = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${base}${extraCss}</style></head><body><div class="bg"></div><div class="grid"></div><div class="scan"></div><div class="frame"></div>${body}<script>${script}</script></body></html>`;

export const starting = page(
  `.brand{font-size:190px}.count{font-family:Impact,Bahnschrift,Arial,sans-serif;font-size:340px;letter-spacing:14px;line-height:1;color:#f6fbff;text-shadow:0 0 60px rgba(71,215,255,.7),8px 8px 0 rgba(0,0,0,.6);font-variant-numeric:tabular-nums}.count.soon{color:#ff4fd8;text-shadow:0 0 70px rgba(255,79,216,.8),8px 8px 0 rgba(0,0,0,.6);animation:pulse 1s ease-in-out infinite}.bar{width:1500px;height:14px;background:rgba(255,255,255,.08);border:1px solid rgba(71,215,255,.4);overflow:hidden;margin-top:10px}.bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#47d7ff,#ff4fd8);transition:width 1s linear}.small{margin-top:30px;color:#7fa5b8;font-size:38px;letter-spacing:8px}.tag{position:absolute;right:110px;top:100px;color:#ff4fd8;font-size:36px;letter-spacing:8px}`,
  `<div class="center"><div class="brand">OPS <b>AFTER</b> DARK</div><div class="sub">EMPEZAMOS EN</div><div class="line"></div><div class="count" id="n">--:--</div><div class="bar"><i id="p"></i></div><div class="small" id="s">HORA DE NUEVA YORK</div></div><div class="tag" id="tag"></div>`,
  `let first=null;const pad=v=>String(v).padStart(2,'0');
async function tick(){try{const d=await fetch('/schedule',{cache:'no-store'}).then(r=>r.json());const off=Date.now()-d.now;const rem=Math.max(0,Math.ceil((d.target-(Date.now()-off))/1000));first=first??Math.max(rem,1);
const h=Math.floor(rem/3600),m=Math.floor(rem%3600/60),sec=rem%60;n.textContent=(h?pad(h)+':':'')+pad(m)+':'+pad(sec);n.className='count'+(rem<=10&&rem>0?' soon':'');
p.style.width=(100-rem/first*100)+'%';tag.textContent=d.test?'● MODO PRUEBA':'';
s.textContent=rem?'HORA DE NUEVA YORK · '+d.label.toUpperCase():'¡VAMOS!';}catch{n.textContent='--:--'}}
tick();setInterval(tick,1000)`,
);

export const brb = page(
  `.dots span{display:inline-block;width:22px;height:22px;margin:0 12px;background:#47d7ff;animation:pulse 1.2s ease-in-out infinite}.dots span:nth-child(2){animation-delay:.2s}.dots span:nth-child(3){animation-delay:.4s}.clock{margin-top:50px;font-size:64px;letter-spacing:6px;color:#7ee4ff}.hint{margin-top:16px;color:#7fa5b8;font-size:32px;letter-spacing:6px}.brand{font-size:190px}`,
  `<div class="center"><div class="live pulse">● EN PAUSA</div><div class="line"></div><div class="brand">VUELVO EN <b>UN MOMENTO</b></div><div class="line"></div><div class="dots"><span></span><span></span><span></span></div><div class="clock" id="c"></div><div class="hint">OPS AFTER DARK</div></div>`,
  `function u(){c.textContent=new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}u();setInterval(u,1000)`,
);

export const ending = page(
  `.brand{font-size:230px}.socials{display:flex;gap:70px;margin-top:10px}.socials div{padding:18px 40px;border:1px solid rgba(71,215,255,.5);background:rgba(255,255,255,.05);font-size:44px;letter-spacing:4px}.socials span{color:#64e1ff}.handle{font-size:70px;letter-spacing:8px;color:#70ffac}`,
  `<div class="center"><div class="brand">GRACIAS <b>POR VER</b></div><div class="sub">NOS VEMOS PRONTO</div><div class="line"></div><div class="handle">@opsafterdarktv</div><div class="line"></div><div class="socials"><div><span>TWITCH</span></div><div><span>YOUTUBE</span></div><div><span>TIKTOK</span></div></div></div>`,
);

export const hud = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:transparent;font-family:Bahnschrift,Arial,sans-serif;overflow:hidden}
.hud{display:flex;align-items:center;gap:18px;height:90px;padding:0 24px;border-left:5px solid #47d7ff;border-top:1px solid rgba(102,224,255,.45);background:linear-gradient(90deg,rgba(6,14,24,.78),rgba(6,14,24,.12));color:#f6fbff;text-shadow:1px 1px 0 rgba(0,0,0,.8)}
.clock{font-size:46px;font-weight:800;letter-spacing:1px;white-space:nowrap}.sep{width:1px;height:46px;background:rgba(126,228,255,.4)}
.name{font-family:Impact,Bahnschrift,Arial,sans-serif;font-size:34px;letter-spacing:4px}.name b{color:#62e3ff;font-weight:400}.dot{color:#70ffac;font-size:22px;animation:p 1.6s infinite}@keyframes p{50%{opacity:.3}}
</style></head><body><div class="hud"><span class="clock" id="c"></span><span class="sep"></span><span class="name">OPS<b>AFTERDARK</b></span><span class="dot">●</span></div><script>function u(){c.textContent=new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',hour12:false})}u();setInterval(u,1000)</script></body></html>`;

export const summary = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;font-family:Bahnschrift,Arial,sans-serif;color:#f6fbff}
.card{height:100%;padding:34px 40px;background:linear-gradient(135deg,rgba(6,10,18,.88),rgba(11,22,37,.80));border:1px solid rgba(75,196,255,.55);border-left:8px solid #47d7ff;box-shadow:0 0 30px rgba(27,174,255,.25)}
.head{display:flex;justify-content:space-between;align-items:baseline}.title{font-family:Impact,Bahnschrift,Arial,sans-serif;font-size:56px;letter-spacing:3px;text-shadow:3px 3px 0 rgba(0,0,0,.7)}.title b{color:#64e1ff;font-weight:400}.live{color:#70ffac;font-size:22px;letter-spacing:3px;animation:p 1.6s infinite}@keyframes p{50%{opacity:.35}}
.line{height:1px;background:rgba(126,228,255,.35);margin:16px 0}
.goal small{display:block;color:#7fa5b8;font-size:18px;letter-spacing:4px;margin-bottom:4px}.goal span{font-size:36px;font-weight:800}
#items{margin-top:22px}.it{display:flex;gap:18px;align-items:baseline;padding:12px 16px;margin-bottom:10px;background:rgba(255,255,255,.055);border-left:4px solid rgba(126,228,255,.4);color:#dbe9f1;font-size:27px;animation:in .5s}@keyframes in{from{opacity:0;transform:translateX(20px)}}
.it b{font-size:18px;letter-spacing:3px;min-width:96px}.it b.claude{color:#ffb267}.it b.codex{color:#70ffac}
</style></head><body><div class="card"><div class="head"><span class="title">RESUMEN <b>DE SESIÓN</b></span><span class="live">● CLAUDE + CODEX</span></div><div class="line"></div><div class="goal"><small>OBJETIVO</small><span id="goal">—</span></div><div id="items"></div></div><script>
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));let last='';
async function act(){try{const d=await fetch('/activity',{cache:'no-store'}).then(r=>r.json());const k=JSON.stringify(d);if(k===last)return;last=k;goal.textContent=d.goal||'—';items.innerHTML=d.items.slice(-4).map(i=>'<div class="it"><b class="'+i.tool+'">'+i.tool.toUpperCase()+'</b><span>'+esc(i.text)+'</span></div>').join('')}catch{}}act();setInterval(act,3000)
</script></body></html>`;

export const stream = `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--c:#47d7ff;--g:#70ffac;--m:#ff4fd8}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;font-family:Bahnschrift,Arial,sans-serif;color:#f6fbff}
.corner{position:absolute;width:190px;height:190px;border:0 solid;filter:drop-shadow(0 0 14px var(--c));animation:hue 8s linear infinite}
.tl{left:28px;top:28px;border-left-width:6px;border-top-width:6px;border-color:var(--c)}.tr{right:28px;top:28px;border-right-width:6px;border-top-width:6px;border-color:var(--g)}
.bl{left:28px;bottom:28px;border-left-width:6px;border-bottom-width:6px;border-color:var(--m)}.br{right:28px;bottom:28px;border-right-width:6px;border-bottom-width:6px;border-color:var(--c)}
@keyframes hue{50%{filter:drop-shadow(0 0 30px var(--m)) hue-rotate(60deg)}}
.edge{position:absolute;left:0;right:0;height:5px;background:linear-gradient(90deg,transparent,var(--c),var(--g),var(--m),transparent);background-size:200% 100%;animation:flow 4s linear infinite;opacity:.9}.edge.t{top:0}.edge.b{bottom:0}@keyframes flow{to{background-position:200% 0}}
.top{position:absolute;left:70px;top:60px;display:flex;align-items:center;gap:22px;height:96px;padding:0 34px;background:linear-gradient(90deg,rgba(6,14,24,.86),rgba(6,14,24,.25));border-left:6px solid var(--c);border-top:1px solid rgba(102,224,255,.5);backdrop-filter:blur(6px)}
.live{display:flex;align-items:center;gap:12px;padding:8px 18px;background:#ff2a4d;font-weight:800;letter-spacing:4px;font-size:30px;box-shadow:0 0 30px rgba(255,42,77,.7);animation:glow 1.4s ease-in-out infinite}.live i{width:16px;height:16px;border-radius:50%;background:#fff}@keyframes glow{50%{box-shadow:0 0 6px rgba(255,42,77,.3)}}
.name{font-family:Impact,Bahnschrift,Arial,sans-serif;font-size:58px;letter-spacing:5px;text-shadow:3px 3px 0 rgba(0,0,0,.7)}.name b{color:var(--c);font-weight:400}.clock{font-size:44px;font-weight:800;color:#a8e9ff}.sep{width:1px;height:50px;background:rgba(126,228,255,.4)}
.stats{position:absolute;left:50%;top:60px;transform:translateX(-50%);display:flex;gap:16px}.stat{min-width:190px;padding:12px 22px;background:rgba(6,14,24,.8);border:1px solid rgba(102,224,255,.4);text-align:center}.stat small{display:block;font-size:17px;letter-spacing:3px;color:#8fb3c6}.stat span{font-size:44px;font-weight:800}.stat em{font-style:normal;font-size:22px;color:var(--c)}
.social{position:absolute;right:70px;top:60px;height:96px;min-width:640px;display:flex;align-items:center;justify-content:center;padding:0 34px;background:linear-gradient(270deg,rgba(6,14,24,.86),rgba(6,14,24,.25));border-right:6px solid var(--g);font-size:40px;letter-spacing:6px;overflow:hidden}.social span{animation:swap .6s}@keyframes swap{from{opacity:0;transform:translateY(24px)}}.social b{color:var(--g)}
.dj{position:absolute;left:1800px;top:840px;width:680px;height:470px;border:2px solid var(--c);box-shadow:0 0 40px rgba(71,215,255,.55),inset 0 0 40px rgba(71,215,255,.15);animation:djp 3s ease-in-out infinite}@keyframes djp{50%{border-color:var(--m);box-shadow:0 0 50px rgba(255,79,216,.6),inset 0 0 40px rgba(255,79,216,.15)}}
.dj .hole{position:absolute;left:20px;top:20px;width:640px;height:360px;outline:2px solid rgba(255,255,255,.15)}.dj .lab{position:absolute;left:0;right:0;bottom:0;height:70px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;background:rgba(6,14,24,.92);font-size:32px;letter-spacing:5px}.dj .lab b{color:var(--m)}
.eq{display:flex;align-items:flex-end;gap:5px;height:40px}.eq i{width:8px;background:linear-gradient(var(--g),var(--c));animation:eq 0.9s ease-in-out infinite}
@keyframes eq{0%,100%{height:8px}50%{height:40px}}
.low{position:absolute;left:70px;bottom:70px;width:1480px;padding:26px 34px;background:linear-gradient(90deg,rgba(6,14,24,.9),rgba(6,14,24,.3));border-left:6px solid var(--g);border-top:1px solid rgba(112,255,172,.4);backdrop-filter:blur(6px)}
.low small{display:block;color:#8fb3c6;font-size:20px;letter-spacing:5px;margin-bottom:6px}.low .goal{font-size:46px;font-weight:800}.low .rows{margin-top:14px;display:flex;flex-direction:column;gap:8px}.row{display:flex;gap:18px;font-size:28px;color:#dbe9f1;animation:swap .6s}.row b{min-width:110px;font-size:20px;letter-spacing:3px;padding-top:6px}.claude{color:#ffb267}.codex{color:var(--g)}.np{position:absolute;right:70px;top:180px;width:640px;padding:20px 28px;background:linear-gradient(270deg,rgba(6,14,24,.9),rgba(20,8,32,.55));border-right:6px solid var(--m);border-top:1px solid rgba(255,79,216,.45);display:none;align-items:center;gap:22px;box-shadow:0 0 30px rgba(255,79,216,.25)}.np.on{display:flex;animation:swap .7s}.np .eq{height:56px;flex:none}.np .eq i{width:9px;background:linear-gradient(var(--m),var(--c))}.np small{display:block;color:#8fb3c6;font-size:18px;letter-spacing:5px}.np .tt{font-family:Impact,Bahnschrift,Arial,sans-serif;font-size:50px;letter-spacing:3px;line-height:1.1;text-shadow:0 0 22px var(--m),3px 3px 0 rgba(0,0,0,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.np .dd{font-size:24px;letter-spacing:3px;color:#cfe6f2}.np .tx{min-width:0}
</style></head><body>
<div class="edge t"></div><div class="edge b"></div><div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>
<div class="top"><div class="live"><i></i>LIVE</div><span class="name">OPS<b>AFTERDARK</b></span><span class="sep"></span><span class="clock" id="clock"></span></div>
<div class="stats"><div class="stat"><small>CPU</small><span id="cpu">--</span><em>%</em></div><div class="stat"><small>GPU</small><span id="gpu">--</span><em>%</em></div><div class="stat"><small>RAM</small><span id="ram">--</span><em>%</em></div></div>
<div class="social"><span id="soc"></span></div>
<div class="dj"><div class="hole"></div><div class="lab"><span>DJ <b>LIVE MIX</b></span><div class="eq" id="eq"></div></div></div>
<div class="np" id="np"><div class="eq" id="eq2"></div><div class="tx"><small>SONANDO AHORA</small><div class="tt" id="npn"></div><div class="dd" id="npd"></div></div></div>
<div class="low"><small>AHORA EN PANTALLA</small><div class="goal" id="goal">—</div><div class="rows" id="rows"></div></div>
<script>
eq.innerHTML=Array.from({length:12},(_,i)=>'<i style="animation-delay:'+(i*0.11)+'s;animation-duration:'+(0.6+(i%5)*0.15)+'s"></i>').join('');
const tick=()=>{clock.textContent=new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})};tick();setInterval(tick,1000);
const S=['<b>TWITCH</b> · opsafterdarktv','<b>YOUTUBE</b> · @opsafterdarktv','<b>TIKTOK</b> · síguenos','<b>SIGUE</b> Y NO TE PIERDAS EL PRÓXIMO'];let k=0;const sw=()=>{soc.innerHTML=S[k++%S.length]};sw();setInterval(sw,4000);
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function m(){try{const d=await fetch('/metrics',{cache:'no-store'}).then(r=>r.json());cpu.textContent=d.cpu;gpu.textContent=d.gpu??'--';ram.textContent=d.ram}catch{}}m();setInterval(m,1500);
let last='';async function a(){try{const d=await fetch('/activity',{cache:'no-store'}).then(r=>r.json());const key=JSON.stringify(d);if(key===last)return;last=key;goal.textContent=d.goal||'—';rows.innerHTML=d.items.slice(-3).map(i=>'<div class="row"><b class="'+i.tool+'">'+i.tool.toUpperCase()+'</b><span>'+esc(i.text)+'</span></div>').join('')}catch{}}a();setInterval(a,3000);
eq2.innerHTML=Array.from({length:8},(_,i)=>'<i style="animation-delay:'+(i*0.13)+'s;animation-duration:'+(0.55+(i%4)*0.17)+'s"></i>').join('');
let npLast=null;async function n(){try{const d=await fetch('/nowplaying',{cache:'no-store'}).then(r=>r.json());const k=d.name+'|'+d.detail;if(k===npLast)return;npLast=k;np.classList.remove('on');if(d.name){void np.offsetWidth;npn.textContent=d.name;npd.textContent=d.detail;np.classList.add('on')}}catch{}}n();setInterval(n,2000);
</script></body></html>`;

export const alerts = `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--c:#47d7ff;--m:#ff4fd8;--g:#70ffac}
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;font-family:Bahnschrift,Arial,sans-serif;color:#f6fbff}
.stage{position:absolute;left:0;right:0;top:360px;display:flex;justify-content:center}
.alert{position:relative;min-width:1000px;padding:34px 70px;text-align:center;background:linear-gradient(135deg,rgba(6,10,18,.94),rgba(20,8,32,.9));border:2px solid var(--a);box-shadow:0 0 60px var(--a),inset 0 0 50px rgba(255,255,255,.05);animation:in .7s cubic-bezier(.2,1.4,.4,1) both,glitch 5s steps(1) .7s}
.alert.out{animation:out .6s ease-in both}
.alert::before,.alert::after{content:"";position:absolute;width:60px;height:60px;border:0 solid var(--b)}.alert::before{left:-10px;top:-10px;border-left-width:8px;border-top-width:8px}.alert::after{right:-10px;bottom:-10px;border-right-width:8px;border-bottom-width:8px}
.kind{font-size:34px;letter-spacing:12px;color:var(--a);text-shadow:0 0 18px var(--a)}
.who{font-family:Impact,Bahnschrift,Arial,sans-serif;font-size:130px;letter-spacing:4px;line-height:1.1;margin:8px 0;text-shadow:5px 5px 0 rgba(0,0,0,.7),0 0 30px var(--b);max-width:1500px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sub{font-size:44px;letter-spacing:6px;color:#cfe6f2}
.follow{--a:#47d7ff;--b:#ff4fd8}.sub_{--a:#ff4fd8;--b:#47d7ff}.raid{--a:#70ffac;--b:#ff4fd8}
@keyframes in{from{opacity:0;transform:translateY(-80px) scale(.8)}}
@keyframes out{to{opacity:0;transform:translateY(60px) scale(.9)}}
@keyframes glitch{0%,90%{transform:none}92%{transform:translateX(-10px) skewX(6deg)}94%{transform:translateX(12px)}96%{transform:none}}
</style></head><body><div class="stage" id="stage"></div><script>
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const T={follow:['NUEVO FOLLOW','follow',e=>'BIENVENIDO A LA FAMILIA'],sub:['NUEVA SUSCRIPCIÓN','sub_',e=>e.months>1?e.months+' MESES · GRACIAS':'GRACIAS POR EL APOYO'],raid:['RAID ENTRANTE','raid',e=>(e.viewers||0)+' ESPECTADORES SE UNEN']};
let busy=false;
async function poll(){if(busy)return;try{const e=await fetch('/alerts/next',{cache:'no-store'}).then(r=>r.json());if(!e||!T[e.type])return;busy=true;const [k,cls,line]=T[e.type];
stage.innerHTML='<div class="alert '+cls+'"><div class="kind">'+k+(e.test?' · PRUEBA':'')+'</div><div class="who">'+esc(e.name)+'</div><div class="sub">'+esc(line(e))+'</div></div>';
setTimeout(()=>{stage.firstChild.classList.add('out')},6500);setTimeout(()=>{stage.innerHTML='';busy=false},7200)}catch{}}
setInterval(poll,800);
</script></body></html>`;
