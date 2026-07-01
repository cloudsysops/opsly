import { z } from 'zod';

export const trialClassStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'attended',
  'no_show',
  'cancelled',
]);

export const createTrialClassSchema = z.object({
  lead_id: z.string().uuid(),
  scheduled_date: z.string().date(),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  modality: z.enum(['llanogrande', 'domicilio']),
  teacher_name: z.string().trim().min(1).max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const patchTrialClassSchema = z.object({
  status: trialClassStatusSchema.optional(),
  scheduled_date: z.string().date().optional(),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  modality: z.enum(['llanogrande', 'domicilio']).optional(),
  teacher_name: z.string().trim().min(1).max(120).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});
