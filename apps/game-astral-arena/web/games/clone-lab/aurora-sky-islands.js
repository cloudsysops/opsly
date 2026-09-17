window.AstralCloneLabRuntimes = window.AstralCloneLabRuntimes || {};
window.AstralCloneLabRuntimes['aurora-sky-islands'] = {
  create(canvas) {
    const ctx=canvas.getContext('2d');
    const W=canvas.width,H=canvas.height;
    const controls={left:false,right:false,action:false};
    let raf=0,running=true,last=performance.now(),elapsed=0,score=0,combo=0;
    let lane=0,altitude=.18,vy=0,boostLatch=false;
    let objects=[];
    let spawn=0;

    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const rand=(a,b)=>a+Math.random()*(b-a);

    function resetObject(o,z=1.2){
      o.z=z+rand(0,.8);
      o.x=rand(-1.1,1.1);
      o.y=rand(.08,.6);
      o.type=Math.random()<.62?'crystal':'island';
      o.hit=false;
    }

    for(let i=0;i<13;i++){
      const o={};resetObject(o,.8+i*.18);objects.push(o);
    }

    function project(o){
      const depth=Math.max(.08,o.z);
      const scale=1/depth;
      return {
        x:W/2+(o.x-lane)*290*scale,
        y:145+(1-o.y+altitude*.3)*190*scale,
        scale:clamp(scale,.18,2.2)
      };
    }

    function update(dt){
      elapsed+=dt;
      const dir=(controls.left?-1:0)+(controls.right?1:0);
      lane=clamp(lane+dir*1.15*dt,-1.15,1.15);

      if(controls.action&&!boostLatch){vy=.72;}
      boostLatch=controls.action;
      vy-=1.12*dt;
      altitude=clamp(altitude+vy*dt,0,.78);
      if(altitude===0&&vy<0)vy=0;

      const speed=.23+Math.min(.28,elapsed*.0045);
      for(const o of objects){
        o.z-=speed*dt;
        if(o.z<.12) resetObject(o,1.3);

        if(o.hit) continue;
        if(o.z<.34&&o.z>.16){
          const dx=Math.abs(o.x-lane);
          const dy=Math.abs(o.y-altitude);
          if(dx<.22&&dy<.22){
            if(o.type==='crystal'){score+=150+combo*20;combo=Math.min(9,combo+1);}
            else {combo=0;score=Math.max(0,score-80);vy=.45;}
            o.hit=true;
          }
        }
      }
      score+=dt*(8+combo*2);
    }

    function drawSky(){
      const g=ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#120d38');g.addColorStop(.55,'#5a4ab5');g.addColorStop(1,'#ffb0dc');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(255,255,255,.38)';
      for(let i=0;i<36;i++){
        const x=(i*181+elapsed*16)%W;
        const y=35+(i*67)%180;
        ctx.fillRect(x,y,2,2);
      }
      ctx.fillStyle='rgba(255,255,255,.18)';
      ctx.beginPath();ctx.ellipse(W*.2,235,150,35,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(W*.78,205,190,42,0,0,Math.PI*2);ctx.fill();
    }

    function drawObject(o){
      if(o.hit)return;
      const p=project(o);
      if(p.x<-160||p.x>W+160||p.y<-100||p.y>H+140)return;
      if(o.type==='island'){
        const w=120*p.scale,h=34*p.scale;
        ctx.fillStyle='rgba(32,29,70,.92)';
        ctx.beginPath();ctx.ellipse(p.x,p.y,w,h,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#7a68db';
        ctx.beginPath();ctx.ellipse(p.x,p.y-h*.4,w*.82,h*.45,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#4ce6bb';
        ctx.fillRect(p.x-5*p.scale,p.y-h*1.2,10*p.scale,18*p.scale);
      }else{
        ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.scale,p.scale);ctx.rotate(elapsed*1.6+o.x);
        ctx.fillStyle='#9ffff0';ctx.shadowBlur=16;ctx.shadowColor='#77ffe2';
        ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(12,0);ctx.lineTo(0,18);ctx.lineTo(-12,0);ctx.closePath();ctx.fill();
        ctx.restore();
      }
    }

    function drawAurora(){
      const x=W/2+lane*165,y=H-105-altitude*185;
      ctx.save();ctx.translate(x,y);
      ctx.shadowBlur=22;ctx.shadowColor='#f5d7ff';
      ctx.fillStyle='#f5eaff';ctx.beginPath();ctx.ellipse(0,0,29,18,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(22,-16,13,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#d56fff';ctx.beginPath();ctx.moveTo(25,-28);ctx.lineTo(33,-49);ctx.lineTo(36,-25);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#ff9fe8';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-24,-4);ctx.quadraticCurveTo(-50,-25,-58,-6);ctx.stroke();
      ctx.fillStyle='rgba(139,255,231,.75)';
      ctx.beginPath();ctx.moveTo(-12,8);ctx.lineTo(-40,26);ctx.lineTo(-6,20);ctx.closePath();ctx.fill();
      ctx.restore();
    }

    function draw(){
      drawSky();
      [...objects].sort((a,b)=>b.z-a.z).forEach(drawObject);
      drawAurora();
      ctx.fillStyle='#fff';ctx.font='700 21px system-ui';ctx.fillText('SKY SCORE '+Math.floor(score),20,32);
      ctx.fillStyle='#9ffff0';ctx.font='600 16px system-ui';ctx.fillText('COMBO x'+combo,20,58);
      ctx.fillStyle='#f4dcff';ctx.fillText('◀ ▶ MOVER · ● VOLAR',W-220,32);
    }

    function loop(now){if(!running)return;const dt=Math.min(.032,(now-last)/1000);last=now;update(dt);draw();raf=requestAnimationFrame(loop);}
    raf=requestAnimationFrame(loop);
    return {
      setControl(name,value){controls[name]=value;},
      stop(){running=false;cancelAnimationFrame(raf);},
      getScore(){return Math.floor(score);}
    };
  }
};
