import { z } from 'zod';
import { CANON_VERSION, PROMPT_MODALITIES, STORY_BEATS } from './constants.js';

const NonEmpty = z.string().min(1);
const TraitList = z.array(NonEmpty).min(1);
const Score = z.number().int().min(0).max(100);

export const PersonalitySchema = z.object({
  traits: TraitList,
  humor: Score,
  curiosity: Score,
  courage: Score,
  empathy: Score,
  discipline: Score,
  impulsiveness: Score,
});

export const CommunicationSchema = z.object({
  tone: NonEmpty,
  vocabulary: NonEmpty,
  catchphrases: z.array(NonEmpty).min(1),
  forbiddenPatterns: z.array(NonEmpty).min(1),
});

export const VisualDnaSchema = z.object({
  invariants: z.array(NonEmpty).min(3),
  negatives: z.array(NonEmpty).min(3),
  styleAnchor: NonEmpty,
});

export const VisualIdentitySchema = z.object({
  silhouette: NonEmpty,
  bodyType: NonEmpty,
  face: NonEmpty,
  mask: NonEmpty,
  clothing: NonEmpty,
  materials: TraitList,
  primaryPalette: TraitList,
  secondaryPalette: TraitList,
  symbols: TraitList,
  geometry: TraitList,
  accessories: z.array(NonEmpty),
  lighting: NonEmpty,
  dna: VisualDnaSchema,
});

export const AnimationIdentitySchema = z.object({
  movement: NonEmpty,
  gestures: TraitList,
  idleBehavior: NonEmpty,
  emotionalExpressions: TraitList,
});

export const VoiceIdentitySchema = z.object({
  ageRange: NonEmpty,
  tone: NonEmpty,
  cadence: NonEmpty,
  emotionalRange: NonEmpty,
});

export const NarrativeSchema = z.object({
  themes: TraitList,
  lessonTypes: TraitList,
  suitableTopics: TraitList,
  prohibitedTopics: TraitList,
});

export const ContentProfileSchema = z.object({
  channels: TraitList,
  ageRating: z.enum(['all-ages', 'kids', 'family', 'teen', 'general']),
  formats: TraitList,
});

export const PromptAnchorsSchema = z.object({
  image: NonEmpty,
  video: NonEmpty,
  dialogue: NonEmpty,
  story: NonEmpty,
  thumbnail: NonEmpty,
});

export const CharacterCanonSchema = z.object({
  version: NonEmpty,
  immutableTraits: TraitList,
  flexibleTraits: TraitList,
});

export const CharacterRelationshipRefSchema = z.object({
  targetId: NonEmpty,
  kind: NonEmpty,
  description: NonEmpty,
});

export const UniverseCharacterSchema = z.object({
  id: NonEmpty,
  slug: NonEmpty,
  name: NonEmpty,
  aliases: z.array(NonEmpty),
  archetype: NonEmpty,
  role: NonEmpty,
  description: NonEmpty,
  origin: NonEmpty,
  backstory: NonEmpty,
  purpose: NonEmpty,
  motivations: TraitList,
  fears: TraitList,
  internalConflict: NonEmpty,
  strengths: TraitList,
  weaknesses: TraitList,
  personality: PersonalitySchema,
  communication: CommunicationSchema,
  abilities: TraitList,
  limitations: TraitList,
  relationships: z.array(CharacterRelationshipRefSchema),
  visualIdentity: VisualIdentitySchema,
  animationIdentity: AnimationIdentitySchema,
  voiceIdentity: VoiceIdentitySchema,
  narrative: NarrativeSchema,
  content: ContentProfileSchema,
  promptAnchors: PromptAnchorsSchema,
  canon: CharacterCanonSchema,
});

export const WorldVisualIdentitySchema = z.object({
  palette: TraitList,
  architecture: NonEmpty,
  atmosphere: NonEmpty,
  lighting: NonEmpty,
  motifs: TraitList,
  negatives: TraitList,
});

export const UniverseWorldSchema = z.object({
  id: NonEmpty,
  slug: NonEmpty,
  name: NonEmpty,
  description: NonEmpty,
  visualIdentity: WorldVisualIdentitySchema,
  themes: TraitList,
  allowedCharacters: TraitList,
  educationalDomains: TraitList,
  transitions: TraitList,
  portalSymbol: NonEmpty,
});

export const RelationshipEdgeSchema = z.object({
  id: NonEmpty,
  from: NonEmpty,
  to: NonEmpty,
  kind: NonEmpty,
  description: NonEmpty,
});

export const LoreNoteSchema = z.object({
  id: NonEmpty,
  title: NonEmpty,
  summary: NonEmpty,
  fictionVsScience: z.enum(['fiction', 'science', 'mixed-must-separate']),
  relatedCharacterIds: z.array(NonEmpty),
  relatedWorldIds: z.array(NonEmpty),
});

