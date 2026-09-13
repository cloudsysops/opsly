window.ASTRAL_RETRO_GAMES = [
  {
    id: 'star-paddle',
    title: 'Star Paddle',
    icon: '🌟',
    description: 'Rebota una estrella, protege tu portal y aprende timing + ángulos.',
    tags: ['paddle', 'timing', '1P'],
    palette: ['#8a5cff','#f4d35e','#ffffff'],
  },
  {
    id: 'crystal-breaker',
    title: 'Crystal Breaker',
    icon: '💎',
    description: 'Rompe cristales del Nexo con rebotes y mejoras de precisión.',
    tags: ['breaker', 'aim', 'combo'],
    palette: ['#58d8ff','#b46cff','#ff7cc8'],
  },
  {
    id: 'nexus-snake',
    title: 'Nexus Snake',
    icon: '🌀',
    description: 'Recoge energía sin tocar tu propia estela astral.',
    tags: ['grid', 'route', 'score'],
    palette: ['#45e6a8','#5aa7ff','#f7f7fb'],
  },
  {
    id: 'meteor-dodge',
    title: 'Meteor Dodge',
    icon: '☄️',
    description: 'Mueve a tu Guardián, esquiva meteoros y sobrevive cada ronda.',
    tags: ['dodge', 'survival', 'reflex'],
    palette: ['#ff8a5c','#ff5ca8','#8f7bff'],
  },
];

