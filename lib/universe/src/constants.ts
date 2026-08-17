export const CANON_VERSION = '1.0';
export const PROMPT_VERSION = '1.0';
export const MODULE_ID = '@intcloudsysops/universe';

export const GROUP_TARGET = 'group';
export const EVERYONE_TARGET = 'everyone';

export const VIRTUAL_RELATIONSHIP_TARGETS = [GROUP_TARGET, EVERYONE_TARGET] as const;

export type VirtualRelationshipTarget = (typeof VIRTUAL_RELATIONSHIP_TARGETS)[number];

export const STORY_BEATS = [
  'HOOK',
  'DISCOVERY',
  'CONFLICT',
  'EXPLANATION',
  'RESOLUTION',
  'LESSON',
  'CTA',
] as const;

export type StoryBeat = (typeof STORY_BEATS)[number];

export const PROMPT_MODALITIES = [
  'image',
  'video',
  'dialogue',
  'story',
  'thumbnail',
] as const;

export type PromptModality = (typeof PROMPT_MODALITIES)[number];
