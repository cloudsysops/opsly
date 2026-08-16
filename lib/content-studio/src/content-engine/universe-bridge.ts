/**
 * Content OS consumes @intcloudsysops/universe. Universe never imports this package.
 * Character identity, lore, and Visual DNA live only in the Universe module.
 */
import {
  contentAgentAdapter,
  getCharactersForChannel,
  getCharactersForTopic,
  getTenantAdaptation,
  imageAgentAdapter,
  listCharacters,
  listWorlds,
  storyAgentAdapter,
  universe,
  videoAgentAdapter,
  type ComposedCharacterContext,
  type UniverseCharacter,
} from '@intcloudsysops/universe';
import {
  contentPortalValues,
  type ContentChannel,
  type ContentCharacterDefinition,
  type ContentPortal,
  type ContentProjectEnvelope,
  type UniverseProjectBinding,
} from './types.js';

export type { UniverseProjectBinding };

const PORTAL_SET = new Set<string>(contentPortalValues);

const CHANNEL_FEATURED_FALLBACK: Record<ContentChannel, readonly string[]> = {
  bitsitos: ['nova'],
  splashitos: ['orion', 'kai', 'wavo'],
  peskids: ['orion', 'kai', 'wavo'],
  'opsly-universe': ['traveler', 'nova', 'echo'],
};

function worldIdToPortal(worldId: string): ContentPortal | null {
  const upper = worldId.trim().toUpperCase();
  if (!PORTAL_SET.has(upper)) return null;
  return upper as ContentPortal;
}

export function tenantKeyForChannel(channel: ContentChannel): string | undefined {
  if (channel === 'peskids' || channel === 'splashitos') return 'peskids';
  if (channel === 'opsly-universe') return 'opsly-universe';
  return undefined;
}

export function portalsForCharacter(character: UniverseCharacter): ContentPortal[] {
  const portals = listWorlds()
    .filter((world) => world.allowedCharacters.includes(character.id))
    .map((world) => worldIdToPortal(world.id))
    .filter((portal): portal is ContentPortal => portal !== null);
  return [...new Set(portals)];
}

export function projectContentCharacter(character: UniverseCharacter): ContentCharacterDefinition {
  return {
    id: character.id,
    name: character.name,
    role: character.role,
    portals: portalsForCharacter(character),
  };
}

export function loadUniverseCharacters(): ContentCharacterDefinition[] {
  return listCharacters().map(projectContentCharacter);
}

function uniqueIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered;
}

export function featuredCharacterIdsForChannel(channel: ContentChannel): string[] {
  const tenant = getTenantAdaptation(tenantKeyForChannel(channel));
  const ids = tenant ? [...tenant.preferredCharacterIds] : [...CHANNEL_FEATURED_FALLBACK[channel]];
  if (channel === 'peskids' || channel === 'splashitos') {
    ids.push('wavo');
  }
  return uniqueIds(ids);
}

export function charactersForChannel(channel: ContentChannel): string[] {
  return featuredCharacterIdsForChannel(channel).map((id) => universe.getCharacter(id).name);
}

export function allowedCharactersForChannel(channel: ContentChannel): UniverseCharacter[] {
  const fromChannel = getCharactersForChannel(channel);
  if (fromChannel.length > 0) return fromChannel;
  return featuredCharacterIdsForChannel(channel).map((id) => universe.getCharacter(id));
}

function audienceForProject(audience: string): 'kids' | 'family' | 'general' {
  const key = audience.toLowerCase();
  if (key.includes('kid') || key.includes('niñ') || key.includes('child')) return 'kids';
  if (key.includes('family') || key.includes('familia')) return 'family';
  return 'general';
}

function bindingFromContext(context: ComposedCharacterContext): UniverseProjectBinding {
  return {
    canonVersion: context.canonVersion,
    promptVersion: context.promptVersion,
    characterIds: context.characters.map((character) => character.id),
    characterNames: context.characters.map((character) => character.name),
    worldId: context.world?.id ?? null,
    topic: context.topic,
    tenant: context.tenant?.tenant ?? null,
    storyPrompt: context.promptContext.story,
    imagePrompt: context.promptContext.image,
    videoPrompt: context.promptContext.video,
    agentInputs: {
      story: storyAgentAdapter.toAgentInput(context),
      image: imageAgentAdapter.toAgentInput(context),
      video: videoAgentAdapter.toAgentInput(context),
      content: contentAgentAdapter.toAgentInput(context),
    },
  };
}

export function composeUniverseForProject(envelope: ContentProjectEnvelope): UniverseProjectBinding {
  const channel = envelope.project.channel;
  const tenant = tenantKeyForChannel(channel);
  const topic =
    envelope.project.learningGoal ?? envelope.project.question ?? envelope.project.title;
  const characterIds = featuredCharacterIdsForChannel(channel);
  const context = universe.getContext({
    characters: characterIds,
    topic,
    audience: audienceForProject(envelope.project.audience),
    tenant,
    channel,
    format: envelope.project.format,
  });
  return bindingFromContext(context);
}

export function suggestCharactersForTopic(topic: string, channel?: ContentChannel): string[] {
  const fromTopic = getCharactersForTopic(topic);
  if (fromTopic.length === 0) {
    return channel ? featuredCharacterIdsForChannel(channel) : ['nova'];
  }
  if (!channel) return fromTopic.map((character) => character.id);
  const allowed = new Set(getCharactersForChannel(channel).map((character) => character.id));
  const filtered = allowed.size === 0 ? fromTopic : fromTopic.filter((character) => allowed.has(character.id));
  return (filtered.length > 0 ? filtered : fromTopic).map((character) => character.id);
}

export function novaCanonName(): string {
  return universe.getCharacter('nova').name;
}
