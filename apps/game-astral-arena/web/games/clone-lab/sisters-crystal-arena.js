window.AstralCloneLabRuntimes = window.AstralCloneLabRuntimes || {};
window.AstralCloneLabRuntimes['sisters-crystal-arena'] = {
  create(canvas) {
    const ctx=canvas.getContext('2d');
    const W=canvas.width,H=canvas.height;
    const controls={left:false,right:false,action:false};
    let raf=0,running=true,last=performance.now(),score=0,round=1,spawn=0,crystalSpawn=0;
    let p2LastInput=0;
    const p1={x:W*.32,y:H*.68,r:22,vx:0,vy:0,color:'#ff7dc8',name:'ARENA'};
    const p2={x:W*.68,y:H*.68,r:22,vx:0,vy:0,color:'#7edfff',name:'BRISSA'};
    let hazards=[],crystals=[];
    const keys=new Set();
    const rand=(a,b)=>a+Math.random()*(b-a);
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

    function keyDown(e){if(['j','l','i'].includes(e.key.toLowerCase())){keys.add(e.key.toLowerCase());p2LastInput=performance.now();}}
    function keyUp(e){keys.delete(e.key.toLowerCase());}
    window.addEventListener('keydown',keyDown);
    window.addEventListener('keyup',keyUp);

    function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}

    function pulse(player) {
      for(const h of hazards){
        const d=distance(player,h);
        if(d<120){h.vx+=(h.x-player.x)*2.2;h.vy+=(h.y-player.y)*2.2;h.hit=true;}
      }
    }

    let p1Latch=false,p2Latch=false;
    function updatePlayer(p,dx,dy,dt){
      const speed=310;
      p.x=clamp(p.x+dx*speed*dt,p.r,W-p.r);
      p.y=clamp(p.y+dy*speed*dt,p.r+40,H-p.r);
    }

    function update(dt){
      const p1x=(controls.left?-1:0)+(controls.right?1:0);
      let p1y=0;
      if(controls.action&&!p1Latch)pulse(p1);
      p1Latch=controls.action;
      updatePlayer(p1,p1x,p1y,dt);

      const manual2=performance.now()-p2LastInput<3000;
      let p2x=(keys.has('j')?-1:0)+(keys.has('l')?1:0);
      let p2y=0;
      const p2Action=keys.has('i');
      if(p2Action&&!p2Latch)pulse(p2);
      p2Latch=p2Action;

      if(!manual2){
        const target=crystals[0]||p1;
        p2x=Math.sign(target.x-p2.x)*.58;
        p2y=Math.sign(target.y-p2.y)*.58;
      }
      updatePlayer(p2,p2x,p2y,dt);

      spawn-=dt;
      if(spawn<=0){
        spawn=Math.max(.26,.78-round*.04);
        const side=Math.floor(rand(0,4));
        const h={x:0,y:0,r:14+rand(0,10),vx:0,vy:0,hit:false};
        if(side===0){h.x=rand(0,W);h.y=-30;h.vx=rand(-50,50);h.vy=rand(110,190);}
        if(side===1){h.x=W+30;h.y=rand(50,H);h.vx=-rand(110,190);h.vy=rand(-50,50);}
        if(side===2){h.x=rand(0,W);h.y=H+30;h.vx=rand(-50,50);h.vy=-rand(110,190);}
        if(side===3){h.x=-30;h.y=rand(50,H);h.vx=rand(110,190);h.vy=rand(-50,50);}
        hazards.push(h);
      }

      crystalSpawn-=dt;
      if(crystalSpawn<=0){
        crystalSpawn=rand(1.1,2.2);
        crystals.push({x:rand(70,W-70),y:rand(90,H-70),r:12,phase:rand(0,6)});
      }

      hazards.forEach(h=>{h.x+=h.vx*dt;h.y+=h.vy*dt;h.vx*=.996;h.vy*=.996;});
      hazards=hazards.filter(h=>h.x>-100&&h.x<W+100&&h.y>-100&&h.y<H+100);

      for(const h of hazards){
        if(distance(p1,h)<p1.r+h.r||distance(p2,h)<p2.r+h.r){
          score=Math.max(0,score-60);h.dead=true;
        }
      }
      hazards=hazards.filter(h=>!h.dead);

      for(const c of crystals){
        if(distance(p1,c)<p1.r+c.r||distance(p2,c)<p2.r+c.r){
          c.dead=true;score+=120;
          if(score>round*700)round+=1;
        }
      }
      crystals=crystals.filter(c=>!c.dead);
    }

    function drawGrid(){
      ctx.fillStyle='#071126';ctx.fillRect(0,0,W,H);
      ctx.strokeStyle='rgba(92,120,190,.15)';ctx.lineWidth=1;
      for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=48;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      const g=ctx.createRadialGradient(W/2,H/2,20,W/2,H/2,W*.6);
      g.addColorStop(0,'rgba(111,77,255,.18)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    }

    function drawPlayer(p){
      ctx.save();ctx.translate(p.x,p.y);
      ctx.shadowBlur=20;ctx.shadowColor=p.color;ctx.fillStyle=p.color;
      ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillText(p.name,0,4);
      ctx.restore();
    }

    function draw(){
      drawGrid();
      for(const c of crystals){
        const bob=Math.sin(performance.now()/260+c.phase)*4;
        ctx.save();ctx.translate(c.x,c.y+bob);ctx.rotate(performance.now()/650);
        ctx.fillStyle='#78ffe4';ctx.shadowBlur=16;ctx.shadowColor='#78ffe4';
        ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(12,0);ctx.lineTo(0,15);ctx.lineTo(-12,0);ctx.closePath();ctx.fill();ctx.restore();
      }
      for(const h of hazards){
        ctx.fillStyle=h.hit?'#ffd85c':'#ff5f76';
        ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.fill();
      }
      drawPlayer(p1);drawPlayer(p2);
      ctx.fillStyle='#fff';ctx.font='700 21px system-ui';ctx.textAlign='left';ctx.fillText('TEAM SCORE '+score,20,30);
      ctx.fillStyle='#78ffe4';ctx.font='600 15px system-ui';ctx.fillText('ROUND '+round,20,54);
      ctx.fillStyle='#c2cae7';ctx.fillText('P1: ◀ ▶ + ● pulso',W-340,30);
      ctx.fillText('P2: J / L + I pulso · AI assist móvil',W-340,54);
    }

    function loop(now){if(!running)return;const dt=Math.min(.032,(now-last)/1000);last=now;update(dt);draw();raf=requestAnimationFrame(loop);}
    raf=requestAnimationFrame(loop);

    return {
      setControl(name,value){controls[name]=value;},
      stop(){running=false;cancelAnimationFrame(raf);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);},
      getScore(){return score;}
    };
  }
};
