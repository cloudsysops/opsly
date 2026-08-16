import { CANON_VERSION, PROMPT_VERSION } from './constants.js';
import { composeCharacterContext } from './composer.js';
import { characterVersionMap, getCharacter } from './registry.js';
import type { BuiltPrompt, CharacterPromptRequest, UniverseLanguage } from './types.js';
import { collectVisualDna, formatVisualDnaBlock } from './visual/dna.js';
import { UNIVERSE_STYLE } from './visual/universe-style.js';

function joinParts(parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join('\n\n');
}

function resolveCharacter(ref: string) {
  return getCharacter(ref);
}

export function buildImagePrompt(request: CharacterPromptRequest): BuiltPrompt {
  const character = resolveCharacter(request.character);
  const scene = request.scene ?? 'standing at a Nexus threshold, ready to explore';
  const mood = request.mood ?? 'wonder';
  const prompt = joinParts([
    UNIVERSE_STYLE.look,
    `Lighting: ${UNIVERSE_STYLE.lighting}`,
    formatVisualDnaBlock(character),
    `Scene: ${scene}`,
    `Mood: ${mood}`,
    character.promptAnchors.image,
    character.visualIdentity.lighting,
    request.aspectRatio ? `Aspect ratio: ${request.aspectRatio}` : undefined,
  ]);
  return {
    modality: 'image',
    prompt,
    negativePrompt: [...character.visualIdentity.dna.negatives, ...UNIVERSE_STYLE.negatives].join(', '),
    characterIds: [character.id],
    canonVersion: CANON_VERSION,
    characterVersions: characterVersionMap([character]),
    promptVersion: PROMPT_VERSION,
    aspectRatio: request.aspectRatio,
  };
}

export function buildVideoPrompt(request: CharacterPromptRequest): BuiltPrompt {
  const character = resolveCharacter(request.character);
  const scene = request.scene ?? 'moving through a portal of light';
  const prompt = joinParts([
    UNIVERSE_STYLE.look,
    formatVisualDnaBlock(character),
    `Motion: ${character.animationIdentity.movement}`,
    `Idle: ${character.animationIdentity.idleBehavior}`,
    character.promptAnchors.video,
    `Scene: ${scene}`,
    `Mood: ${request.mood ?? 'discovery'}`,
    request.aspectRatio ? `Aspect ratio: ${request.aspectRatio}` : undefined,
  ]);
  return {
    modality: 'video',
    prompt,
    negativePrompt: [...character.visualIdentity.dna.negatives, ...UNIVERSE_STYLE.negatives].join(', '),
    characterIds: [character.id],
    canonVersion: CANON_VERSION,
    characterVersions: characterVersionMap([character]),
    promptVersion: PROMPT_VERSION,
    aspectRatio: request.aspectRatio,
  };
}

export function buildDialoguePrompt(request: CharacterPromptRequest): BuiltPrompt {
  const character = resolveCharacter(request.character);
  const language: UniverseLanguage = request.language ?? 'es';
  const prompt = joinParts([
    `Write dialogue as ${character.name} in ${language}.`,
    `Tone: ${character.communication.tone}`,
    `Vocabulary: ${character.communication.vocabulary}`,
    `Catchphrases to use sparingly: ${character.communication.catchphrases.join(' | ')}`,
    `Forbidden: ${character.communication.forbiddenPatterns.join(' | ')}`,
    character.promptAnchors.dialogue,
    request.scene ? `Situation: ${request.scene}` : undefined,
  ]);
  return {
    modality: 'dialogue',
    prompt,
    negativePrompt: character.communication.forbiddenPatterns.join(', '),
    characterIds: [character.id],
    canonVersion: CANON_VERSION,
    characterVersions: characterVersionMap([character]),
    promptVersion: PROMPT_VERSION,
  };
}

export function buildStoryPrompt(request: CharacterPromptRequest): BuiltPrompt {
  const character = resolveCharacter(request.character);
  const prompt = joinParts([
    `Protagonist: ${character.name} (${character.archetype})`,
    `Purpose: ${character.purpose}`,
    `Internal conflict: ${character.internalConflict}`,
    character.promptAnchors.story,
    request.scene ? `Story seed: ${request.scene}` : undefined,
    'Keep personality intact. Do not flatten into a generic narrator.',
  ]);
  return {
    modality: 'story',
    prompt,
    negativePrompt: character.narrative.prohibitedTopics.join(', '),
    characterIds: [character.id],
    canonVersion: CANON_VERSION,
    characterVersions: characterVersionMap([character]),
    promptVersion: PROMPT_VERSION,
  };
}

export function buildThumbnailPrompt(request: CharacterPromptRequest): BuiltPrompt {
  const character = resolveCharacter(request.character);
  const prompt = joinParts([
    'Readable thumbnail, strong silhouette, one clear emotion.',
    formatVisualDnaBlock(character),
    character.promptAnchors.thumbnail,
    request.scene ? `Hook: ${request.scene}` : undefined,
    request.aspectRatio ? `Aspect ratio: ${request.aspectRatio}` : 'Aspect ratio: 16:9 or 9:16 as specified',
  ]);
  return {
    modality: 'thumbnail',
    prompt,
    negativePrompt: [...character.visualIdentity.dna.negatives, 'busy collage', 'unreadable faces'].join(', '),
    characterIds: [character.id],
    canonVersion: CANON_VERSION,
    characterVersions: characterVersionMap([character]),
    promptVersion: PROMPT_VERSION,
    aspectRatio: request.aspectRatio,
  };
}

export function buildScenePrompts(input: {
  characters: string[];
  topic: string;
  audience?: 'kids' | 'family' | 'general' | 'educators';
  tenant?: string;
  scene?: string;
  aspectRatio?: string;
}): Record<'image' | 'video' | 'dialogue' | 'story' | 'thumbnail', string> {
  const context = composeCharacterContext({
    characters: input.characters,
    topic: input.topic,
    audience: input.audience ?? 'family',
    tenant: input.tenant,
  });
  const dna = collectVisualDna(context.characters);
  const scene = input.scene ?? `${input.topic} inside ${context.world?.name ?? 'NEXUS'}`;
  return {
    image: joinParts([dna, UNIVERSE_STYLE.look, `Scene: ${scene}`, input.aspectRatio]),
    video: joinParts([dna, context.promptContext.video, `Scene: ${scene}`]),
    dialogue: context.promptContext.dialogue,
    story: context.promptContext.story,
    thumbnail: context.promptContext.thumbnail,
  };
}
