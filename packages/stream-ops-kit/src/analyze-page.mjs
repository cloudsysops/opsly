// Página local de análisis: decodifica las pistas de .analysis/ con el navegador y mide por fase.
// Fases (segundos desde el inicio de la grabación, con margen en las transiciones):
//   A sin música 6-40 · B Strudel 46-108 · C sin música 116-140
export const analyzePage = `<!doctype html><html><head><meta charset="utf-8"><title>análisis</title></head><body style="background:#000;color:#0f0;font:16px monospace"><pre id="out">analizando…</pre><script>
const W={A:[6,40],B:[46,108],C:[116,140]};const db=v=>+(20*Math.log10(Math.max(v,1e-9))).toFixed(1);
const rms=(a,s,e)=>{let x=0,n=0;for(let i=Math.floor(s);i<Math.min(Math.floor(e),a.length);i++){x+=a[i]*a[i];n++}return Math.sqrt(x/Math.max(n,1))};
async function lowpass(buf,hz){const o=new OfflineAudioContext(1,buf.length,buf.sampleRate);const s=o.createBufferSource();s.buffer=buf;const f=o.createBiquadFilter();f.type='lowpass';f.frequency.value=hz;f.Q.value=.7;s.connect(f);f.connect(o.destination);s.start();return (await o.startRendering()).getChannelData(0)}
function mono(buf){const n=buf.length,o=new Float32Array(n);for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);for(let i=0;i<n;i++)o[i]+=d[i]/buf.numberOfChannels}return o}
function echo(a,sr,s){const f=8,ds=[];for(let i=Math.floor(s*sr);i<Math.floor((s+4)*sr)&&i<a.length;i+=f)ds.push(a[i]);const n=ds.length-2000;if(n<1000)return null;let e0=0;for(let i=0;i<n;i++)e0+=ds[i]*ds[i];if(e0<1e-9)return 0;let best=0;const lo=Math.floor(0.01*sr/f),hi=Math.floor(0.3*sr/f);for(let l=lo;l<hi;l++){let x=0;for(let i=0;i<n;i++)x+=ds[i]*ds[i+l];best=Math.max(best,x/e0)}return +best.toFixed(3)}
(async()=>{try{const meta=await fetch('/analysis/meta.json').then(r=>r.json());const ctx=new AudioContext({sampleRate:48000});const T={};
for(const m of meta){try{const ab=await fetch('/analysis/track'+m.track+'.aac').then(r=>r.arrayBuffer());const b=await ctx.decodeAudioData(ab);T[m.track]={x:mono(b),lp:await lowpass(b,150),sec:b.duration}}catch{console.warn('pista '+m.track+' no decodificable (¿vacía?)')}}
const sr=48000,res={durationSec:Object.fromEntries(Object.entries(T).map(([k,v])=>[k,+v.sec.toFixed(1)])),phases:{}};
for(const [p,[s,e]] of Object.entries(W)){const o={};for(const k of Object.keys(T)){o['t'+k+'_rms']=db(rms(T[k].x,s*sr,e*sr));o['t'+k+'_bajos150Hz']=db(rms(T[k].lp,s*sr,e*sr))}
if(T[1]&&T[2]){const n=Math.min(T[1].x.length,T[2].x.length),d=new Float32Array(n);for(let i=0;i<n;i++)d[i]=T[1].x[i]-T[2].x[i];o['dif_t1_menos_t2_rms']=db(rms(d,s*sr,e*sr))}
o['t2_eco_autocorr']=echo(T[2].x,sr,s+2);res.phases[p]=o}
document.getElementById('out').textContent=JSON.stringify(res,null,1);window.__res=res}catch(e){document.getElementById('out').textContent='ERROR '+e.message+' '+e.stack}})();
</script></body></html>`;
