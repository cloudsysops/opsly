const games = window.ASTRAL_RETRO_GAMES || [];
const cloneGames = window.ASTRAL_CLONE_LAB_GAMES || [];
const upstreamGames = window.ASTRAL_UPSTREAM_GAMES || [];
const allGames = [...games, ...cloneGames];

const grid = document.querySelector('#game-grid');
const cloneGrid = document.querySelector('#clone-game-grid');
const upstreamGrid = document.querySelector('#upstream-game-grid');
const playground = document.querySelector('#playground');
const canvas = document.querySelector('#game-canvas');
const title = document.querySelector('#active-title');
const desc = document.querySelector('#active-description');
const note = document.querySelector('#feedback-note');
const ideasEl = document.querySelector('#idea-list');

let runtime = null;
let activeGame = null;
let activeSession = null;

function cardMarkup(game, mode = 'opsly') {
  const source = mode === 'opsly'
    ? ''
    : `<div class="source">${mode === 'upstream' ? 'OPEN-SOURCE ORIGINAL' : 'OPEN SOURCE STUDY'} · ${game.source.path}</div>`;

  const action = game.playUrl
    ? `<a class="play-btn play-link" data-upstream-game="${game.id}" href="${game.playUrl}">Jugar original</a>`
    : `<button class="play-btn" data-game="${game.id}">Jugar</button>`;

  return `
    <article class="game-card">
      <div class="icon">${game.icon}</div>
      <h3>${game.title}</h3>
      <p>${game.description}</p>
      ${source}
      <div class="tags">${game.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      ${action}
    </article>
  `;
}

