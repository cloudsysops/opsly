const firstPartyGames = [
  {
    id: 'astral-arena',
    title: 'Astral Arena',
    icon: '✦',
    description: 'El juego principal del Astral Universe: historia, exploración 2D/3D, batalla híbrida y juego cooperativo.',
    tags: ['adventure', '2P', 'touch', 'Astral Universe'],
    playUrl: './astral-arena/',
    source: { path: 'opsly/astral-arena', license: 'Opsly original' },
  },
];
const retroGames = window.ASTRAL_RETRO_GAMES || [];
const cloneGames = window.ASTRAL_CLONE_LAB_GAMES || [];
const upstreamGames = window.ASTRAL_UPSTREAM_GAMES || [];

const STORAGE = Object.freeze({
  favorites: 'astral-games-lab-favorites-v1',
  recent: 'astral-games-lab-recent-v1',
  playtests: 'astral-games-lab-playtests',
  ideas: 'astral-retro-ideas',
});

function normalizeGame(game, kind) {
  const tags = Array.isArray(game.tags) ? game.tags : [];
  const isUpstream = kind === 'upstream';
  const isFirstParty = kind === 'first-party';
  return {
    ...game,
    kind,
    tags,
    touchReady: isFirstParty || !isUpstream || tags.includes('mobile') || tags.includes('touch'),
    source: game.source || null,
  };
}

const allGames = [
  ...firstPartyGames.map(game => normalizeGame(game, 'first-party')),
  ...retroGames.map(game => normalizeGame(game, 'retro')),
  ...cloneGames.map(game => normalizeGame(game, 'clone')),
  ...upstreamGames.map(game => normalizeGame(game, 'upstream')),
];

const byId = new Map(allGames.map(game => [game.id, game]));

const dom = {
  catalog: document.querySelector('#catalog-shell'),
  theater: document.querySelector('#game-theater'),
  canvas: document.querySelector('#game-canvas'),
  frame: document.querySelector('#upstream-frame'),
  loading: document.querySelector('#stage-loading'),
  stage: document.querySelector('#stage-shell'),
  touch: document.querySelector('#touch-row'),
  title: document.querySelector('#active-title'),
  description: document.querySelector('#active-description'),
  icon: document.querySelector('#active-icon'),
  feedbackNote: document.querySelector('#feedback-note'),
  activeFavorite: document.querySelector('#active-favorite'),
  rotateHint: document.querySelector('#rotate-hint'),
  firstParty: document.querySelector('#first-party-grid'),
  featured: document.querySelector('#featured-grid'),
  retro: document.querySelector('#game-grid'),
  clone: document.querySelector('#clone-game-grid'),
  upstream: document.querySelector('#upstream-game-grid'),
  recentSection: document.querySelector('#recent-section'),
  recent: document.querySelector('#recent-grid'),
  continueButton: document.querySelector('#continue-game'),
  favoritesButton: document.querySelector('#favorites-filter'),
  ideas: document.querySelector('#idea-list'),
};

let runtime = null;
let activeGame = null;
let activeSession = null;
let currentFilter = 'all';
let previousBodyOverflow = '';

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function favorites() {
  return new Set(readJson(STORAGE.favorites, []));
}

function recentIds() {
  return readJson(STORAGE.recent, []).filter(id => byId.has(id));
}

function rememberRecent(id) {
  const next = [id, ...recentIds().filter(item => item !== id)].slice(0, 8);
  writeJson(STORAGE.recent, next);
  renderRecent();
  updateContinueButton();
}

function setFavorite(id, value) {
  const items = favorites();
  if (value) items.add(id);
  else items.delete(id);
  writeJson(STORAGE.favorites, [...items]);
  renderAll();
  updateActiveFavorite();
  return items.has(id);
}

function toggleFavorite(id) {
  return setFavorite(id, !isFavorite(id));
}

function isFavorite(id) {
  return favorites().has(id);
}

