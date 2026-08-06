import { z } from 'zod';

export const leadQuickActionSchema = z.object({
  action: z.enum(['mark_attended', 'hold', 'cancel']),
  teacher_name: z.string().trim().min(1).max(120).optional(),
  scheduled_date: z.string().date().optional(),
  scheduled_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional(),
  hold_until_month: z.string().trim().max(120).optional(),
  reason: z.string().trim().max(200).optional(),
});

export type LeadQuickActionInput = z.infer<typeof leadQuickActionSchema>;
