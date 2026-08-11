import { z } from 'zod';
import { SeriesIdSchema } from '../series/schema.js';

export const CampaignScheduleEntrySchema = z.object({
  episode_id: z.string().min(1),
  scheduled_publish_date: z.string(),
  day_of_week: z.number().int().min(0).max(6),
});

export const CampaignProductionStatusSchema = z.object({
  episodes_planned: z.number().int().nonnegative(),
  episodes_scripted: z.number().int().nonnegative(),
  episodes_with_assets: z.number().int().nonnegative(),
  episodes_rendered: z.number().int().nonnegative(),
  episodes_reviewed: z.number().int().nonnegative(),
  episodes_published: z.number().int().nonnegative(),
});

export const CampaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  series_ids: z.array(SeriesIdSchema).min(1),
  duration_days: z.number().int().positive(),
  start_date: z.string(),
  end_date: z.string(),
  episode_schedule: z.array(CampaignScheduleEntrySchema),
  objectives: z.array(z.string()),
  target_platforms: z.array(z.string()),
  production_status: CampaignProductionStatusSchema,
});

export type CampaignInput = z.infer<typeof CampaignSchema>;
