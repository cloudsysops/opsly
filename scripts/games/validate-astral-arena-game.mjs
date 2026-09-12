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
  'apps/game-astral-arena/scenes/mode_hub.tscn',
  'apps/game-astral-arena/scenes/world_2d.tscn',
  'apps/game-astral-arena/scenes/hybrid_battle_lab.tscn',
  'apps/game-astral-arena/scenes/quick_play.tscn',
  'apps/game-astral-arena/src/mode_hub.gd',
  'apps/game-astral-arena/src/world_2d.gd',
  'apps/game-astral-arena/src/hybrid_battle_lab.gd',
  'apps/game-astral-arena/src/quick_play.gd',
  'apps/game-astral-arena/src/battle_view_2d.gd',
  'apps/game-astral-arena/src/battle_view_3d.gd',
  'apps/game-astral-arena/src/runtime/battle_runtime.gd',
  'apps/game-astral-arena/generated/game-content.pack.json',
  'apps/game-astral-arena/web/Caddyfile',
  'apps/game-astral-arena/web/Dockerfile',
  'scripts/games/deploy-astral-arena-web-vps.sh',
  'scripts/games/package-astral-arena-windows.sh',
  'scripts/games/render-astral-steampipe.mjs',
  'tools/steam/astral-arena/app_build.vdf.template',
  'tools/steam/astral-arena/depot_build_windows.vdf.template',
  'apps/game-astral-arena/src/adapters/steam_adapter.gd',
  'config/games/astral-arena-steam-store.json',
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

  const modes = new Set((pack.presentation_modes?.modes ?? []).map((mode) => mode.presentation));
  for (const mode of ['2D', '3D', 'HYBRID']) {
    if (!modes.has(mode)) fail(`content pack missing presentation mode ${mode}`);
  }

  if (!pack.battle?.ruleset?.presentationModes?.includes('2D') ||
      !pack.battle?.ruleset?.presentationModes?.includes('3D')) {
    fail('battle ruleset must support both 2D and 3D presentation');
  }

  const companionFamilies = new Set((pack.companions ?? []).map((companion) => companion.family));
  for (const family of ['REAL_PET', 'FUTURIST_AI', 'PREHISTORIC', 'ASTRAL_DRAGON', 'FANTASY', 'MYTHIC_LEGEND', 'CELESTIAL']) {
    if (!companionFamilies.has(family)) fail(`companion catalog missing family ${family}`);
  }

  const fighterIds = new Set((pack.battle?.fighters ?? []).map((fighter) => fighter.id));
  for (const fighter of ['arena', 'brissa', 'shadow-scout']) {
    if (!fighterIds.has(fighter)) fail(`battle pack missing fighter ${fighter}`);
  }

  if (product.steam?.appId !== null) {
    fail('Steam AppID must remain null in repository config; inject real ID at release time');
  }
  if (product.steam?.depotIds?.windows !== null) {
    fail('Steam Windows DepotID must remain null in repository config; inject real ID at release time');
  }
  if (product.steam?.credentialsInRepo !== false) {
    fail('Steam credentials must never be stored in repository config');
  }
}

const project = fs.readFileSync(path.join(root, 'apps/game-astral-arena/project.godot'), 'utf8');
if (!project.includes('run/main_scene="res://scenes/bootstrap.tscn"')) {
  fail('project.godot must boot through bootstrap.tscn');
}

const bootstrap = fs.readFileSync(path.join(root, 'apps/game-astral-arena/src/bootstrap.gd'), 'utf8');
if (!bootstrap.includes('res://scenes/mode_hub.tscn')) {
  fail('Astral Arena must boot into the 2D/3D/hybrid mode hub');
}
if (!bootstrap.includes('switch_presentation')) {
  fail('hybrid presentation switch input is required');
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

const steamTemplatePaths = [
  'tools/steam/astral-arena/app_build.vdf.template',
  'tools/steam/astral-arena/depot_build_windows.vdf.template',
];
for (const relativePath of steamTemplatePaths) {
  const contents = fs.readFileSync(path.join(root, relativePath), 'utf8');
  if (/\b\d{5,}\b/.test(contents)) {
    fail(`Steam template must not contain hard-coded numeric IDs: ${relativePath}`);
  }
}
