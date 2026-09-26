window.AstralCloneLabRuntimes = window.AstralCloneLabRuntimes || {};
window.AstralCloneLabRuntimes['michelle-butterfly-quest'] = {
  create(canvas) {
    const ctx=canvas.getContext('2d');
    const W=canvas.width,H=canvas.height;
    const controls={left:false,right:false,action:false};
    let raf=0,running=true,last=performance.now(),cameraX=0,score=0;
    const worldW=2500;
    const player={x:80,y:360,w:42,h:56,vx:0,vy:0,onGround:false};
    const platforms=[
      {x:0,y:470,w:420,h:70},{x:500,y:430,w:260,h:110},{x:820,y:370,w:260,h:170},
      {x:1140,y:440,w:320,h:100},{x:1530,y:350,w:240,h:190},{x:1830,y:410,w:270,h:130},
      {x:2170,y:330,w:330,h:210}
    ];
    const butterflies=[
      [220,410],[590,370],[930,310],[1250,380],[1650,290],[1940,350],[2260,270]
    ].map(([x,y],i)=>({x,y,r:12,collected:false,phase:i*.7}));
    const portal={x:2380,y:245,w:64,h:85,open:false};
    let jumpLatch=false;

    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    function reset(){player.x=80;player.y=360;player.vx=0;player.vy=0;cameraX=0;}
    function intersects(a,b){return a.x<a.x+a.w && a.x<b.x+b.w && a.x+a.w>b.x && a.y+a.h>b.y && a.y<b.y+b.h;}

    function update(dt){
      const dir=(controls.left?-1:0)+(controls.right?1:0);
      player.vx=dir*300;
      if(controls.action&&!jumpLatch&&player.onGround){player.vy=-570;player.onGround=false;}
      jumpLatch=controls.action;
      player.vy+=1250*dt;
      player.x=clamp(player.x+player.vx*dt,0,worldW-player.w);

      const prevBottom=player.y+player.h;
      player.y+=player.vy*dt;
      player.onGround=false;
      for(const p of platforms){
        const nowBottom=player.y+player.h;
        const withinX=player.x+player.w>p.x&&player.x<p.x+p.w;
        if(withinX&&player.vy>=0&&prevBottom<=p.y+4&&nowBottom>=p.y){
          player.y=p.y-player.h;player.vy=0;player.onGround=true;
        }
      }
      if(player.y>H+150) reset();

      for(const b of butterflies){
        if(b.collected)continue;
        const dx=(player.x+player.w/2)-b.x,dy=(player.y+player.h/2)-b.y;
        if(dx*dx+dy*dy<42*42){b.collected=true;score+=100;}
      }
      portal.open=butterflies.every(b=>b.collected);
      if(portal.open&&player.x+player.w>portal.x&&player.x<portal.x+portal.w&&player.y+player.h>portal.y){
        butterflies.forEach(b=>b.collected=false);score+=1000;reset();
      }

      cameraX=clamp(player.x-W*.38,0,worldW-W);
    }

    function drawBackground(){
      const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#120d2a');g.addColorStop(1,'#27154c');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      for(let i=0;i<55;i++){
        const x=((i*173-cameraX*.18)%W+W)%W,y=(i*97)%360;
        ctx.fillStyle=i%6===0?'rgba(255,126,210,.55)':'rgba(255,255,255,.25)';
        ctx.fillRect(x,y,2,2);
      }
    }

    function draw(){
      drawBackground();
      ctx.save();ctx.translate(-cameraX,0);
      for(const p of platforms){
        ctx.fillStyle='#241b45';ctx.fillRect(p.x,p.y,p.w,p.h);
        ctx.fillStyle='#6d4fd0';ctx.fillRect(p.x,p.y,p.w,10);
        for(let x=p.x+24;x<p.x+p.w;x+=70){ctx.fillStyle='#38265f';ctx.fillRect(x,p.y+25,16,28);}
      }

      for(const b of butterflies){
        if(b.collected)continue;
        const bob=Math.sin(performance.now()/350+b.phase)*6;
        ctx.save();ctx.translate(b.x,b.y+bob);
        ctx.fillStyle='#ff77c8';
        ctx.beginPath();ctx.ellipse(-9,0,11,7,-.45,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(9,0,11,7,.45,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.fillRect(-2,-4,4,9);ctx.restore();
      }

      ctx.fillStyle=portal.open?'#7dffdf':'#47316e';
      ctx.fillRect(portal.x,portal.y,portal.w,portal.h);
      ctx.strokeStyle=portal.open?'#d9fff5':'#765d9a';ctx.lineWidth=5;ctx.strokeRect(portal.x,portal.y,portal.w,portal.h);

      ctx.save();ctx.translate(player.x+player.w/2,player.y+player.h/2);
      ctx.fillStyle='#f5f5fb';ctx.beginPath();ctx.arc(0,-8,13,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#111827';ctx.fillRect(-12,8,24,25);
      ctx.fillStyle='#ff77c8';
      ctx.beginPath();ctx.ellipse(-22,4,19,11,-.5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(22,4,19,11,.5,0,Math.PI*2);ctx.fill();
      ctx.restore();
      ctx.restore();

      ctx.fillStyle='#fff';ctx.font='700 21px system-ui';ctx.fillText('MARIPOSAS '+butterflies.filter(b=>b.collected).length+'/'+butterflies.length,20,32);
      ctx.fillStyle='#ff9ed8';ctx.font='600 16px system-ui';ctx.fillText(portal.open?'PORTAL ABIERTO ✨':'REÚNE TODAS LAS MARIPOSAS',20,58);
      ctx.fillStyle='#b9c5e8';ctx.fillText('SCORE '+score,W-125,32);
    }

    function loop(now){if(!running)return;const dt=Math.min(.032,(now-last)/1000);last=now;update(dt);draw();raf=requestAnimationFrame(loop);}
    raf=requestAnimationFrame(loop);

    return {
      setControl(name,value){controls[name]=value;},
      stop(){running=false;cancelAnimationFrame(raf);},
      getScore(){return score;}
    };
  }
};
