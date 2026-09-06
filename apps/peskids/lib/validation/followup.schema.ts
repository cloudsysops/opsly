import { z } from 'zod';

export const followupContactTypeSchema = z.enum(['lead', 'student', 'parent']);
export const followupTypeSchema = z.enum(['call', 'email', 'sms', 'in-person']);
export const followupStatusSchema = z.enum(['pending', 'completed', 'cancelled']);

export const createFollowupSchema = z.object({
  contact_id: z.string().uuid(),
  contact_type: followupContactTypeSchema,
  type: followupTypeSchema,
  due_date: z.string().date(),
  notes: z.string().trim().max(500).optional(),
}).strict();

export const patchFollowupSchema = z.object({
  status: followupStatusSchema.optional(),
  type: followupTypeSchema.optional(),
  due_date: z.string().date().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
}).strict();
