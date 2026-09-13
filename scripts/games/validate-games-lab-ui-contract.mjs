#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const htmlPath = path.join(root, 'apps/game-astral-arena/web/games/index.html');
const appPath = path.join(root, 'apps/game-astral-arena/web/games/app.js');

const [html, app] = await Promise.all([
  fs.readFile(htmlPath, 'utf8'),
  fs.readFile(appPath, 'utf8'),
]);

const requiredIds = [
  'favorites-filter',
  'surprise-top',
  'surprise-game',
  'continue-game',
  'recent-grid',
  'first-party-grid',
  'featured-grid',
  'clone-game-grid',
  'upstream-game-grid',
  'game-grid',
  'game-theater',
  'close-game',
  'retry-game',
  'next-game',
  'active-favorite',
  'fullscreen-game',
  'game-canvas',
  'upstream-frame',
  'stage-loading',
  'rotate-hint',
  'touch-row',
  'feedback-note',
  'export-playtests',
  'export-ideas',
];

const errors = [];

for (const id of requiredIds) {
  const pattern = new RegExp(`id=["']${id}["']`, 'g');
  const matches = html.match(pattern) ?? [];
  if (matches.length !== 1) {
    errors.push(`id:${id}:expected-once:found-${matches.length}`);
  }
}

const requiredHandlers = [
  "document.querySelector('#surprise-game').addEventListener",
  "document.querySelector('#surprise-top').addEventListener",
  "document.querySelector('#close-game').addEventListener",
  "document.querySelector('#retry-game').addEventListener",
  "document.querySelector('#next-game').addEventListener",
  "document.querySelector('#fullscreen-game').addEventListener",
  "document.querySelector('#export-playtests').addEventListener",
  "document.querySelector('#export-ideas').addEventListener",
  "dom.favoritesButton.addEventListener",
  "dom.activeFavorite.addEventListener",
];

for (const handler of requiredHandlers) {
  if (!app.includes(handler)) errors.push(`missing-handler:${handler}`);
}

const filterValues = ['all', 'favorite', 'touch', '2P', 'adventure', 'arcade', 'open-source'];
for (const filter of filterValues) {
  if (!html.includes(`data-filter="${filter}"`)) errors.push(`missing-filter:${filter}`);
}

for (const feedback of ['love', 'meh', 'clone']) {
  if (!html.includes(`data-feedback="${feedback}"`)) errors.push(`missing-feedback:${feedback}`);
}

for (const control of ['left', 'action', 'right']) {
  if (!html.includes(`data-control="${control}"`)) errors.push(`missing-control:${control}`);
}

const buttonTags = [...html.matchAll(/<button\b([^>]*)>/g)].map(match => match[1]);
for (const attrs of buttonTags) {
  const hasId = /\bid=["'][^"']+["']/.test(attrs);
  const hasDeclarativeAction =
    /\bdata-control=["'][^"']+["']/.test(attrs) ||
    /\bdata-feedback=["'][^"']+["']/.test(attrs) ||
    /\bdata-filter=["'][^"']+["']/.test(attrs);

  if (!hasId && !hasDeclarativeAction) {
    errors.push(`dead-static-button:<button${attrs}>`);
  }
}

if (!html.includes('Opsly Games')) errors.push('missing-games-brand');
if (!app.includes("id: 'astral-arena'")) errors.push('missing-astral-arena-first-party-game');
if (!app.includes("playUrl: './astral-arena/'")) errors.push('wrong-astral-arena-route');

for (const dynamicAction of [
  "root.querySelectorAll('[data-play]')",
  "root.querySelectorAll('[data-favorite]')",
  "root.querySelectorAll('[data-info]')",
  "root.querySelectorAll('[data-card-game]')",
]) {
  if (!app.includes(dynamicAction)) errors.push(`missing-dynamic-action:${dynamicAction}`);
}

if (errors.length) {
  console.error('GAMES_LAB_UI_CONTRACT=FAIL');
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log(`GAMES_LAB_UI_CONTRACT=PASS requiredIds=${requiredIds.length}`);
