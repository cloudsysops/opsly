import { CANON_VERSION, PROMPT_VERSION } from './constants.js';
import { UniverseCanonMutationError } from './errors.js';
import {
  characterVersionMap,
  getCharacter,
  getCharacterRelationships,
  getCharactersForTopic,
  getUniverseStyle,
  getWorld,
  listRelationships,
} from './registry.js';
import { ComposeContextInputSchema } from './schemas.js';
import type {
  ComposedCharacterContext,
  ComposeContextInput,
  UniverseCharacter,
  UniverseWorld,
} from './types.js';
import { cloneCharacterForTenant, getTenantAdaptation } from './tenant.js';
import { GLOBAL_SAFETY_RULES, GLOBAL_STORY_RULES } from './visual/universe-style.js';
import { collectVisualDna } from './visual/dna.js';

const WORLD_FOR_TOPIC: Record<string, string> = {
  swimming: 'move',
  float: 'move',
  floating: 'move',
  flotamos: 'move',
  sport: 'move',
  animals: 'wild',
  bees: 'wild',
  nature: 'wild',
  science: 'lab',
  technology: 'future',
  robots: 'future',
  ai: 'nexus',
  identity: 'mind',
};

function resolveRequestedIds(input: ComposeContextInput): string[] {
  return [...(input.characterIds ?? []), ...(input.characters ?? [])];
}

function inferWorld(topic: string, tenantWorld?: string): UniverseWorld {
  if (tenantWorld) return getWorld(tenantWorld);
  const key = topic.toLowerCase();
  for (const [token, worldId] of Object.entries(WORLD_FOR_TOPIC)) {
    if (key.includes(token)) return getWorld(worldId);
  }
  return getWorld('nexus');
}

function pickCharacters(input: ComposeContextInput): UniverseCharacter[] {
  const explicit = resolveRequestedIds(input);
  if (explicit.length > 0) {
    return explicit.map((id) => cloneCharacterForTenant(getCharacter(id)));
  }
  const tenant = getTenantAdaptation(input.tenant);
  const override = tenant?.topicOverrides[input.topic.toLowerCase()];
  if (override && override.length > 0) {
    return override.map((id) => cloneCharacterForTenant(getCharacter(id)));
  }
  const fromTopic = getCharactersForTopic(input.topic).map((character) =>
    cloneCharacterForTenant(character),
  );
  if (fromTopic.length > 0) return fromTopic;
  if (tenant) {
    return tenant.preferredCharacterIds.map((id) => cloneCharacterForTenant(getCharacter(id)));
  }
  return [cloneCharacterForTenant(getCharacter('nova'))];
}

function safetyFor(characters: UniverseCharacter[], tenant: ReturnType<typeof getTenantAdaptation>): string[] {
  const prohibited = characters.flatMap((character) =>
    character.narrative.prohibitedTopics.map(
      (topic) => `${character.name}: do not treat as suitable topic: ${topic}`,
    ),
  );
  const tenantRules = tenant
    ? [`Tenant ${tenant.tenant} must not mutate canon.`, tenant.brandFrame]
    : [];
  return [...GLOBAL_SAFETY_RULES, ...GLOBAL_STORY_RULES, ...prohibited, ...tenantRules];
}

export function composeCharacterContext(
  raw: ComposeContextInput,
): ComposedCharacterContext {
  const input = ComposeContextInputSchema.parse(raw);
  const tenant = getTenantAdaptation(input.tenant);
  if (tenant?.mutatesCanon) {
    throw new UniverseCanonMutationError(tenant.tenant);
  }
  const characters = pickCharacters(input);
  const world = input.worldId
    ? getWorld(input.worldId)
    : inferWorld(input.topic, tenant?.defaultWorldId);
  const relationships = listRelationships().filter((edge) => {
    const ids = new Set(characters.map((character) => character.id));
    return (
      (ids.has(edge.from) && ids.has(edge.to)) ||
      (ids.has(edge.from) && (edge.to === 'group' || edge.to === 'everyone'))
    );
  });

  return {
    canonVersion: CANON_VERSION,
    promptVersion: PROMPT_VERSION,
    characterVersions: characterVersionMap(characters),
    characters,
    world,
    visualContext: {
      universeStyle: getUniverseStyle(),
      characterDna: characters.map((character) => ({
        id: character.id,
        dna: character.visualIdentity.dna,
      })),
    },
    personalityContext: characters.map((character) => ({
      id: character.id,
      name: character.name,
      traits: character.personality.traits,
      tone: character.communication.tone,
      catchphrases: character.communication.catchphrases,
      forbiddenPatterns: character.communication.forbiddenPatterns,
    })),
    narrativeRules: [
      ...GLOBAL_STORY_RULES,
      ...characters.map((character) => `${character.name}: ${character.purpose}`),
    ],
    relationships,
    safetyRules: safetyFor(characters, tenant),
    promptContext: {
      image: collectVisualDna(characters),
      video: characters.map((character) => character.promptAnchors.video).join('\n'),
      dialogue: characters
        .map((character) => `${character.name}: ${character.promptAnchors.dialogue}`)
        .join('\n'),
      story: characters.map((character) => character.promptAnchors.story).join('\n'),
      thumbnail: characters.map((character) => character.promptAnchors.thumbnail).join('\n'),
    },
    tenant,
    topic: input.topic,
    audience: input.audience,
    channel: input.channel,
    format: input.format,
    duration: input.duration,
    language: input.language,
  };
}

export function getContext(raw: ComposeContextInput): ComposedCharacterContext {
  return composeCharacterContext(raw);
}

export function getCharacterGraphContext(characterId: string) {
  const character = getCharacter(characterId);
  return {
    character: cloneCharacterForTenant(character),
    relationships: getCharacterRelationships(characterId),
  };
}
