import { z } from 'zod';

export const technicianBookingCompleteBodySchema = z.object({
  findings: z.string().max(20_000).optional(),
  actions_taken: z.string().max(20_000).optional(),
  metrics_before: z.record(z.unknown()).optional(),
  metrics_after: z.record(z.unknown()).optional(),
  recommendations: z.string().max(20_000).optional(),
  equipment_used: z.array(z.string().max(200)).max(50).optional(),
  time_spent_minutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60)
    .optional(),
  travel_distance_miles: z.number().finite().optional(),
  customer_satisfaction: z.number().int().min(1).max(5).optional(),
  upsell_offered: z.string().max(2000).optional(),
  next_maintenance_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  pdf_url: z.string().url().max(2000).optional(),
});