window.AstralRetroRuntime = (() => {
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const rand = (a,b) => a + Math.random() * (b-a);

  function create(canvas, gameId) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    let raf = 0, last = performance.now(), running = true;
    const controls = {left:false,right:false,action:false};
    const game = { id: gameId, score: 0, lives: 3, t: 0 };

    const state = init(gameId);

    function init(id) {
      if (id === 'star-paddle') return {
        paddle:{x:W/2-90,y:H-42,w:180,h:18,speed:560},
        ball:{x:W/2,y:H/2,vx:290,vy:-310,r:11},
      };
      if (id === 'crystal-breaker') {
        const bricks=[];
        for(let y=0;y<5;y++) for(let x=0;x<9;x++) bricks.push({x:60+x*94,y:60+y*44,w:76,h:26,alive:true});
        return {
          paddle:{x:W/2-82,y:H-42,w:164,h:18,speed:560},
          ball:{x:W/2,y:H-95,vx:300,vy:-330,r:10},
          bricks,
        };
      }
      if (id === 'nexus-snake') return {
        snake:[{x:12,y:7},{x:11,y:7},{x:10,y:7}],
        dir:{x:1,y:0}, next:{x:1,y:0},
        food:{x:18,y:10}, accum:0, cell:30,
      };
      return {
        player:{x:W/2-28,y:H-80,w:56,h:56,speed:620},
        meteors:[], spawn:0,
      };
    }

    function resetBall(ball) {
      ball.x=W/2; ball.y=H/2; ball.vx=rand(-320,320); ball.vy=-330;
    }

    function update(dt) {
      game.t += dt;
      if (gameId === 'star-paddle' || gameId === 'crystal-breaker') updatePaddle(dt);
      else if (gameId === 'nexus-snake') updateSnake(dt);
      else updateDodge(dt);
    }

    function updatePaddle(dt) {
      const p=state.paddle,b=state.ball;
      const dir=(controls.left?-1:0)+(controls.right?1:0);
      p.x=clamp(p.x+dir*p.speed*dt,0,W-p.w);
      b.x+=b.vx*dt; b.y+=b.vy*dt;
      if(b.x<b.r||b.x>W-b.r){ b.vx*=-1; b.x=clamp(b.x,b.r,W-b.r); }
      if(b.y<b.r){ b.vy=Math.abs(b.vy); }
      if(b.vy>0 && b.y+b.r>=p.y && b.y-b.r<=p.y+p.h && b.x>=p.x && b.x<=p.x+p.w){
        const rel=(b.x-(p.x+p.w/2))/(p.w/2);
        b.vx=rel*430; b.vy=-Math.abs(b.vy)*1.02; game.score+=5;
      }
      if(gameId==='crystal-breaker'){
        for(const brick of state.bricks){
          if(!brick.alive) continue;
          if(b.x+b.r>brick.x&&b.x-b.r<brick.x+brick.w&&b.y+b.r>brick.y&&b.y-b.r<brick.y+brick.h){
            brick.alive=false; b.vy*=-1; game.score+=20; break;
          }
        }
        if(state.bricks.every(b=>!b.alive)){ game.score+=500; state.bricks.forEach(b=>b.alive=true); resetBall(b); }
      }
      if(b.y>H+30){ game.lives--; resetBall(b); if(game.lives<=0){ game.lives=3; game.score=0; } }
    }

    function updateSnake(dt) {
      const s=state;
      if(controls.left){ s.next={x:0,y:-1}; controls.left=false; }
      if(controls.right){ s.next={x:0,y:1}; controls.right=false; }
      if(controls.action){ s.next={x:-s.dir.y,y:s.dir.x}; controls.action=false; }
      s.accum+=dt;
      if(s.accum<0.12) return;
      s.accum=0;
      if(!(s.next.x===-s.dir.x&&s.next.y===-s.dir.y)) s.dir=s.next;
      const head={x:(s.snake[0].x+s.dir.x+32)%32,y:(s.snake[0].y+s.dir.y+18)%18};
      if(s.snake.some(p=>p.x===head.x&&p.y===head.y)){ s.snake=[{x:12,y:7},{x:11,y:7},{x:10,y:7}]; s.dir={x:1,y:0}; game.score=0; return; }
      s.snake.unshift(head);
      if(head.x===s.food.x&&head.y===s.food.y){
        game.score+=10; s.food={x:Math.floor(rand(1,31)),y:Math.floor(rand(1,17))};
      } else s.snake.pop();
    }

    function updateDodge(dt) {
      const s=state,p=s.player;
      const dir=(controls.left?-1:0)+(controls.right?1:0);
      p.x=clamp(p.x+dir*p.speed*dt,0,W-p.w);
      s.spawn-=dt;
      if(s.spawn<=0){ s.spawn=Math.max(.18,.7-game.t*.004); s.meteors.push({x:rand(0,W-34),y:-40,w:34,h:34,v:rand(220,430)}); }
      for(const m of s.meteors) m.y+=m.v*dt;
      for(const m of s.meteors){
        if(m.x<p.x+p.w&&m.x+m.w>p.x&&m.y<p.y+p.h&&m.y+m.h>p.y){ game.score=0; game.t=0; s.meteors=[]; break; }
      }
      s.meteors=s.meteors.filter(m=>{ if(m.y>H+50){game.score+=2;return false;} return true; });
    }

    function draw() {
      ctx.fillStyle='#050817'; ctx.fillRect(0,0,W,H);
      const g=ctx.createRadialGradient(W*.5,H*.35,10,W*.5,H*.35,W*.8);
      g.addColorStop(0,'rgba(83,55,170,.25)'); g.addColorStop(1,'rgba(2,4,13,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#c9d4ff';ctx.font='22px system-ui';ctx.fillText('SCORE '+game.score,24,34);

      if(gameId==='star-paddle'||gameId==='crystal-breaker') drawPaddle();
      else if(gameId==='nexus-snake') drawSnake();
      else drawDodge();
    }

    function drawPaddle(){
      const p=state.paddle,b=state.ball;
      if(gameId==='crystal-breaker'){
        for(const brick of state.bricks){
          if(!brick.alive) continue;
          ctx.fillStyle=['#6b5cff','#5ec8ff','#cf6bff','#ff6faf','#f4d35e'][Math.floor((brick.y-60)/44)%5];
          ctx.fillRect(brick.x,brick.y,brick.w,brick.h);
        }
      }
      ctx.fillStyle='#8a5cff';ctx.fillRect(p.x,p.y,p.w,p.h);
      ctx.beginPath();ctx.fillStyle='#f4d35e';ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#aeb9dd';ctx.font='18px system-ui';ctx.fillText('VIDAS '+game.lives,W-110,34);
    }

    function drawSnake(){
      const s=state,c=s.cell;
      for(let y=0;y<18;y++)for(let x=0;x<32;x++){ctx.strokeStyle='rgba(60,80,140,.16)';ctx.strokeRect(x*c,y*c,c,c);}
      ctx.fillStyle='#f4d35e';ctx.fillRect(s.food.x*c+5,s.food.y*c+5,c-10,c-10);
      s.snake.forEach((p,i)=>{ctx.fillStyle=i===0?'#7bffca':'#35c997';ctx.fillRect(p.x*c+3,p.y*c+3,c-6,c-6);});
    }

    function drawDodge(){
      const s=state,p=s.player;
      ctx.fillStyle='#8a5cff';ctx.beginPath();ctx.moveTo(p.x+p.w/2,p.y);ctx.lineTo(p.x+p.w,p.y+p.h);ctx.lineTo(p.x,p.y+p.h);ctx.closePath();ctx.fill();
      for(const m of s.meteors){ctx.fillStyle='#ff754f';ctx.beginPath();ctx.arc(m.x+m.w/2,m.y+m.h/2,m.w/2,0,Math.PI*2);ctx.fill();}
    }

    function loop(now) {
      if(!running) return;
      const dt=Math.min(.032,(now-last)/1000);last=now;update(dt);draw();raf=requestAnimationFrame(loop);
    }
    raf=requestAnimationFrame(loop);

    return {
      setControl(name,value){controls[name]=value;},
      stop(){running=false;cancelAnimationFrame(raf);},
      getScore(){return game.score;}
    };
  }

  return { create };
})();
