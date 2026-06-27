import { z } from 'zod';

export const updateTenantSettingsSchema = z.object({
  academy_name: z.string().trim().min(2).max(120).optional(),
  sede_label: z.string().trim().min(2).max(120).optional(),
  support_email: z.string().trim().email().optional(),
  support_phone: z.string().trim().min(7).max(20).optional(),
  default_modality: z.enum(['llanogrande', 'domicilio']).optional(),
  default_capacity: z.number().int().positive().optional(),
  default_price_cents: z.number().int().nonnegative().optional(),
});
