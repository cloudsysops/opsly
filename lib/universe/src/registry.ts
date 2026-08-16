import { CANONICAL_CHARACTERS } from './characters/index.js';
import {
  EVERYONE_TARGET,
  GROUP_TARGET,
  VIRTUAL_RELATIONSHIP_TARGETS,
  type PromptModality,
} from './constants.js';
import { UniverseUnknownCharacterError, UniverseUnknownWorldError } from './errors.js';
import { CANONICAL_LORE } from './lore/index.js';
import { CANONICAL_RELATIONSHIPS } from './relationships/index.js';
import { UniverseCharacterSchema, UniverseWorldSchema } from './schemas.js';
import type {
  RelationshipEdge,
  SearchCriteria,
  UniverseCharacter,
  UniverseWorld,
} from './types.js';
import { UNIVERSE_STYLE } from './visual/universe-style.js';
import { CANONICAL_WORLDS } from './worlds/index.js';

const TOPIC_INDEX: Record<string, readonly string[]> = {
  swimming: ['orion', 'kai'],
  swim: ['orion', 'kai'],
  float: ['orion', 'kai'],
  floating: ['orion', 'kai'],
  flotamos: ['orion', 'kai'],
  water: ['orion', 'kai', 'wavo'],
  sport: ['orion', 'kai'],
  sports: ['orion', 'kai'],
  training: ['orion', 'kai'],
  technology: ['nova', 'echo', 'traveler'],
  tech: ['nova', 'echo', 'traveler'],
  robots: ['nova', 'echo', 'kai'],
  robot: ['nova', 'echo', 'kai'],
  ai: ['nova', 'echo'],
  animals: ['maya', 'kai'],
  animal: ['maya', 'kai'],
  bees: ['maya', 'kai', 'lyra'],
  nature: ['maya', 'lyra', 'kai'],
  science: ['lyra', 'nova', 'echo'],
  engineering: ['atlas', 'traveler', 'nova'],
  rescue: ['atlas'],
  building: ['atlas', 'traveler', 'nova'],
  infrastructure: ['atlas', 'traveler'],
  identity: ['nova', 'traveler', 'echo'],
};

function hydrateCharacter(character: UniverseCharacter): UniverseCharacter {
  const relationships = CANONICAL_RELATIONSHIPS.filter(
    (edge) =>
      edge.from === character.id ||
      edge.to === character.id ||
      (edge.to === GROUP_TARGET && edge.from === character.id) ||
      (edge.to === EVERYONE_TARGET && edge.from === character.id),
  ).map((edge) => ({
    targetId: edge.from === character.id ? edge.to : edge.from,
    kind: edge.kind,
    description: edge.description,
  }));
  return UniverseCharacterSchema.parse({ ...character, relationships });
}

const characters = CANONICAL_CHARACTERS.map((character) =>
  UniverseCharacterSchema.parse(hydrateCharacter(character)),
);
const worlds = CANONICAL_WORLDS.map((world) => UniverseWorldSchema.parse(world));

const byId = new Map(characters.map((character) => [character.id, character]));
const bySlug = new Map(characters.map((character) => [character.slug, character]));
const worldsById = new Map(worlds.map((world) => [world.id, world]));
const worldsBySlug = new Map(worlds.map((world) => [world.slug, world]));

export function normalizeRef(ref: string): string {
  return ref.trim().toLowerCase().replace(/^the\s+/, '').replace(/ø/g, 'o');
}

function resolveCharacterRef(ref: string): UniverseCharacter | undefined {
  const key = normalizeRef(ref);
  return (
    byId.get(key) ??
    bySlug.get(key) ??
    characters.find(
      (character) =>
        normalizeRef(character.name) === key ||
        character.aliases.some((alias) => normalizeRef(alias) === key),
    )
  );
}

export function getCharacter(id: string): UniverseCharacter {
  const found = resolveCharacterRef(id);
  if (!found) {
    throw new UniverseUnknownCharacterError(id);
  }
  return found;
}

export function getCharacterBySlug(slug: string): UniverseCharacter {
  const found = bySlug.get(normalizeRef(slug)) ?? resolveCharacterRef(slug);
  if (!found) {
    throw new UniverseUnknownCharacterError(slug);
  }
  return found;
}

export function listCharacters(): UniverseCharacter[] {
  return [...characters];
}

export function listWorlds(): UniverseWorld[] {
  return [...worlds];
}

export function getWorld(id: string): UniverseWorld {
  const key = normalizeRef(id);
  const found = worldsById.get(key) ?? worldsBySlug.get(key);
  if (!found) {
    throw new UniverseUnknownWorldError(id);
  }
  return found;
}

