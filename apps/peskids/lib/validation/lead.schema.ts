import { z } from 'zod'

export const createLeadSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email required'),
  phone: z.string().optional().nullable(),
  source: z.enum(['web', 'whatsapp', 'referral', 'event', 'manual']).default('web'),
  class_modality: z.enum(['llanogrande', 'domicilio']).optional(),
  neighborhood: z.string().optional(),
  grade_interested: z.string().optional(),
  referral_source: z.string().optional(),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>

export const leadFieldMap: Record<string, string> = {
  name: 'full_name',
  full_name: 'full_name',
  email: 'email',
  phone: 'phone',
  class_modality: 'class_modality',
  neighborhood: 'neighborhood',
  grade_interested: 'grade_interested',
  referral_source: 'referral_source',
}