export const UniverseStyleSchema = z.object({
  look: NonEmpty,
  lighting: NonEmpty,
  materials: TraitList,
  symbols: TraitList,
  negatives: TraitList,
});

export const TenantAdaptationSchema = z.object({
  tenant: NonEmpty,
  brandFrame: NonEmpty,
  preferredCharacterIds: TraitList,
  topicOverrides: z.record(z.string(), z.array(NonEmpty)),
  defaultWorldId: NonEmpty,
  allowedWorldIds: TraitList,
  notes: z.array(NonEmpty),
  mutatesCanon: z.literal(false),
});

export const ComposeContextInputSchema = z.object({
  characterIds: z.array(NonEmpty).min(1).optional(),
  characters: z.array(NonEmpty).min(1).optional(),
  topic: NonEmpty,
  audience: z.enum(['kids', 'family', 'general', 'educators']).default('family'),
  channel: z.string().optional(),
  format: z.string().optional(),
  duration: z.number().int().positive().optional(),
  language: z.enum(['es', 'en']).default('es'),
  tenant: z.string().optional(),
  worldId: z.string().optional(),
});

export const StoryContextSchema = z.object({
  protagonist: NonEmpty,
  companions: z.array(NonEmpty).default([]),
  world: NonEmpty,
  topic: NonEmpty,
  conflict: NonEmpty,
  educationalObjective: NonEmpty,
  emotionalObjective: NonEmpty,
  duration: z.number().int().positive(),
  audience: z.enum(['kids', 'family', 'general', 'educators']).default('family'),
  language: z.enum(['es', 'en']).default('es'),
  tenant: z.string().optional(),
});

export const StoryBeatBlockSchema = z.object({
  beat: z.enum(STORY_BEATS),
  purpose: NonEmpty,
  content: NonEmpty,
  speakerIds: z.array(NonEmpty),
});

export const ComposedStorySchema = z.object({
  canonVersion: z.literal(CANON_VERSION),
  promptVersion: NonEmpty,
  characterVersions: z.record(z.string(), NonEmpty),
  context: StoryContextSchema,
  beats: z.array(StoryBeatBlockSchema).length(STORY_BEATS.length),
  narrativeRules: z.array(NonEmpty),
  safetyRules: z.array(NonEmpty),
});

export const BuiltPromptSchema = z.object({
  modality: z.enum(PROMPT_MODALITIES),
  prompt: NonEmpty,
  negativePrompt: NonEmpty,
  characterIds: TraitList,
  canonVersion: z.literal(CANON_VERSION),
  characterVersions: z.record(z.string(), NonEmpty),
  promptVersion: NonEmpty,
  aspectRatio: z.string().optional(),
});

export const SearchCriteriaSchema = z.object({
  query: z.string().optional(),
  topic: z.string().optional(),
  audience: z.string().optional(),
  channel: z.string().optional(),
  archetype: z.string().optional(),
});

export const CanonSnapshotSchema = z.object({
  canonVersion: z.literal(CANON_VERSION),
  promptVersion: NonEmpty,
  generatedAt: NonEmpty,
  characters: z.array(UniverseCharacterSchema).min(1),
  worlds: z.array(UniverseWorldSchema).min(1),
  relationships: z.array(RelationshipEdgeSchema).min(1),
  lore: z.array(LoreNoteSchema),
  universeStyle: UniverseStyleSchema,
  storyRules: z.array(NonEmpty),
  visualRules: z.array(NonEmpty),
  safetyRules: z.array(NonEmpty),
});

export const UniverseFoundationProvenanceSchema = z.enum([
  'verified_history',
  'founder_recollection',
  'narrative_interpretation',
  'fictional_canon',
]);

export const UniverseFoundationSchema = z.object({
  foundationVersion: NonEmpty,
  purpose: NonEmpty,
  origin: z.object({
    provenance: UniverseFoundationProvenanceSchema,
    statement: NonEmpty,
    sourceRefs: z.array(NonEmpty).min(1),
  }),
  principles: z.array(NonEmpty).min(1),
  nonNegotiables: z.array(NonEmpty).min(1),
  childSafety: z.array(NonEmpty).min(1),
  aiPhilosophy: z.array(NonEmpty).min(1),
  learningPhilosophy: z.array(NonEmpty).min(1),
  historicalEras: z
    .array(
      z.object({
        year: NonEmpty,
        name: NonEmpty,
        provenance: UniverseFoundationProvenanceSchema,
        summary: NonEmpty,
      }),
    )
    .min(1),
  futureVision: z.object({
    status: z.literal('open'),
    statement: NonEmpty,
  }),
});