function categoryMatches(game, filter) {
  if (filter === 'all') return true;
  if (filter === 'favorite') return isFavorite(game.id);
  if (filter === 'touch') return game.touchReady;
  if (filter === '2P') return game.tags.some(tag => ['2P', 'co-op', 'multiplayer'].includes(tag));
  if (filter === 'adventure') {
    return game.tags.some(tag => ['platformer', 'RPG', 'dialogue', 'battle', 'explore', 'isometric'].includes(tag));
  }
  if (filter === 'arcade') {
    return game.tags.some(tag => ['dodge', 'survival', 'arcade', 'score', 'paddle', 'breaker', 'reflex'].includes(tag));
  }
  if (filter === 'open-source') return game.kind === 'upstream';
  return true;
}

function kindLabel(game) {
  if (game.kind === 'first-party') return 'OPSLY GAME';
  if (game.kind === 'upstream') return 'OPEN-SOURCE ORIGINAL';
  if (game.kind === 'clone') return 'ASTRAL REMIX';
  return 'OPSLY ORIGINAL';
}

function deviceLabel(game) {
  if (game.touchReady) return '<span class="device-badge touch">📱 Touch</span>';
  if (game.kind === 'upstream') return '<span class="device-badge">⌨️ PC / Gamepad</span>';
  return '';
}

function gameCard(game, compact = false) {
  const source = game.source?.path
    ? `<div class="source">${kindLabel(game)} · ${game.source.path}</div>`
    : `<div class="source">${kindLabel(game)}</div>`;

  const tags = compact ? game.tags.slice(0, 2) : game.tags.slice(0, 4);
  const favorite = isFavorite(game.id);

  return `
    <article class="game-card" data-kind="${game.kind}" data-card-game="${game.id}" role="button" tabindex="0" aria-label="Jugar ${game.title}">
      <div class="card-top">
        <div class="icon" aria-hidden="true">${game.icon || '🎮'}</div>
        <button
          class="favorite-button ${favorite ? 'active' : ''}"
          data-favorite="${game.id}"
          aria-label="${favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}"
          aria-pressed="${favorite}"
        >${favorite ? '♥' : '♡'}</button>
      </div>

      <h3>${game.title}</h3>
      <p>${game.description}</p>
      ${source}

      <div class="tags">
        ${deviceLabel(game)}
        ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>

      <div class="card-actions">
        <button class="play-btn" data-play="${game.id}">▶ Jugar</button>
        <button class="info-button" data-info="${game.id}" aria-label="Información">ⓘ</button>
      </div>
    </article>
  `;
}

function bindCards(root = document) {
  root.querySelectorAll('[data-card-game]').forEach(card => {
    const launch = event => {
      if (event.target.closest('button, a')) return;
      launchGame(card.dataset.cardGame);
    };
    card.addEventListener('click', launch);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        launchGame(card.dataset.cardGame);
      }
    });
    card.addEventListener('pointerenter', () => {
      const game = byId.get(card.dataset.cardGame);
      if (game?.runtimeScript) loadScript(game.runtimeScript).catch(() => {});
    }, { once: true });
  });

  root.querySelectorAll('[data-play]').forEach(button => {
    button.addEventListener('click', () => launchGame(button.dataset.play));
  });

  root.querySelectorAll('[data-favorite]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      toggleFavorite(button.dataset.favorite);
    });
  });

  root.querySelectorAll('[data-info]').forEach(button => {
    button.addEventListener('click', () => {
      const game = byId.get(button.dataset.info);
      if (!game) return;
      const source = game.source?.path ? ` · ${game.source.path}` : '';
      const license = game.source?.license ? ` · ${game.source.license}` : '';
      showToast(`${kindLabel(game)}${source}${license}`);
    });
  });
}

function renderCollection(target, games, compact = false) {
  const filtered = games.filter(game => categoryMatches(game, currentFilter));
  target.innerHTML = filtered.length
    ? filtered.map(game => gameCard(game, compact)).join('')
    : '<div class="empty-state">No hay juegos en este filtro todavía. Prueba otra categoría ✨</div>';
  bindCards(target);
}

