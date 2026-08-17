import { getCharacter, getWorld } from '@intcloudsysops/universe';
import {
  FIRST_PORTAL_ID,
  FIRST_PORTAL_MISSION_ID,
  FIRST_PORTAL_WORLD_ID,
  GAME_SCHEMA_VERSION,
  GUIDE_CHARACTER_ID,
  KNOWLEDGE_FRAGMENT_IPO_ID,
  MAP_FRAGMENT_FIRST_PORTAL_ID,
  THRESHOLD_CHARACTER_ID,
} from './constants.js';
import { MissionSchema } from './schemas.js';
import type { Collectible, Mission } from './types.js';

export function getFirstPortalMission(): Mission {
  getWorld(FIRST_PORTAL_WORLD_ID);
  getCharacter(THRESHOLD_CHARACTER_ID);
  getCharacter(GUIDE_CHARACTER_ID);
  return MissionSchema.parse({
    schemaVersion: GAME_SCHEMA_VERSION,
    id: FIRST_PORTAL_MISSION_ID,
    portalId: FIRST_PORTAL_ID,
    universeWorldId: FIRST_PORTAL_WORLD_ID,
    thresholdCharacterId: THRESHOLD_CHARACTER_ID,
    guideCharacterId: GUIDE_CHARACTER_ID,
    title: 'A small system has stopped working',
    summary:
      'THE TRAVELER opens the first threshold. NØVA asks the Explorer to restore INPUT, PROCESS, and OUTPUT. No prior coding required.',
    steps: [
      {
        id: 'notice-input',
        prompt: 'Find what enters the system.',
        kind: 'explore',
      },
      {
        id: 'notice-process',
        prompt: 'Find what transforms that input.',
        kind: 'explore',
      },
      {
        id: 'notice-output',
        prompt: 'Find what the system is supposed to produce.',
        kind: 'explore',
      },
      {
        id: 'connect-ipo',
        prompt: 'Connect INPUT → PROCESS → OUTPUT.',
        kind: 'connect',
      },
    ],
  });
}

export const FIRST_PORTAL_COLLECTIBLES: Collectible[] = [
  {
    schemaVersion: GAME_SCHEMA_VERSION,
    id: KNOWLEDGE_FRAGMENT_IPO_ID,
    family: 'knowledge-fragment',
    name: 'Systems Fragment',
    knowledge: 'INPUT, PROCESS, and OUTPUT are how a small system stays alive.',
    gameUse: 'Reveals the next simple connection on THE MAP.',
    narrative: 'Recovered from a quiet workshop just beyond the first threshold.',
  },
  {
    schemaVersion: GAME_SCHEMA_VERSION,
    id: MAP_FRAGMENT_FIRST_PORTAL_ID,
    family: 'map-fragment',
    name: 'First Map Fragment',
    knowledge: 'The map is still being drawn.',
    gameUse: 'Makes one more portal outline visible.',
    narrative: 'A gold fragment Echo might recognize later. Not a prophecy.',
  },
];
