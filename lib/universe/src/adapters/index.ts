import type { ComposedCharacterContext, ComposedStory } from '../types.js';

export interface UniverseAgentAdapter {
  id: string;
  description: string;
  /** Adapters consume universe context. Universe never depends on these agents. */
  consumes: 'composed-context' | 'composed-story';
  toAgentInput(input: ComposedCharacterContext | ComposedStory): Record<string, unknown>;
}

function asContext(input: ComposedCharacterContext | ComposedStory): Record<string, unknown> {
  return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
}

export const storyAgentAdapter: UniverseAgentAdapter = {
  id: 'story-agent',
  description: 'Maps composed universe context into a story-agent envelope. No LLM provider calls.',
  consumes: 'composed-context',
  toAgentInput(input) {
    return {
      agent: 'story',
      canonVersion: 'canonVersion' in input ? input.canonVersion : undefined,
      payload: asContext(input),
    };
  },
};

export const imageAgentAdapter: UniverseAgentAdapter = {
  id: 'image-agent',
  description: 'Receives Visual DNA + scene. Does not invent character identity.',
  consumes: 'composed-context',
  toAgentInput(input) {
    const context = input as ComposedCharacterContext;
    return {
      agent: 'image',
      visualDna: context.visualContext,
      promptContext: context.promptContext.image,
      negatives: context.visualContext.characterDna.flatMap((item) => item.dna.negatives),
    };
  },
};

export const videoAgentAdapter: UniverseAgentAdapter = {
  id: 'video-agent',
  description: 'Receives motion identity + Visual DNA. No render vendor credentials.',
  consumes: 'composed-context',
  toAgentInput(input) {
    const context = input as ComposedCharacterContext;
    return {
      agent: 'video',
      motion: context.characters.map((character) => ({
        id: character.id,
        movement: character.animationIdentity.movement,
      })),
      promptContext: context.promptContext.video,
    };
  },
};

export const contentAgentAdapter: UniverseAgentAdapter = {
  id: 'content-agent',
  description:
    'Content Agent uses the Universe module. The Universe module does not depend on Content Agent, YouTube, or Peskids apps.',
  consumes: 'composed-context',
  toAgentInput(input) {
    const context = input as ComposedCharacterContext;
    return {
      agent: 'content',
      tenant: context.tenant?.tenant ?? null,
      topic: context.topic,
      format: context.format ?? null,
      channel: context.channel ?? null,
      characterIds: context.characters.map((character) => character.id),
      worldId: context.world?.id ?? null,
      versions: {
        canonVersion: context.canonVersion,
        promptVersion: context.promptVersion,
        characterVersions: context.characterVersions,
      },
      context,
    };
  },
};

export const UNIVERSE_CAPABILITIES = [
  'universe.character.lookup',
  'universe.character.compose',
  'universe.story.compose',
  'universe.prompt.image',
  'universe.prompt.video',
  'universe.prompt.dialogue',
  'universe.world.lookup',
] as const;

export const mcpToolContract = {
  name: 'opsly-universe',
  tools: UNIVERSE_CAPABILITIES.map((name) => ({
    name,
    description: `Opsly Universe capability ${name}. Returns machine-readable JSON. No provider credentials.`,
  })),
};