function renderCards() {
  grid.innerHTML = games.map(game => cardMarkup(game)).join('');
  cloneGrid.innerHTML = cloneGames.map(game => cardMarkup(game, 'clone')).join('');
  upstreamGrid.innerHTML = upstreamGames.map(game => cardMarkup(game, 'upstream')).join('');

  document.querySelectorAll('[data-game]').forEach(btn =>
    btn.addEventListener('click', () => openGame(btn.dataset.game))
  );

  document.querySelectorAll('[data-upstream-game]').forEach(link =>
    link.addEventListener('click', () => {
      const game = upstreamGames.find(item => item.id === link.dataset.upstreamGame);
      if (!game) return;
      const items = loadPlaytests();
      items.unshift({
        gameId: game.id,
        title: game.title,
        startedAt: new Date().toISOString(),
        endedAt: null,
        durationSeconds: null,
        score: null,
        feedback: null,
        reason: 'opened-upstream-original',
        source: game.source.path
      });
      savePlaytests(items.slice(0, 200));
    })
  );
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-runtime="${src}"]`);
    if (existing) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.dataset.runtime = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function loadPlaytests() {
  try { return JSON.parse(localStorage.getItem('astral-games-lab-playtests') || '[]'); }
  catch { return []; }
}

function savePlaytests(items) {
  localStorage.setItem('astral-games-lab-playtests', JSON.stringify(items));
}

function finishSession(reason) {
  if (!activeSession) return;
  let score = null;
  try { score = runtime?.getScore?.() ?? null; } catch {}
  const endedAt = new Date();
  const items = loadPlaytests();
  items.unshift({
    ...activeSession,
    endedAt: endedAt.toISOString(),
    durationSeconds: Math.max(
      0,
      Math.round((endedAt.getTime() - new Date(activeSession.startedAt).getTime()) / 1000)
    ),
    score,
    reason
  });
  savePlaytests(items.slice(0, 200));
  activeSession = null;
}

async function openGame(id) {
  finishSession('switched');
  activeGame = allGames.find(game => game.id === id);
  if (!activeGame) return;

  runtime?.stop();
  runtime = null;
  note.textContent = '';
  activeSession = {
    gameId: activeGame.id,
    title: activeGame.title,
    startedAt: new Date().toISOString(),
    feedback: null,
    source: activeGame.source?.path || 'opsly-original'
  };

  title.textContent = activeGame.title;
  desc.textContent = activeGame.description;
  playground.hidden = false;

  if (activeGame.runtimeScript) {
    try {
      await loadScript(activeGame.runtimeScript);
      const factory = window.AstralCloneLabRuntimes?.[id];
      if (!factory) throw new Error('runtime-not-registered');
      runtime = factory.create(canvas);
    } catch {
      note.textContent = '🚧 Este experimento todavía no cargó correctamente.';
    }
  } else {
    runtime = window.AstralRetroRuntime.create(canvas, id);
  }

  playground.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelector('#close-game').addEventListener('click', () => {
  finishSession('closed');
  runtime?.stop();
  runtime = null;
  playground.hidden = true;
});

function setControl(control, value) {
  runtime?.setControl(control, value);
}

document.querySelectorAll('[data-control]').forEach(btn => {
  const control = btn.dataset.control;
  for (const eventName of ['pointerdown', 'touchstart']) {
    btn.addEventListener(eventName, event => {
      event.preventDefault();
      setControl(control, true);
    }, { passive: false });
  }
  for (const eventName of ['pointerup', 'pointercancel', 'pointerleave', 'touchend']) {
    btn.addEventListener(eventName, event => {
      event.preventDefault();
      setControl(control, false);
    }, { passive: false });
  }
});

window.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'a') setControl('left', true);
  if (event.key === 'ArrowRight' || event.key === 'd') setControl('right', true);
  if (event.key === ' ' || event.key === 'ArrowUp') setControl('action', true);
});

window.addEventListener('keyup', event => {
  if (event.key === 'ArrowLeft' || event.key === 'a') setControl('left', false);
  if (event.key === 'ArrowRight' || event.key === 'd') setControl('right', false);
  if (event.key === ' ' || event.key === 'ArrowUp') setControl('action', false);
});

function loadIdeas() {
  try { return JSON.parse(localStorage.getItem('astral-retro-ideas') || '[]'); }
  catch { return []; }
}

function saveIdeas(items) {
  localStorage.setItem('astral-retro-ideas', JSON.stringify(items));
  renderIdeas();
}

function renderIdeas() {
  const ideas = loadIdeas();
  ideasEl.innerHTML = ideas.length
    ? ideas.map(idea => `
      <div class="idea">
        <div>
          <strong>${idea.title}</strong><br>
          <small>Base: ${idea.sourceTitle} · ${new Date(idea.createdAt).toLocaleDateString()}</small>
        </div>
        <small>${idea.status}</small>
      </div>
    `).join('')
    : '<p class="note">Todavía no hay clones conceptuales. Prueba un juego y toca “Clonar mecánica”.</p>';
}

document.querySelectorAll('[data-feedback]').forEach(btn =>
  btn.addEventListener('click', () => {
    if (!activeGame) return;
    const type = btn.dataset.feedback;
    if (activeSession) activeSession.feedback = type;

    if (type === 'clone') {
      const name = window.prompt('Nombre para tu versión Astral:', activeGame.title + ' · Astral Remix');
      if (!name) return;
      const ideas = loadIdeas();
      ideas.unshift({
        id: 'idea-' + Date.now(),
        title: name,
        sourceMechanic: activeGame.id,
        sourceTitle: activeGame.title,
        createdAt: new Date().toISOString(),
        status: 'idea',
        license: activeGame.source?.license || 'original-mechanic-template',
        copyPolicy: 'mechanic-only-original-expression-required'
      });
      saveIdeas(ideas);
      note.textContent = '✨ Idea guardada. Podemos graduar este patrón a un juego Astral.';
      return;
    }

    note.textContent = type === 'love'
      ? '❤️ Guardado: esta mecánica gustó.'
      : '🤔 Guardado: esta mecánica necesita cambios.';
    localStorage.setItem('astral-feedback-' + activeGame.id, type);
  })
);

document.querySelector('#export-playtests').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(loadPlaytests(), null, 2)], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = 'astral-games-lab-playtests.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 500);
});

document.querySelector('#export-ideas').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(loadIdeas(), null, 2)], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = 'astral-games-lab-ideas.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 500);
});

renderCards();
renderIdeas();