function featuredGames() {
  const preferred = [
    'aurora-sky-islands',
    'michelle-butterfly-quest',
    'sisters-crystal-arena',
    'meteor-dodge-godot',
    'godot-rpg-original',
    'godot-isometric-original',
    'star-paddle',
    'crystal-breaker',
  ];
  return preferred.map(id => byId.get(id)).filter(Boolean);
}

function renderAll() {
  renderCollection(dom.firstParty, firstPartyGames.map(game => byId.get(game.id)).filter(Boolean));
  renderCollection(dom.featured, featuredGames());
  renderCollection(dom.clone, cloneGames.map(game => byId.get(game.id)).filter(Boolean));
  renderCollection(dom.upstream, upstreamGames.map(game => byId.get(game.id)).filter(Boolean));
  renderCollection(dom.retro, retroGames.map(game => byId.get(game.id)).filter(Boolean));

  document.querySelectorAll('.filter-chip').forEach(button => {
    button.classList.toggle('active', button.dataset.filter === currentFilter);
  });

  dom.favoritesButton.setAttribute('aria-pressed', String(currentFilter === 'favorite'));
  dom.favoritesButton.textContent = currentFilter === 'favorite' ? '♥' : '♡';
  renderRecent();
}

function renderRecent() {
  const games = recentIds().map(id => byId.get(id)).filter(Boolean).slice(0, 6);
  dom.recentSection.hidden = games.length === 0;
  if (!games.length) {
    dom.recent.innerHTML = '';
    return;
  }
  dom.recent.innerHTML = games.map(game => gameCard(game, true)).join('');
  bindCards(dom.recent);
}

function updateContinueButton() {
  const id = recentIds()[0];
  const game = id ? byId.get(id) : null;
  dom.continueButton.hidden = !game;
  if (game) dom.continueButton.textContent = `▶ Continuar ${game.title}`;
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

function startSession(game) {
  activeSession = {
    gameId: game.id,
    title: game.title,
    startedAt: new Date().toISOString(),
    feedback: null,
    source: game.source?.path || 'opsly-original',
    kind: game.kind,
  };
}

function finishSession(reason) {
  if (!activeSession) return;

  let score = null;
  try {
    score = runtime?.getScore?.() ?? null;
  } catch {}

  const endedAt = new Date();
  const items = readJson(STORAGE.playtests, []);
  items.unshift({
    ...activeSession,
    endedAt: endedAt.toISOString(),
    durationSeconds: Math.max(
      0,
      Math.round((endedAt.getTime() - new Date(activeSession.startedAt).getTime()) / 1000)
    ),
    score,
    reason,
  });
  writeJson(STORAGE.playtests, items.slice(0, 200));
  activeSession = null;
}

function setTheaterVisible(visible) {
  if (visible) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dom.catalog.setAttribute('aria-hidden', 'true');
    dom.theater.hidden = false;
  } else {
    document.body.style.overflow = previousBodyOverflow;
    dom.catalog.removeAttribute('aria-hidden');
    dom.theater.hidden = true;
  }
}

function updateActiveFavorite() {
  if (!activeGame) return;
  const favorite = isFavorite(activeGame.id);
  dom.activeFavorite.textContent = favorite ? '♥' : '♡';
  dom.activeFavorite.classList.toggle('active', favorite);
  dom.activeFavorite.setAttribute('aria-pressed', String(favorite));
}