export function getUniverseStyle() {
  return UNIVERSE_STYLE;
}

export function getLore() {
  return [...CANONICAL_LORE];
}

export function listRelationships(): RelationshipEdge[] {
  return [...CANONICAL_RELATIONSHIPS];
}

export function getCharacterRelationships(characterId: string): RelationshipEdge[] {
  const character = getCharacter(characterId);
  return CANONICAL_RELATIONSHIPS.filter(
    (edge) =>
      edge.from === character.id ||
      edge.to === character.id ||
      (edge.to === GROUP_TARGET && edge.from === character.id) ||
      (edge.to === EVERYONE_TARGET && edge.from === character.id),
  );
}

export function getRelationship(fromRef: string, toRef: string): RelationshipEdge | null {
  const from = getCharacter(fromRef).id;
  const toKey = normalizeRef(toRef);
  const toIsVirtual = (VIRTUAL_RELATIONSHIP_TARGETS as readonly string[]).includes(toKey);
  const to = toIsVirtual ? toKey : getCharacter(toRef).id;
  return (
    CANONICAL_RELATIONSHIPS.find(
      (edge) =>
        (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from),
    ) ?? null
  );
}

function uniqueCharacters(ids: readonly string[]): UniverseCharacter[] {
  const seen = new Set<string>();
  const result: UniverseCharacter[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(getCharacter(id));
  }
  return result;
}

function topicKey(topic: string): string {
  return normalizeRef(topic).replace(/[^a-z0-9]+/g, ' ').trim();
}

function topicMatches(topic: string, token: string): boolean {
  const key = topicKey(topic);
  if (key === token) return true;
  const words = key.split(' ');
  if (words.includes(token)) return true;
  if (token.length >= 4 && (key.startsWith(token) || token.startsWith(key))) return true;
  return false;
}

export function getCharactersForTopic(topic: string): UniverseCharacter[] {
  const key = topicKey(topic);
  const indexed = new Set<string>();
  for (const [token, ids] of Object.entries(TOPIC_INDEX)) {
    if (topicMatches(key, token)) {
      for (const id of ids) indexed.add(id);
    }
  }
  if (indexed.size > 0) {
    return uniqueCharacters([...indexed]);
  }
  const fromSuitable = characters.filter((character) =>
    [...character.narrative.suitableTopics, ...character.narrative.themes].some((item) =>
      topicMatches(key, topicKey(item)) || topicMatches(topicKey(item), key),
    ),
  );
  return fromSuitable;
}

export function getCharactersForAudience(audience: string): UniverseCharacter[] {
  const key = normalizeRef(audience);
  return characters.filter((character) => {
    if (key === 'kids') return character.content.ageRating === 'kids' || character.content.ageRating === 'all-ages';
    if (key === 'family') {
      return (
        character.content.ageRating === 'family' ||
        character.content.ageRating === 'kids' ||
        character.content.ageRating === 'all-ages'
      );
    }
    return true;
  });
}

export function getCharactersForChannel(channel: string): UniverseCharacter[] {
  const key = normalizeRef(channel);
  return characters.filter((character) =>
    character.content.channels.some((item) => normalizeRef(item) === key),
  );
}

export function searchCharacters(criteria: SearchCriteria): UniverseCharacter[] {
  let pool = characters;
  if (criteria.topic) pool = getCharactersForTopic(criteria.topic);
  if (criteria.audience) {
    const allowed = new Set(getCharactersForAudience(criteria.audience).map((item) => item.id));
    pool = pool.filter((item) => allowed.has(item.id));
  }
  if (criteria.channel) {
    const allowed = new Set(getCharactersForChannel(criteria.channel).map((item) => item.id));
    pool = pool.filter((item) => allowed.has(item.id));
  }
  if (criteria.archetype) {
    const key = topicKey(criteria.archetype);
    pool = pool.filter((item) => topicKey(item.archetype).includes(key));
  }
  if (criteria.query) {
    const key = topicKey(criteria.query);
    pool = pool.filter((item) =>
      [item.id, item.slug, item.name, item.description, item.role, ...item.aliases]
        .join(' ')
        .toLowerCase()
        .includes(key),
    );
  }
  return pool;
}

export function getCharacterPrompt(characterId: string, modality: PromptModality): string {
  const character = getCharacter(characterId);
  return character.promptAnchors[modality];
}

export function characterVersionMap(list: UniverseCharacter[]): Record<string, string> {
  return Object.fromEntries(list.map((character) => [character.id, character.canon.version]));
}

export function assertWorldCharacterAllowed(world: UniverseWorld, characterId: string): boolean {
  return world.allowedCharacters.includes(characterId);
}
