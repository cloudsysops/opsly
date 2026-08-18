export const PLAY_SCHEMA_VERSION = '1.1.0';
export const LEGACY_PLAY_SCHEMA_VERSION = '1.0.0';
export const PLAY_TENANT_SLUG = 'opsly';
export const STORAGE_KEY = 'opsly.universe.player.v1';
export const LEGACY_STORAGE_KEY = 'opsly.universe.first-portal.v1';

export const PLAY_SCREENS = [
  'title',
  'explorer',
  'nexus',
  'dialogue',
  'portal',
  'complete',
  'wild',
  'maya',
  'first-bit',
  'connection',
  'bit-card',
] as const;

export const AVATAR_VARIANTS = ['ring', 'spark', 'wave'] as const;

export const FORBIDDEN_EXPLORER_FIELDS = [
  'email',
  'phone',
  'surname',
  'school',
  'age',
  'location',
] as const;

export const IPO_NODE_LABELS = {
  'node-input': { role: 'INPUT', label: 'Sensor' },
  'node-process': { role: 'PROCESS', label: 'Controller' },
  'node-output': { role: 'OUTPUT', label: 'Light' },
} as const;

export const WILD_CHOICE_LABELS = {
  observe: 'Observe',
  approach: 'Approach slowly',
  'build-help': 'Build a brace',
  'ask-maya': 'Ask Maya',
} as const;

export const LOCKED_PORTALS = [
  { id: 'move', name: 'MOVE', status: 'locked' as const },
  { id: 'future', name: 'FUTURE', status: 'locked' as const },
];