async function launchGame(id) {
  const game = byId.get(id);
  if (!game) return;

  if (activeGame) finishSession('switched');

  runtime?.stop?.();
  runtime = null;
  dom.frame.src = 'about:blank';
  dom.frame.hidden = true;
  dom.canvas.hidden = true;
  dom.touch.hidden = true;
  dom.loading.hidden = false;
  dom.feedbackNote.textContent = '';

  activeGame = game;
  startSession(game);
  rememberRecent(game.id);

  dom.title.textContent = game.title;
  dom.description.textContent = game.description;
  dom.icon.textContent = game.icon || '🎮';
  updateActiveFavorite();
  setTheaterVisible(true);
  updateOrientationHint();

  if (game.kind === 'upstream' || game.kind === 'first-party') {
    dom.frame.hidden = false;
    dom.touch.hidden = true;

    const onLoad = () => {
      dom.loading.hidden = true;
      dom.frame.focus?.();
      dom.frame.removeEventListener('load', onLoad);
    };
    dom.frame.addEventListener('load', onLoad);
    dom.frame.src = game.playUrl;
    setTimeout(() => {
      if (!dom.frame.hidden) dom.loading.hidden = true;
    }, 8000);
    return;
  }

  dom.canvas.hidden = false;
  dom.touch.hidden = false;

  try {
    if (game.runtimeScript) {
      await loadScript(game.runtimeScript);
      const factory = window.AstralCloneLabRuntimes?.[game.id];
      if (!factory) throw new Error('runtime-not-registered');
      runtime = factory.create(dom.canvas);
    } else {
      runtime = window.AstralRetroRuntime.create(dom.canvas, game.id);
    }
    dom.loading.hidden = true;
  } catch (error) {
    dom.loading.hidden = true;
    dom.feedbackNote.textContent = '🚧 Este juego no cargó. Volvamos y probemos otro.';
    console.error(error);
  }
}

function closeGame(reason = 'closed') {
  finishSession(reason);
  runtime?.stop?.();
  runtime = null;
  dom.frame.src = 'about:blank';
  dom.frame.hidden = true;
  dom.canvas.hidden = false;
  activeGame = null;
  setTheaterVisible(false);
  renderRecent();
}

function randomGame() {
  const mobileLike = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;
  const filtered = allGames.filter(game => categoryMatches(game, currentFilter));
  const mobilePool = mobileLike ? filtered.filter(game => game.touchReady) : filtered;
  const pool = mobilePool.length ? mobilePool : (filtered.length ? filtered : allGames);
  if (!pool.length) return;
  const game = pool[Math.floor(Math.random() * pool.length)];
  launchGame(game.id);
}

function setControl(name, value) {
  runtime?.setControl?.(name, value);
  if (value && navigator.vibrate) navigator.vibrate(8);
}

function updateOrientationHint() {
  if (!activeGame || activeGame.kind === 'upstream' || activeGame.kind === 'first-party') {
    dom.rotateHint.hidden = true;
    return;
  }
  const portrait = window.innerHeight > window.innerWidth;
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 700;
  dom.rotateHint.hidden = !(portrait && smallScreen);
}

function loadIdeas() {
  return readJson(STORAGE.ideas, []);
}

function saveIdeas(items) {
  writeJson(STORAGE.ideas, items);
  renderIdeas();
}

function renderIdeas() {
  const items = loadIdeas();
  dom.ideas.innerHTML = items.length
    ? items.slice(0, 12).map(item => `
      <div class="idea">
        <div>
          <strong>${item.title}</strong><br>
          <small>Base: ${item.sourceTitle} · ${new Date(item.createdAt).toLocaleDateString()}</small>
        </div>
        <small>${item.status}</small>
      </div>
    `).join('')
    : '<div class="idea"><small>Las ideas que creen mientras juegan aparecerán aquí ✨</small></div>';
}

let toastTimer = null;
function showToast(message) {
  let toast = document.querySelector('#games-lab-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'games-lab-toast';
    toast.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:max(24px, env(safe-area-inset-bottom))',
      'transform:translateX(-50%)',
      'z-index:200',
      'max-width:min(92vw,760px)',
      'padding:12px 16px',
      'border-radius:14px',
      'background:rgba(14,18,38,.96)',
      'border:1px solid rgba(180,190,255,.2)',
      'box-shadow:0 18px 55px rgba(0,0,0,.35)',
      'color:#e8ecff',
      'font-size:12px',
      'text-align:center',
      'backdrop-filter:blur(16px)',
    ].join(';');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

document.querySelectorAll('.filter-chip').forEach(button => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter || 'all';
    renderAll();
  });
});

