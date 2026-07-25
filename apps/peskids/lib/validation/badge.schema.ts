import { z } from 'zod';

export const createBadgeSchema = z.object({
  label: z.string().trim().min(1).max(80),
  class_id: z.string().uuid().optional(),
});
