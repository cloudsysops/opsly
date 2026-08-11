import { z } from 'zod';

export const CharacterIdSchema = z.enum([
  'opsly-founder',
  'opsly-robot-luna',
  'wavo',
  // Opsly Universe canon (2026-08-11) — see data/content/canon/CONTINUITY-RULES.md.
  // opsly-founder / opsly-robot-luna remain valid (early MVP bible, still used by
  // the opsly-origins series) but are superseded by these two for new universe content.
  'the-traveler',
  'nova',
]);

export const CharacterVisualSchema = z.object({
  silhouette_prompt: z.string().min(1),
  proportions: z.record(z.string(), z.number()),
  face: z.object({
    eye_style: z.string().min(1),
    mouth_style: z.string().min(1),
    expressions: z.array(z.string()).min(1),
  }),
  hair_style: z.string().optional(),
  clothing: z.object({
    primary: z.string().min(1),
    accessories: z.array(z.string()),
    symbols: z.array(z.string()),
  }),
  color_palette: z.array(z.string()).min(1),
  mechanical_elements: z.array(z.string()),
  generation_prompt: z.string().min(1),
  negative_prompt: z.string().min(1),
});

export const CharacterVoiceSchema = z.object({
  language: z.enum(['es', 'en', 'both']),
  tone: z.string().min(1),
  speed: z.enum(['slow', 'normal', 'playful', 'measured', 'fast']),
  sample_line: z.string().optional(),
});

export const CharacterProfileSchema = z.object({
  id: CharacterIdSchema,
  canonical_name: z.string().min(1),
  role: z.string().min(1),
  personality: z.object({
    archetype: z.string().min(1),
    traits: z.array(z.string()).min(1),
    narrative_role: z.enum(['protagonist', 'supporter', 'guide']),
  }),
  visual: CharacterVisualSchema,
  voice: CharacterVoiceSchema,
  prohibited_variations: z.array(z.string()),
});

export type CharacterProfileInput = z.infer<typeof CharacterProfileSchema>;
