const games = window.ASTRAL_RETRO_GAMES || [];
const grid = document.querySelector('#game-grid');
const playground = document.querySelector('#playground');
const canvas = document.querySelector('#game-canvas');
const title = document.querySelector('#active-title');
const desc = document.querySelector('#active-description');
const note = document.querySelector('#feedback-note');
const ideasEl = document.querySelector('#idea-list');
let runtime = null;
let activeGame = null;

function renderCards() {
  grid.innerHTML = games.map(game => `
    <article class="game-card">
      <div class="icon">${game.icon}</div>
      <h3>${game.title}</h3>
      <p>${game.description}</p>
      <div class="tags">${game.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
      <button class="play-btn" data-game="${game.id}">Jugar</button>
    </article>
  `).join('');
  grid.querySelectorAll('[data-game]').forEach(btn => btn.addEventListener('click', () => openGame(btn.dataset.game)));
}

function openGame(id) {
  activeGame = games.find(g => g.id === id);
  if (!activeGame) return;
  runtime?.stop();
  title.textContent = activeGame.title;
  desc.textContent = activeGame.description;
  playground.hidden = false;
  runtime = window.AstralRetroRuntime.create(canvas, id);
  playground.scrollIntoView({behavior:'smooth',block:'start'});
}

document.querySelector('#close-game').addEventListener('click', () => {
  runtime?.stop(); runtime = null; playground.hidden = true;
});

function setControl(control, value) { runtime?.setControl(control, value); }
document.querySelectorAll('[data-control]').forEach(btn => {
  const c=btn.dataset.control;
  for (const ev of ['pointerdown','touchstart']) btn.addEventListener(ev, e=>{e.preventDefault();setControl(c,true);},{passive:false});
  for (const ev of ['pointerup','pointercancel','pointerleave','touchend']) btn.addEventListener(ev, e=>{e.preventDefault();setControl(c,false);},{passive:false});
});

window.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'||e.key==='a') setControl('left',true);
  if(e.key==='ArrowRight'||e.key==='d') setControl('right',true);
  if(e.key===' '||e.key==='ArrowUp') setControl('action',true);
});
window.addEventListener('keyup',e=>{
  if(e.key==='ArrowLeft'||e.key==='a') setControl('left',false);
  if(e.key==='ArrowRight'||e.key==='d') setControl('right',false);
  if(e.key===' '||e.key==='ArrowUp') setControl('action',false);
});

function loadIdeas(){ try{return JSON.parse(localStorage.getItem('astral-retro-ideas')||'[]');}catch{return [];} }
function saveIdeas(items){ localStorage.setItem('astral-retro-ideas',JSON.stringify(items)); renderIdeas(); }
function renderIdeas(){
  const ideas=loadIdeas();
  ideasEl.innerHTML=ideas.length?ideas.map(i=>`
    <div class="idea">
      <div><strong>${i.title}</strong><br><small>Base: ${i.sourceTitle} · ${new Date(i.createdAt).toLocaleDateString()}</small></div>
      <small>${i.status}</small>
    </div>`).join(''):'<p class="note">Todavía no hay clones conceptuales. Prueba un juego y toca “Clonar mecánica”.</p>';
}

document.querySelectorAll('[data-feedback]').forEach(btn => btn.addEventListener('click',()=>{
  if(!activeGame) return;
  const type=btn.dataset.feedback;
  if(type==='clone'){
    const name=window.prompt('Nombre para tu versión Astral:', activeGame.title+' · Astral Remix');
    if(!name) return;
    const ideas=loadIdeas();
    ideas.unshift({
      id:'idea-'+Date.now(),
      title:name,
      sourceMechanic:activeGame.id,
      sourceTitle:activeGame.title,
      createdAt:new Date().toISOString(),
      status:'idea',
      license:'original-mechanic-template',
      copyPolicy:'mechanic-only-no-third-party-assets'
    });
    saveIdeas(ideas);
    note.textContent='✨ Idea guardada. Podemos convertir este patrón en un prototipo Astral propio.';
  } else {
    note.textContent=type==='love'?'❤️ Guardado: esta mecánica gustó.':'🤔 Guardado: esta mecánica necesita cambios.';
    localStorage.setItem('astral-feedback-'+activeGame.id,type);
  }
}));

document.querySelector('#export-ideas').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(loadIdeas(),null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='astral-games-lab-ideas.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
});

renderCards(); renderIdeas();