dom.favoritesButton.addEventListener('click', () => {
  currentFilter = currentFilter === 'favorite' ? 'all' : 'favorite';
  renderAll();
});

document.querySelector('#surprise-game').addEventListener('click', randomGame);
document.querySelector('#surprise-top').addEventListener('click', randomGame);

dom.continueButton.addEventListener('click', () => {
  const id = recentIds()[0];
  if (id) launchGame(id);
});

document.querySelector('#close-game').addEventListener('click', () => closeGame('closed'));

dom.activeFavorite.addEventListener('click', () => {
  if (!activeGame) return;
  const nowFavorite = toggleFavorite(activeGame.id);
  showToast(nowFavorite ? '❤️ Guardado en favoritos' : 'Quitado de favoritos');
});

document.querySelector('#retry-game').addEventListener('click', () => {
  if (activeGame) launchGame(activeGame.id);
});

document.querySelector('#next-game').addEventListener('click', () => {
  const filtered = allGames.filter(game => categoryMatches(game, currentFilter));
  const pool = filtered.length ? filtered : allGames;
  if (!pool.length) return;
  const currentIndex = activeGame ? pool.findIndex(game => game.id === activeGame.id) : -1;
  const next = pool[(currentIndex + 1 + pool.length) % pool.length];
  if (next) launchGame(next.id);
});

document.querySelector('#fullscreen-game').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await dom.stage.requestFullscreen();
    if (screen.orientation?.lock && window.innerWidth < 900) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  } catch {
    showToast('Pantalla completa no está disponible en este dispositivo.');
  }
});

document.querySelectorAll('[data-control]').forEach(button => {
  const control = button.dataset.control;

  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    setControl(control, true);
  });

  const release = event => {
    event.preventDefault();
    setControl(control, false);
  };

  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
});

window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !dom.theater.hidden) {
    closeGame('escape');
    return;
  }
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') setControl('left', true);
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') setControl('right', true);
  if (event.key === ' ' || event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
    setControl('action', true);
  }
});

window.addEventListener('keyup', event => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') setControl('left', false);
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') setControl('right', false);
  if (event.key === ' ' || event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
    setControl('action', false);
  }
});

document.querySelectorAll('[data-feedback]').forEach(button => {
  button.addEventListener('click', () => {
    if (!activeGame) return;
    const type = button.dataset.feedback;
    if (activeSession) activeSession.feedback = type;

    if (type === 'love') {
      setFavorite(activeGame.id, true);
      dom.feedbackNote.textContent = '❤️ Guardado. Este sube en la lista.';
      return;
    }

    if (type === 'meh') {
      dom.feedbackNote.textContent = '🤔 Guardado. Después vemos qué cambiar.';
      return;
    }

    const defaultName = activeGame.title + ' · Astral Remix';
    const name = window.prompt('¿Cómo llamarían su versión?', defaultName);
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
      copyPolicy: 'mechanic-only-original-expression-required',
    });
    saveIdeas(ideas);
    dom.feedbackNote.textContent = '✨ Idea guardada. Después podemos convertirla en prototipo.';
  });
});

document.querySelector('#export-playtests').addEventListener('click', () => {
  const blob = new Blob(
    [JSON.stringify(readJson(STORAGE.playtests, []), null, 2)],
    { type: 'application/json' }
  );
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

window.addEventListener('resize', updateOrientationHint);
window.addEventListener('orientationchange', updateOrientationHint);

window.addEventListener('pagehide', () => {
  if (activeSession) finishSession('pagehide');
});

renderAll();
renderIdeas();
updateContinueButton();
