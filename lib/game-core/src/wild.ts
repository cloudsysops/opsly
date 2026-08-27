import { getBit, getCharacter, getWorld } from '@intcloudsysops/universe';
import {
  BIT_COLLECTIBLE_DEWTHREAD_ID,
  FIRST_BIT_ID,
  GAME_SCHEMA_VERSION,
  MAP_FRAGMENT_WILD_ID,
  WILD_GUIDE_CHARACTER_ID,
  WILD_MISSION_ID,
  WILD_PORTAL_ID,
  WILD_WORLD_ID,
} from './constants.js';
import { MissionSchema } from './schemas.js';
import type { Collectible, Mission } from './types.js';

export const WILD_CHOICE_IDS = ['observe', 'approach', 'build-help', 'ask-maya'] as const;
export type WildChoiceId = (typeof WILD_CHOICE_IDS)[number];

export function getWildMission(): Mission {
  getWorld(WILD_WORLD_ID);
  getCharacter(WILD_GUIDE_CHARACTER_ID);
  getBit(FIRST_BIT_ID);
  return MissionSchema.parse({
    schemaVersion: GAME_SCHEMA_VERSION,
    id: WILD_MISSION_ID,
    portalId: WILD_PORTAL_ID,
    universeWorldId: WILD_WORLD_ID,
    thresholdCharacterId: WILD_GUIDE_CHARACTER_ID,
    guideCharacterId: WILD_GUIDE_CHARACTER_ID,
    title: 'Something small is caught in the canopy',
    summary:
      'Maya does not solve it for you. A shy canopy weaver is snagged in a snapped vine. Connection, not capture.',
    steps: [
      { id: 'notice-stillness', prompt: 'Notice what is moving, and what is stuck.', kind: 'explore' },
      { id: 'choose-approach', prompt: 'Observe, ask Maya, approach, or build a brace.', kind: 'explore' },
      { id: 'ease-the-snag', prompt: 'Help without claiming.', kind: 'create' },
    ],
  });
}

export const WILD_COLLECTIBLES: Collectible[] = [
  {
    schemaVersion: GAME_SCHEMA_VERSION,
    id: BIT_COLLECTIBLE_DEWTHREAD_ID,
    family: 'bit',
    name: 'Dewthread',
    knowledge: 'A being can join you without becoming a prize.',
    gameUse: 'Opens Dewthread’s Bit Card. Not a battle token.',
    narrative: 'The dew-silk loosened. Dewthread chose to stay near.',
  },
  {
    schemaVersion: GAME_SCHEMA_VERSION,
    id: MAP_FRAGMENT_WILD_ID,
    family: 'map-fragment',
    name: 'Wild Map Fragment',
    knowledge: 'Living systems have paths that are not doors.',
    gameUse: 'Marks WILD as a visited region on THE MAP.',
    narrative: 'A seed-ring fragment. Echo might notice the moisture in it later.',
  },
];
