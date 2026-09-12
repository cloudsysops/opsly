import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ASTRAL_DUEL_FIGHTERS,
  ASTRAL_DUEL_RULESET,
  CYBER_BATTLES,
  GAME_MODE_BLUEPRINT,
  TECHNOLIA_BUILDINGS,
  TECHNOLIA_STARTING_RESOURCES,
  TECHNOLIA_TECH_TREE,
  getAstralArenaMission,
  missionById,
} from '@intcloudsysops/game-core';
import { getCharacter, getWorld } from '@intcloudsysops/universe';

const ROOT = path.resolve(import.meta.dirname, '../..');
const PRODUCT_CONFIG = path.join(ROOT, 'config/games/astral-arena.json');
const OUTPUT = path.join(ROOT, 'apps/game-astral-arena/generated/game-content.pack.json');

const product = JSON.parse(await fs.readFile(PRODUCT_CONFIG, 'utf8')) as {
  id: string;
  title: string;
  firstPlayable: {
    storyMissions: string[];
    technolia: {
      eras: string[];
      requiredBuildings: string[];
      requiredTechnologies: string[];
    };
    cyberArena: string[];
    learningArcade: string[];
  };
};

const characterIds = [
  'arena',
  'brissa',
  'orion-shepherd',
  'aurora-unicorn',
  'nx-7',
] as const;

const world = getWorld('astral-arena');
const characters = characterIds.map((id) => {
  const character = getCharacter(id);
  return {
    id: character.id,
    name: character.name,
    role: character.role,
    abilities: character.abilities,
    palette: character.visualIdentity.primaryPalette,
    symbols: character.visualIdentity.symbols,
  };
});

const missions = product.firstPlayable.storyMissions.map((id) => getAstralArenaMission(id));
const buildingIds = new Set(product.firstPlayable.technolia.requiredBuildings);
const technologyIds = new Set(product.firstPlayable.technolia.requiredTechnologies);

const pack = {
  schema_version: 1,
  game_slug: product.id,
  title: product.title,
  generated_from: {
    universe_world: world.id,
    product_config: 'config/games/astral-arena.json',
    mission_owner: '@intcloudsysops/game-core',
    canon_owner: '@intcloudsysops/universe',
  },
  build_profile: 'steam-vertical-slice',
  world: {
    id: world.id,
    name: world.name,
    description: world.description,
    starting_location: 'crystal-temple',
  },
  characters,
  missions,
  technolia: {
    starting_era: product.firstPlayable.technolia.eras[0],
    starting_resources: TECHNOLIA_STARTING_RESOURCES,
    first_buildings: TECHNOLIA_BUILDINGS.filter((item) => buildingIds.has(item.id)),
    first_technologies: TECHNOLIA_TECH_TREE.filter((item) => technologyIds.has(item.id)),
  },
  cyber_arena: CYBER_BATTLES.filter((item) =>
    product.firstPlayable.cyberArena.includes(item.id),
  ),
  learning_arcade: product.firstPlayable.learningArcade.map((id) => missionById(id)),
  presentation_modes: GAME_MODE_BLUEPRINT,
  battle: {
    ruleset: ASTRAL_DUEL_RULESET,
    fighters: ASTRAL_DUEL_FIGHTERS,
    first_encounter: {
      player: ['arena', 'brissa'],
      opponent: ['shadow-scout'],
    },
  },
};

await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await fs.writeFile(OUTPUT, JSON.stringify(pack, null, 2) + '\n', 'utf8');
console.log(`Wrote ${path.relative(ROOT, OUTPUT)}`);
