import { z } from 'zod';
import type { PromptModality, StoryBeat } from './constants.js';
import {
  AnimationIdentitySchema,
  BuiltPromptSchema,
  CanonSnapshotSchema,
  CharacterCanonSchema,
  CharacterRelationshipRefSchema,
  CommunicationSchema,
  ComposeContextInputSchema,
  ComposedStorySchema,
  ContentProfileSchema,
  LoreNoteSchema,
  NarrativeSchema,
  PersonalitySchema,
  PromptAnchorsSchema,
  RelationshipEdgeSchema,
  SearchCriteriaSchema,
  StoryBeatBlockSchema,
  StoryContextSchema,
  TenantAdaptationSchema,
  UniverseFoundationProvenanceSchema,
  UniverseFoundationSchema,
  UniverseBitSchema,
  UniverseCharacterSchema,
  UniverseStyleSchema,
  UniverseWorldSchema,
  VisualDnaSchema,
  VisualIdentitySchema,
  VoiceIdentitySchema,
  WorldVisualIdentitySchema,
} from './schemas.js';

export type Personality = z.infer<typeof PersonalitySchema>;
export type Communication = z.infer<typeof CommunicationSchema>;
export type VisualDna = z.infer<typeof VisualDnaSchema>;
export type VisualIdentity = z.infer<typeof VisualIdentitySchema>;
export type AnimationIdentity = z.infer<typeof AnimationIdentitySchema>;
export type VoiceIdentity = z.infer<typeof VoiceIdentitySchema>;
export type Narrative = z.infer<typeof NarrativeSchema>;
export type ContentProfile = z.infer<typeof ContentProfileSchema>;
export type PromptAnchors = z.infer<typeof PromptAnchorsSchema>;
export type CharacterCanon = z.infer<typeof CharacterCanonSchema>;
export type CharacterRelationshipRef = z.infer<typeof CharacterRelationshipRefSchema>;
export type UniverseCharacter = z.infer<typeof UniverseCharacterSchema>;
export type WorldVisualIdentity = z.infer<typeof WorldVisualIdentitySchema>;
export type UniverseWorld = z.infer<typeof UniverseWorldSchema>;
export type RelationshipEdge = z.infer<typeof RelationshipEdgeSchema>;
export type LoreNote = z.infer<typeof LoreNoteSchema>;
export type UniverseStyle = z.infer<typeof UniverseStyleSchema>;
export type TenantAdaptation = z.infer<typeof TenantAdaptationSchema>;
export type ComposeContextInput = z.input<typeof ComposeContextInputSchema>;
export type StoryContext = z.input<typeof StoryContextSchema>;
export type StoryBeatBlock = z.infer<typeof StoryBeatBlockSchema>;
export type ComposedStory = z.infer<typeof ComposedStorySchema>;
export type BuiltPrompt = z.infer<typeof BuiltPromptSchema>;
export type SearchCriteria = z.infer<typeof SearchCriteriaSchema>;
export type CanonSnapshot = z.infer<typeof CanonSnapshotSchema>;
export type UniverseFoundation = z.infer<typeof UniverseFoundationSchema>;
export type UniverseFoundationProvenance = z.infer<typeof UniverseFoundationProvenanceSchema>;
export type UniverseBit = z.infer<typeof UniverseBitSchema>;

export type Audience = NonNullable<ComposeContextInput['audience']>;
export type UniverseLanguage = NonNullable<ComposeContextInput['language']>;

export interface CharacterPromptRequest {
  character: string;
  scene?: string;
  mood?: string;
  aspectRatio?: string;
  language?: UniverseLanguage;
}

export interface ComposedCharacterContext {
  canonVersion: string;
  promptVersion: string;
  characterVersions: Record<string, string>;
  characters: UniverseCharacter[];
  world: UniverseWorld | null;
  visualContext: {
    universeStyle: UniverseStyle;
    characterDna: Array<{ id: string; dna: VisualDna }>;
  };
  personalityContext: Array<{
    id: string;
    name: string;
    traits: string[];
    tone: string;
    catchphrases: string[];
    forbiddenPatterns: string[];
  }>;
  narrativeRules: string[];
  relationships: RelationshipEdge[];
  safetyRules: string[];
  promptContext: {
    image: string;
    video: string;
    dialogue: string;
    story: string;
    thumbnail: string;
  };
  tenant: TenantAdaptation | null;
  topic: string;
  audience: Audience;
  channel?: string;
  format?: string;
  duration?: number;
  language: UniverseLanguage;
}

export type { PromptModality, StoryBeat };
