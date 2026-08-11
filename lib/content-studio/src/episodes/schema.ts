import { z } from 'zod';
import { SeriesIdSchema } from '../series/schema.js';

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
  title: z.object({ es: z.string().min(1), en: z.string().min(1) }),
  hook: z.object({
    es: z.string().min(1).max(300),
    en: z.string().min(1).max(300),
  }),
  objective: z.string().min(1),
  audience: z.array(z.string()).min(1),
  duration_estimate_sec: z.number().int().positive(),
  scenes: z.array(EpisodeSceneSchema),
  metadata: z.object({
    call_to_action: z.string().min(1),
    captions: z.object({ es: z.string(), en: z.string() }),
    hashtags: z.array(z.string()),
    thumbnail_concept: z.string(),
  }),
  production: EpisodeProductionSchema,
});

export type EpisodeInput = z.infer<typeof EpisodeSchema>;
