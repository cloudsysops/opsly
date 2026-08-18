import { assertCanonIntegrity } from './validate.js';
import {
  getChildSafetyPrinciples,
  getFoundation,
  getHistory,
  getNonNegotiables,
  getPrinciples,
  getVision,
} from './foundation.js';
import { composeCharacterContext, getContext } from './composer.js';
import {
  getCharacter,
  getCharacterBySlug,
  getCharacterPrompt,
  getCharacterRelationships,
  getCharactersForAudience,
  getCharactersForChannel,
  getCharactersForTopic,
  getLore,
  getRelationship,
  getUniverseStyle,
  getWorld,
  listCharacters,
  listRelationships,
  listWorlds,
  searchCharacters,
} from './registry.js';
import {
  buildDialoguePrompt,
  buildImagePrompt,
  buildStoryPrompt,
  buildThumbnailPrompt,
  buildVideoPrompt,
} from './prompts.js';
import { composeStory } from './story.js';
import { serializeCanon, writeCanonJson } from './serialize.js';
import { CANON_VERSION, PROMPT_VERSION } from './constants.js';
import { evaluateUniverseChangeGuard, isUniverseChangeAllowed } from './guard.js';

assertCanonIntegrity();

export const universe = {
  getFoundation,
  getVision,
  getPrinciples,
  getHistory,
  getNonNegotiables,
  getChildSafetyPrinciples,
  evaluateUniverseChangeGuard,
  isUniverseChangeAllowed,
  getCharacter,
  getCharacterBySlug,
  listCharacters,
  searchCharacters,
  getCharactersForTopic,
  getCharactersForAudience,
  getCharactersForChannel,
  getCharacterPrompt,
  getCharacterRelationships,
  getRelationship,
  getWorld,
  listWorlds,
  listRelationships,
  getLore,
  getUniverseStyle,
  getContext,
  composeCharacterContext,
  composeStory,
  buildImagePrompt,
  buildVideoPrompt,
  buildStoryPrompt,
  buildDialoguePrompt,
  buildThumbnailPrompt,
  serializeCanon,
  writeCanonJson,
  canonVersion: CANON_VERSION,
  promptVersion: PROMPT_VERSION,
};

export {
  CANON_VERSION,
  PROMPT_VERSION,
  MODULE_ID,
  STORY_BEATS,
  PROMPT_MODALITIES,
} from './constants.js';
export {
  getFoundation,
  getVision,
  getPrinciples,
  getHistory,
  getNonNegotiables,
  getChildSafetyPrinciples,
} from './foundation.js';
export {
  UniverseError,
  UniverseUnknownCharacterError,
  UniverseUnknownWorldError,
  UniverseCanonMutationError,
} from './errors.js';
export * from './types.js';
export * from './schemas.js';
export {
  getCharacter,
  getCharacterBySlug,
  listCharacters,
  searchCharacters,
  getCharactersForTopic,
  getCharactersForAudience,
  getCharactersForChannel,
  getCharacterPrompt,
  getCharacterRelationships,
  getRelationship,
  getWorld,
  listWorlds,
  listRelationships,
  getLore,
  getUniverseStyle,
} from './registry.js';
export { composeCharacterContext, getContext } from './composer.js';
export {
  buildDialoguePrompt,
  buildImagePrompt,
  buildScenePrompts,
  buildStoryPrompt,
  buildThumbnailPrompt,
  buildVideoPrompt,
} from './prompts.js';
export { composeStory } from './story.js';
export { getTenantAdaptation, TENANT_ADAPTATIONS } from './tenant.js';
export { serializeCanon, writeCanonJson } from './serialize.js';
export { assertCanonIntegrity } from './validate.js';
export { evaluateUniverseChangeGuard, isUniverseChangeAllowed } from './guard.js';
export {
  UNIVERSE_CAPABILITIES,
  contentAgentAdapter,
  imageAgentAdapter,
  mcpToolContract,
  storyAgentAdapter,
  videoAgentAdapter,
} from './adapters/index.js';
export { collectVisualDna, formatVisualDnaBlock, getVisualDna } from './visual/dna.js';
export { UNIVERSE_STYLE } from './visual/universe-style.js';
export { CANONICAL_CHARACTERS } from './characters/index.js';
