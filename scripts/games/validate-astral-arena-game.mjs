import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

function fail(message) {
  console.error('Astral Arena validation failed:', message);
  process.exitCode = 1;
}

function readJson(relativePath) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    fail(`missing ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(absolute, 'utf8'));
  } catch (error) {
    fail(`invalid JSON in ${relativePath}: ${error.message}`);
    return null;
  }
}

const requiredFiles = [
  'apps/game-astral-arena/project.godot',
  'apps/game-astral-arena/export_presets.cfg',
  'apps/game-astral-arena/scenes/bootstrap.tscn',
  'apps/game-astral-arena/scenes/crystal_temple.tscn',
  'apps/game-astral-arena/src/bootstrap.gd',
  'apps/game-astral-arena/src/player_controller.gd',
  'apps/game-astral-arena/src/crystal_temple.gd',
  'apps/game-astral-arena/generated/game-content.pack.json',
  'apps/game-astral-arena/web/Caddyfile',
  'apps/game-astral-arena/web/Dockerfile',
  'scripts/games/deploy-astral-arena-web-vps.sh',
];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) fail(`missing ${relativePath}`);
}

const product = readJson('config/games/astral-arena.json');
const pack = readJson('apps/game-astral-arena/generated/game-content.pack.json');

if (product && pack) {
  if (pack.schema_version !== 1) fail('content pack schema_version must be 1');
  if (pack.game_slug !== product.id) fail('content pack game_slug must match product id');

  const missionIds = new Set((pack.missions ?? []).map((mission) => mission.id));
  for (const missionId of product.firstPlayable?.storyMissions ?? []) {
    if (!missionIds.has(missionId)) fail(`content pack missing story mission ${missionId}`);
  }

  const characterIds = new Set((pack.characters ?? []).map((character) => character.id));
  for (const required of ['arena', 'brissa', 'orion-shepherd', 'aurora-unicorn', 'nx-7']) {
    if (!characterIds.has(required)) fail(`content pack missing character ${required}`);
  }

  if (product.steam?.appId !== null) {
    fail('Steam AppID must remain null in repository config; inject real ID at release time');
  }
}

const project = fs.readFileSync(path.join(root, 'apps/game-astral-arena/project.godot'), 'utf8');
if (!project.includes('run/main_scene="res://scenes/bootstrap.tscn"')) {
  fail('project.godot must boot through bootstrap.tscn');
}

const exportPreset = fs.readFileSync(
  path.join(root, 'apps/game-astral-arena/export_presets.cfg'),
  'utf8',
);
if (!exportPreset.includes('platform="Windows Desktop"')) {
  fail('Windows Desktop export preset is required');
}
if (!exportPreset.includes('name="Web"') || !exportPreset.includes('platform="Web"')) {
  fail('Web export preset is required');
}
if (!exportPreset.includes('variant/thread_support=false')) {
  fail('Web preview must remain single-threaded unless hosting headers are reviewed');
}

if (!process.exitCode) {
  console.log('Astral Arena game product validation: OK');
}
