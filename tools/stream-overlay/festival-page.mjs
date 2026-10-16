// Visuales "FESTIVAL" para proyector y OBS. Solo visual y SIN audio (el sonido lo genera el overlay de la factory).
// Reacciona a /audio (medidores de OBS) y a /sonify (estructura del set). ?sim=1 para previsualizar sin musica.
export const festivalPage = `<!doctype html><html><head><meta charset="utf-8"><title>OAD x AI FACTORY</title><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#02030a;cursor:none}
#w{position:fixed;left:0;top:0;transform-origin:0 0;will-change:transform}
canvas#c{display:block;width:100%;height:100%}
.h{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border:3px solid #39ff88;border-radius:50%;background:rgba(57,255,136,.25);cursor:grab;z-index:9;display:none}
#tip{position:fixed;left:12px;bottom:10px;color:#39ff88;font:14px Consolas,monospace;z-index:9;display:none;background:rgba(0,0,0,.6);padding:6px 10px}
</style></head><body><div id="w"><canvas id="c" width="1920" height="1080"></canvas></div><div id="tip">MAPEO: arrastra las 4 esquinas · S guarda · R reinicia · E oculta/muestra guias</div><script>
// ---- MAPEO (corner-pin): deforma el lienzo a las 4 esquinas de la superficie proyectada
const MAPQ=new URLSearchParams(location.search),EDIT=MAPQ.has('edit'),NOMAP=MAPQ.has('nomap');
const FULL=[[0,0],[1,0],[1,1],[0,1]];let pts=FULL.map(a=>a.slice());
function homography(dst,w,h){const s=[[0,0],[w,0],[w,h],[0,h]],A=[],b=[];for(let i=0;i<4;i++){const[x,y]=s[i],[X,Y]=dst[i];A.push([x,y,1,0,0,0,-x*X,-y*X]);b.push(X);A.push([0,0,0,x,y,1,-x*Y,-y*Y]);b.push(Y)}
  for(let i=0;i<8;i++){let m=i;for(let r=i+1;r<8;r++)if(Math.abs(A[r][i])>Math.abs(A[m][i]))m=r;[A[i],A[m]]=[A[m],A[i]];[b[i],b[m]]=[b[m],b[i]];
    for(let r=i+1;r<8;r++){const f=A[r][i]/A[i][i];for(let k=i;k<8;k++)A[r][k]-=f*A[i][k];b[r]-=f*b[i]}}
  const x=Array(8).fill(0);for(let i=7;i>=0;i--){let s2=b[i];for(let k=i+1;k<8;k++)s2-=A[i][k]*x[k];x[i]=s2/A[i][i]}
  return 'matrix3d('+[x[0],x[3],0,x[6],x[1],x[4],0,x[7],0,0,1,0,x[2],x[5],0,1].join(',')+')'}
function applyMap(){const w=document.getElementById('w'),vw=innerWidth,vh=innerHeight;w.style.width='1920px';w.style.height='1080px';
  w.style.transform=NOMAP?'scale('+Math.min(vw/1920,vh/1080)+')':homography(pts.map(q=>[q[0]*vw,q[1]*vh]),1920,1080)}
const HND=[];
function mkHandles(){if(!EDIT)return;document.getElementById('tip').style.display='block';document.body.style.cursor='default';
  pts.forEach((q,i)=>{const h=document.createElement('div');h.className='h';h.style.display='block';document.body.appendChild(h);HND.push(h);
    h.onpointerdown=e=>{h.setPointerCapture(e.pointerId);h.onpointermove=m=>{pts[i]=[m.clientX/innerWidth,m.clientY/innerHeight];place();applyMap()};h.onpointerup=()=>{h.onpointermove=null}}});place()}
function place(){HND.forEach((h,i)=>{h.style.left=pts[i][0]*innerWidth+'px';h.style.top=pts[i][1]*innerHeight+'px'})}
async function loadMap(){try{const m=await fetch('/mapping',{cache:'no-store'}).then(r=>r.json());if(m.pts&&m.pts.length===4)pts=m.pts}catch{}applyMap();place()}
addEventListener('resize',()=>{applyMap();place()});
addEventListener('keydown',e=>{if(!EDIT)return;if(e.key==='s'||e.key==='S'){fetch('/mapping',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pts})}).then(()=>{document.getElementById('tip').textContent='MAPEO guardado ✔'})}
  if(e.key==='r'||e.key==='R'){pts=FULL.map(a=>a.slice());place();applyMap()}if(e.key==='e'||e.key==='E'){HND.forEach(h=>h.style.display=h.style.display==='none'?'block':'none')}});
loadMap();setInterval(()=>{if(!EDIT)loadMap()},4000);mkHandles();
const c=document.getElementById('c'),g=c.getContext('2d'),W=1920,H=1080,CX=W/2,CY=H*0.46;
const Q=new URLSearchParams(location.search),SIM=Q.has('sim');
// Paletas controlables desde /control (o /look/palette/<nombre>): tonos [A,B] por seccion, saturacion y desplazamiento de tono.
const PALS={
  neon:{INTRO:[190,260],BUILD:[290,330],DROP:[340,30],BREAKDOWN:[220,280],OUTRO:[160,200],IDLE:[170,270]},
  fuego:{INTRO:[20,35],BUILD:[10,30],DROP:[0,22],BREAKDOWN:[28,45],OUTRO:[15,30],IDLE:[18,40]},
  hielo:{INTRO:[195,205],BUILD:[205,225],DROP:[190,215],BREAKDOWN:[215,230],OUTRO:[195,210],IDLE:[200,215]},
  matrix:{INTRO:[120,135],BUILD:[125,145],DROP:[110,140],BREAKDOWN:[130,145],OUTRO:[120,130],IDLE:[125,140]},
  ultravioleta:{INTRO:[265,285],BUILD:[275,310],DROP:[285,330],BREAKDOWN:[255,275],OUTRO:[265,280],IDLE:[270,300]},
  oro:{INTRO:[38,48],BUILD:[40,52],DROP:[35,55],BREAKDOWN:[42,50],OUTRO:[38,46],IDLE:[40,50]},
  arcoiris:{INTRO:[0,120],BUILD:[120,240],DROP:[240,360],BREAKDOWN:[60,180],OUTRO:[180,300],IDLE:[0,360]},
  mono:{INTRO:[210,210],BUILD:[210,210],DROP:[210,210],BREAKDOWN:[210,210],OUTRO:[210,210],IDLE:[210,210]}
};
let look={palette:'neon',hue:0};let SAT=100;
let lvl=0,sm=0,beats=0,lastBeat=0,flash=0,bpm=0,set=null,name='IDLE',hueA=190,hueB=260,ph=0,secName='',secT=0,events=[],sparks=[],bars=Array(64).fill(0),simT0=Date.now();
const SIMSEQ=[['INTRO',.3],['BUILD',.65],['DROP',1],['BREAKDOWN',.35],['BUILD',.7],['DROP',1],['OUTRO',.25]];
async function poll(){
  if(SIM){const t=(Date.now()-simT0)/1000,i=Math.floor(t/9)%SIMSEQ.length,[n,tg]=SIMSEQ[i];lvl=Math.max(0,tg*(.5+.5*Math.abs(Math.sin(t*Math.PI*124/60/1)))+Math.random()*.08);
    const b=Math.floor(t/(60/124));if(b!==beats){beats=b;flash=1}name=n;set={on:true,name:n,target:tg,elapsed:t,total:63,remaining:63-t%63,next:SIMSEQ[(i+1)%SIMSEQ.length][0],secLeft:9-t%9};bpm=124;return}
  try{const a=await fetch('/audio',{cache:'no-store'}).then(r=>r.json());lvl=Math.max(a.factory||0,a.strudel||0,a.ddj||0);if(a.beats!==beats){beats=a.beats;flash=1}bpm=a.bpm||bpm}catch{}
}
async function pollSet(){try{const s=await fetch('/sonify',{cache:'no-store'}).then(r=>r.json());set=s.set&&s.set.on?s.set:null;name=set?set.name:'IDLE';if(s.look)look=s.look}catch{}
  try{const d=await fetch('/feed',{cache:'no-store'}).then(r=>r.json());events=d.events.slice(-5)}catch{}}
setInterval(poll,70);setInterval(pollSet,1000);poll();pollSet();
function col(h,a,l){return 'hsla('+(((h%360)+360)%360)+','+SAT+'%,'+(l||60)+'%,'+a+')'}
function frame(ts){
  ph+=0.012+sm*0.05;sm+=(lvl-sm)*.25;flash*=.9;
  const PP=PALS[look.palette]||PALS.neon,pal=PP[name]||PP.IDLE;SAT=look.palette==='mono'?0:100;hueA+=(pal[0]+look.hue-hueA)*.03;hueB+=(pal[1]+look.hue-hueB)*.03;
  const hue=hueA+(Math.sin(ph*.7)+1)*.5*(hueB-hueA);
  if(set&&set.name!==secName){secName=set.name;secT=1}secT*=.985;
  // fondo
  const bg=g.createRadialGradient(CX,CY,50,CX,CY,W*.75);bg.addColorStop(0,col(hue,.30+sm*.3,12));bg.addColorStop(1,'#02030a');g.globalCompositeOperation='source-over';g.fillStyle=bg;g.fillRect(0,0,W,H);
  g.globalCompositeOperation='lighter';
  // rejilla de suelo (synthwave)
  g.strokeStyle=col(hue+40,.35+sm*.4);g.lineWidth=2;const hy=H*.62;
  for(let i=-16;i<=16;i++){g.beginPath();g.moveTo(CX+i*40,hy);g.lineTo(CX+i*260,H);g.stroke()}
  for(let i=0;i<14;i++){const z=((i+ph*3)%14)/14,y=hy+(H-hy)*z*z;g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.globalAlpha=.25+z*.5;g.stroke();g.globalAlpha=1}
  // tunel de anillos
  for(let i=0;i<14;i++){const z=((i/14+ph*(.35+sm))%1),r=40+z*z*W*.65,n=8,rot=ph*(i%2?1:-1)*.8+i;
    g.beginPath();for(let k=0;k<=n;k++){const a=rot+k/n*Math.PI*2;g.lineTo(CX+Math.cos(a)*r*1.0,CY+Math.sin(a)*r*.62)}
    g.strokeStyle=col(hue+i*14,(1-z)*.55+flash*.3);g.lineWidth=2+z*5+flash*4;g.stroke()}
  // lasers
  const nl=4+Math.round((set?set.target:.4)*8+sm*6);
  for(let i=0;i<nl;i++){const base=(i/nl-.5)*Math.PI*1.1,ang=base+Math.sin(ph*1.7+i)*.45*(1+sm),len=H*1.4,x0=CX+(i%2?-1:1)*(120+i*14);
    g.beginPath();g.moveTo(x0,-20);g.lineTo(x0+Math.sin(ang)*len,Math.cos(ang)*len);g.strokeStyle=col(hue+i*40,.12+sm*.5+flash*.4,65);g.lineWidth=3+sm*7;g.shadowColor=col(hue+i*40,1);g.shadowBlur=24;g.stroke();g.shadowBlur=0}
  // chispas en cada pulso
  if(flash>.95)for(let i=0;i<26;i++)sparks.push({x:CX+(Math.random()-.5)*300,y:CY+(Math.random()-.5)*160,vx:(Math.random()-.5)*16,vy:-Math.random()*14,l:1,h:hue+Math.random()*90});
  sparks=sparks.filter(s=>s.l>0);sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=.35;s.l-=.02;g.fillStyle=col(s.h,s.l);g.fillRect(s.x,s.y,4,4)});
  // ecualizador inferior
  const bw=W/bars.length;bars.forEach((b,i)=>{const tgt=Math.min(1,sm*(.5+.8*Math.abs(Math.sin(ph*5+i*.5)))*1.5);bars[i]=Math.max(tgt,b*.88);const h=bars[i]*190+4;g.fillStyle=col(hue+i*3,.85);g.fillRect(i*bw+3,H-h,bw-6,h)});
  g.globalCompositeOperation='source-over';
  // flash blanco en el drop
  if(flash>.5&&name==='DROP'){g.fillStyle='rgba(255,255,255,'+(flash-.5)*.25+')';g.fillRect(0,0,W,H)}
  // textos
  g.textAlign='center';g.shadowColor=col(hue,1);g.shadowBlur=30+flash*30;g.fillStyle='#fff';
  g.font='bold '+(92+flash*8)+'px Impact,Arial Black,sans-serif';g.fillText('OPSAFTERDARK',CX,H*.16);
  g.font='600 34px Consolas,monospace';g.fillStyle=col(hue+60,1,70);g.fillText('×  AI FACTORY  ·  LIVE SET  ×',CX,H*.16+52);g.shadowBlur=0;
  if(secT>.05){g.save();g.globalAlpha=Math.min(1,secT*1.4);g.font='bold 220px Impact,sans-serif';g.fillStyle='#fff';g.shadowColor=col(hue,1);g.shadowBlur=60;g.fillText(secName,CX,CY+80);g.restore()}
  // barra de progreso + seccion
  if(set){const p=Math.min(1,set.elapsed/set.total);g.fillStyle='rgba(255,255,255,.15)';g.fillRect(120,H-250,W-240,8);g.fillStyle=col(hue,1);g.fillRect(120,H-250,(W-240)*p,8);
    g.font='bold 30px Consolas,monospace';g.textAlign='left';g.fillStyle='#fff';g.fillText(set.name+'  →  '+set.next+'  en '+Math.max(0,Math.round(set.secLeft))+'s',120,H-268);
    g.textAlign='right';const m=Math.floor(set.remaining/60),s=String(Math.floor(set.remaining%60)).padStart(2,'0');g.fillText((bpm||124)+' BPM  ·  quedan '+m+':'+s,W-120,H-268)}
  // ticker de agentes
  g.textAlign='left';g.font='24px Consolas,monospace';events.forEach((e,i)=>{g.fillStyle=col(hue+120,.35+i*.13,70);g.fillText('> '+e.label.toLowerCase()+' '+(e.target||''),40,H*.30+i*34)});
  requestAnimationFrame(frame)}
requestAnimationFrame(frame);
</script></body></html>`;
