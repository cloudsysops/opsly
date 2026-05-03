import { z } from 'zod';
import { TECHNICIAN_COMPLETE_SCHEMA } from './constants';

const T = TECHNICIAN_COMPLETE_SCHEMA;
const timeSpentMaxMinutes = T.HOURS_PER_DAY * T.MINUTES_PER_HOUR;

export const technicianBookingCompleteBodySchema = z.object({
  findings: z.string().max(T.TEXT_FIELD_MAX).optional(),
  actions_taken: z.string().max(T.TEXT_FIELD_MAX).optional(),
  metrics_before: z.record(z.unknown()).optional(),
  metrics_after: z.record(z.unknown()).optional(),
  recommendations: z.string().max(T.TEXT_FIELD_MAX).optional(),
  equipment_used: z
    .array(z.string().max(T.EQUIPMENT_STRING_MAX))
    .max(T.EQUIPMENT_MAX_COUNT)
    .optional(),
  time_spent_minutes: z.number().int().min(0).max(timeSpentMaxMinutes).optional(),
  travel_distance_miles: z.number().finite().optional(),
  customer_satisfaction: z
    .number()
    .int()
    .min(T.SATISFACTION_MIN)
    .max(T.SATISFACTION_MAX)
    .optional(),
  upsell_offered: z.string().max(T.STRING_URL_MAX).optional(),
  next_maintenance_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  pdf_url: z.string().url().max(T.STRING_URL_MAX).optional(),
});
