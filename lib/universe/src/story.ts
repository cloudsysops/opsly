import { CANON_VERSION, PROMPT_VERSION, STORY_BEATS } from './constants.js';
import { composeCharacterContext } from './composer.js';
import { getCharacter } from './registry.js';
import { ComposedStorySchema, StoryContextSchema } from './schemas.js';
import type { ComposedStory, StoryBeat, StoryBeatBlock, StoryContext } from './types.js';

const BEAT_PURPOSE: Record<StoryBeat, string> = {
  HOOK: 'Stop the scroll with a living question in character voice',
  DISCOVERY: 'Enter the world and notice something specific',
  CONFLICT: 'Name the trouble without cruelty',
  EXPLANATION: 'Teach how, without flattening personality',
  RESOLUTION: 'A try that changes the situation',
  LESSON: 'One portable takeaway',
  CTA: 'Invite the next question or practice',
};

function speakerLine(id: string, text: string, language: StoryContext['language']): string {
  const character = getCharacter(id);
  const phrase = character.communication.catchphrases[0];
  if (language === 'en') {
    return `${character.name}: ${text} (${phrase})`;
  }
  return `${character.name}: ${text}`;
}

export function composeStory(raw: StoryContext): ComposedStory {
  const context = StoryContextSchema.parse(raw);
  const composed = composeCharacterContext({
    characters: [context.protagonist, ...context.companions],
    topic: context.topic,
    audience: context.audience,
    language: context.language,
    tenant: context.tenant,
    worldId: context.world,
    duration: context.duration,
  });
  const lead = getCharacter(context.protagonist);
  const companion = context.companions[0] ? getCharacter(context.companions[0]) : lead;
  const beats: StoryBeatBlock[] = STORY_BEATS.map((beat) => {
    const speakers = beat === 'EXPLANATION' && companion.id !== lead.id
      ? [lead.id, companion.id]
      : [lead.id];
    const sketches: Record<StoryBeat, string> = {
      HOOK: speakerLine(
        lead.id,
        context.language === 'es'
          ? `¿Y si ${context.topic}?`
          : `What if ${context.topic}?`,
        context.language,
      ),
      DISCOVERY: `${lead.name} notices the world ${composed.world?.name ?? context.world}: ${context.topic}.`,
      CONFLICT: context.conflict,
      EXPLANATION: `${context.educationalObjective}. Keep ${lead.name} voice: ${lead.communication.tone}`,
      RESOLUTION: `${lead.name} tries a small, kind experiment with ${companion.name}.`,
      LESSON: context.emotionalObjective,
      CTA: context.language === 'es'
        ? '¿Qué pregunta hacemos después?'
        : 'What do we ask next?',
    };
    return {
      beat,
      purpose: BEAT_PURPOSE[beat],
      content: sketches[beat],
      speakerIds: speakers,
    };
  });

  return ComposedStorySchema.parse({
    canonVersion: CANON_VERSION,
    promptVersion: PROMPT_VERSION,
    characterVersions: composed.characterVersions,
    context,
    beats,
    narrativeRules: composed.narrativeRules,
    safetyRules: composed.safetyRules,
  });
}
