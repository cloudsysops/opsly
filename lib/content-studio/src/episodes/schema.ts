import { z } from 'zod';
import { SeriesIdSchema } from '../series/schema.js';

/**
 * Open language map: 'es' and 'en' are mandatory (the pipeline's base
 * languages), any other ISO-ish code (zh, ja, pt, ar, ...) is optional and
 * additive — see data/content/canon/LANGUAGES.md. Using z.record instead of
 * a closed object means new language keys are never silently stripped.
 */
export const LocalizedTextSchema = z
  .record(z.string(), z.string())
  .refine((obj) => typeof obj.es === 'string' && obj.es.length > 0, {
    message: "must include a non-empty 'es' key",
  })
  .refine((obj) => typeof obj.en === 'string' && obj.en.length > 0, {
    message: "must include a non-empty 'en' key",
  });

export const EpisodeProductionStateSchema = z.enum([
  'idea',
  'script',
  'storyboard',
  'assets',
  'rendered',
  'reviewed',
  'published',
  'archived',
]);

export const EpisodeSceneSchema = z.object({
  number: z.number().int().positive(),
  description: z.string().min(1),
  visuals: z.string().min(1),
  copy: z.string(),
  duration_sec: z.number().nonnegative(),
  assets_needed: z.array(z.string()),
});

export const EpisodeProductionSchema = z.object({
  status: EpisodeProductionStateSchema,
  created_at: z.string(),
  last_updated: z.string(),
  script_approved_at: z.string().optional(),
  script_approved_by: z.string().optional(),
  assets_ready_at: z.string().optional(),
  rendered_at: z.string().optional(),
  reviewed_at: z.string().optional(),
  reviewed_by: z.string().optional(),
  published_at: z.string().optional(),
  published_platforms: z.array(z.string()),
  publish_urls: z.record(z.string(), z.string()),
  notes: z.array(z.string()),
});

export const EpisodeSchema = z.object({
  id: z.string().min(1),
  series_id: SeriesIdSchema,
  episode_number: z.number().int().positive(),
  title: LocalizedTextSchema,
  hook: LocalizedTextSchema.refine((obj) => Object.values(obj).every((v) => v.length <= 300), {
    message: 'each hook translation must be ≤ 300 chars',
  }),
  objective: z.string().min(1),
  audience: z.array(z.string()).min(1),
  duration_estimate_sec: z.number().int().positive(),
  scenes: z.array(EpisodeSceneSchema),
  metadata: z.object({
    call_to_action: z.string().min(1),
    captions: LocalizedTextSchema,
    hashtags: z.array(z.string()),
    thumbnail_concept: z.string(),
  }),
  production: EpisodeProductionSchema,
});

export type EpisodeInput = z.infer<typeof EpisodeSchema>;
