window.AstralCloneLabRuntimes = window.AstralCloneLabRuntimes || {};
window.AstralCloneLabRuntimes['meteor-dodge-godot'] = {
  create(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const controls = { left:false, right:false, action:false };
    let raf = 0;
    let running = true;
    let last = performance.now();
    let elapsed = 0;
    let score = 0;
    let crystals = 0;
    let shield = 0;
    let dashCooldown = 0;
    let dashTimer = 0;
    let spawnMeteor = 0;
    let spawnCrystal = 1.2;
    const player = { x: W/2-26, y:H-82, w:52, h:52, speed:480 };
    let meteors = [];
    let pickups = [];

    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const rand=(a,b)=>a+Math.random()*(b-a);

    function resetRun() {
      elapsed = 0;
      score = 0;
      crystals = 0;
      shield = 0;
      dashCooldown = 0;
      dashTimer = 0;
      meteors = [];
      pickups = [];
      player.x = W/2-player.w/2;
    }

    function overlap(a,b) {
      return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
    }

    function update(dt) {
      elapsed += dt;
      score += dt * (10 + Math.min(40, elapsed * 0.6));
      dashCooldown = Math.max(0, dashCooldown-dt);
      dashTimer = Math.max(0, dashTimer-dt);

      if (controls.action && dashCooldown === 0) {
        dashTimer = 0.22;
        dashCooldown = 1.1;
      }

      const axis=(controls.left?-1:0)+(controls.right?1:0);
      const speed=player.speed*(dashTimer>0?2.35:1);
      player.x=clamp(player.x+axis*speed*dt,0,W-player.w);

      spawnMeteor -= dt;
      if (spawnMeteor <= 0) {
        const difficulty = Math.min(0.58, elapsed * 0.004);
        spawnMeteor = Math.max(0.16, 0.62-difficulty);
        const size = rand(26,56);
        meteors.push({
          x:rand(0,W-size), y:-size-10, w:size, h:size,
          v:rand(230,420)+elapsed*1.8,
          spin:rand(-3,3)
        });
      }

      spawnCrystal -= dt;
      if (spawnCrystal <= 0) {
        spawnCrystal = rand(1.4,2.8);
        pickups.push({x:rand(20,W-50), y:-35, w:30,h:30,v:rand(180,240)});
      }

      meteors.forEach(m=>m.y+=m.v*dt);
      pickups.forEach(p=>p.y+=p.v*dt);

      for (const p of pickups) {
        if (!p.dead && overlap(player,p)) {
          p.dead = true;
          crystals += 1;
          shield = Math.min(3, shield + 1);
          score += 100;
        }
      }

      for (const m of meteors) {
        if (m.dead || !overlap(player,m)) continue;
        if (dashTimer > 0) {
          m.dead = true;
          score += 40;
          continue;
        }
        if (shield > 0) {
          shield -= 1;
          m.dead = true;
          continue;
        }
        resetRun();
        break;
      }

      meteors=meteors.filter(m=>!m.dead&&m.y<H+80);
      pickups=pickups.filter(p=>!p.dead&&p.y<H+50);
    }

    function drawShip() {
      ctx.save();
      ctx.translate(player.x+player.w/2, player.y+player.h/2);
      if (dashTimer>0) ctx.scale(1.18,1.18);
      ctx.shadowBlur=shield>0?24:12;
      ctx.shadowColor=shield>0?'#76f6ff':'#9b7cff';
      ctx.fillStyle='#9b7cff';
      ctx.beginPath();
      ctx.moveTo(0,-26);
      ctx.lineTo(25,22);
      ctx.lineTo(0,12);
      ctx.lineTo(-25,22);
      ctx.closePath();
      ctx.fill();
      if (shield>0) {
        ctx.strokeStyle='rgba(118,246,255,.9)';
        ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(0,0,34,0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();
    }

    function draw() {
      ctx.fillStyle='#040713';ctx.fillRect(0,0,W,H);
      for(let i=0;i<70;i++){
        const x=(i*137+Math.floor(elapsed*18))%W;
        const y=(i*83+Math.floor(elapsed*36))%H;
        ctx.fillStyle=i%7===0?'#8ae7ff':'rgba(255,255,255,.35)';
        ctx.fillRect(x,y,2,2);
      }

      for(const p of pickups){
        ctx.save();ctx.translate(p.x+15,p.y+15);ctx.rotate(elapsed*2);
        ctx.fillStyle='#77ffd9';
        ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(12,0);ctx.lineTo(0,15);ctx.lineTo(-12,0);ctx.closePath();ctx.fill();
        ctx.restore();
      }

      for(const m of meteors){
        const r=m.w/2;
        ctx.fillStyle='#ff704d';
        ctx.beginPath();ctx.arc(m.x+r,m.y+r,r,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(255,208,92,.55)';
        ctx.beginPath();ctx.arc(m.x+r*.7,m.y+r*.7,r*.3,0,Math.PI*2);ctx.fill();
      }

      drawShip();

      ctx.fillStyle='#eef3ff';ctx.font='700 22px system-ui';
      ctx.fillText('SCORE '+Math.floor(score),22,32);
      ctx.font='600 16px system-ui';
      ctx.fillStyle='#77ffd9';
      ctx.fillText('CRISTALES '+crystals,22,58);
      ctx.fillStyle='#8ae7ff';
      ctx.fillText('ESCUDO '+shield+'/3',22,82);
      ctx.fillStyle='#b9c5e8';
      ctx.fillText(dashCooldown===0?'● DASH LISTO':'● DASH '+dashCooldown.toFixed(1)+'s',W-180,32);
    }

    function loop(now){
      if(!running)return;
      const dt=Math.min(.032,(now-last)/1000);last=now;
      update(dt);draw();raf=requestAnimationFrame(loop);
    }
    raf=requestAnimationFrame(loop);

    return {
      setControl(name,value){controls[name]=value;},
      stop(){running=false;cancelAnimationFrame(raf);},
      getScore(){return Math.floor(score);}
    };
  }
};
