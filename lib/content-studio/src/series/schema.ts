import { z } from 'zod';
import { CharacterIdSchema } from '../characters/schema.js';

export const SeriesIdSchema = z.enum([
  'opsly-origins',
  'peki-lab',
  'build-with-opsly',
  'opsly-parallel-path',
]);

export const SeriesSchema = z.object({
  id: SeriesIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  theme: z.string().min(1),
  audience: z.array(z.string()).min(1),
  typical_duration_sec: z.number().int().positive(),
  characters: z.array(CharacterIdSchema).min(1),
  brand: z.enum(['opsly', 'peskids']),
  episode_count: z.number().int().nonnegative(),
  created_at: z.string(),
});

export type SeriesInput = z.infer<typeof SeriesSchema>;
