export const GAME_SCHEMA_VERSION = '1.0.0';
export const MODULE_ID = '@intcloudsysops/game-core';

export const FIRST_PORTAL_ID = 'first-portal';
export const FIRST_PORTAL_MISSION_ID = 'first-portal-ipo-001';
export const FIRST_PORTAL_WORLD_ID = 'nexus';
export const THRESHOLD_CHARACTER_ID = 'traveler';
export const GUIDE_CHARACTER_ID = 'nova';
export const WILD_PORTAL_ID = 'wild';
export const WILD_MISSION_ID = 'wild-dewthread-001';
export const WILD_WORLD_ID = 'wild';
export const WILD_GUIDE_CHARACTER_ID = 'maya';
export const FIRST_BIT_ID = 'dewthread';
export const MAP_FRAGMENT_WILD_ID = 'map-fragment-wild';
export const BIT_COLLECTIBLE_DEWTHREAD_ID = 'bit-dewthread';

export const IPO_INPUT_NODE = 'node-input';
export const IPO_PROCESS_NODE = 'node-process';
export const IPO_OUTPUT_NODE = 'node-output';

export const KNOWLEDGE_FRAGMENT_IPO_ID = 'knowledge-fragment-ipo';
export const MAP_FRAGMENT_FIRST_PORTAL_ID = 'map-fragment-first-portal';

export const OBSERVATION_EVENT_TYPES = [
  'session.started',
  'explorer.chosen',
  'portal.entered',
  'mission.started',
  'mission.retried',
  'mission.completed',
  'collectible.earned',
  'map-fragment.earned',
  'challenge.skipped',
  'challenge.returned',
  'bit.encountered',
  'choice.made',
  'bond.connected',
  'card.unlocked',
] as const;

export const FORBIDDEN_EVENT_PREFIXES = [
  'diagnosis.',
  'iq.',
  'destiny.',
  'personality.fixed',
  'career.',
] as const;

export const ALLOWED_PALETTES = [
  'gold-navy',
  'pool-teal',
  'canopy-green',
  'paper-violet',
] as const;
