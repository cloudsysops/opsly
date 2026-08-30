import { z } from 'zod';

export const createLeadSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email required'),
  phone: z.string().optional().nullable(),
  source: z.enum(['web', 'whatsapp', 'referral', 'event', 'manual']).default('web'),
  class_modality: z.enum(['llanogrande', 'domicilio']).optional(),
  neighborhood: z.string().optional(),
  grade_interested: z.string().optional(),
  referral_source: z.string().optional(),
  referral_code: z.string().optional(),
  referred_by_code: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const externalLeadIntakeSchema = z.object({
  parent_name: z.string().trim().min(2, 'Parent name must be at least 2 characters').max(100),
  phone: z
    .string()
    .trim()
    .min(7, 'Phone must be at least 7 characters')
    .max(20, 'Phone must be at most 20 characters')
    .regex(/^[0-9+\-().\s]*$/, 'Invalid phone'),
  email: z.string().trim().email('Valid email required'),
  child_name: z.string().trim().min(2, 'Child name must be at least 2 characters').max(100),
  age: z.coerce.number().int().min(3, 'Age must be at least 3').max(18, 'Age must be at most 18'),
  interest: z.string().trim().min(2, 'Interest must be at least 2 characters').max(80),
});

export type ExternalLeadIntakeInput = z.infer<typeof externalLeadIntakeSchema>;

export const leadFieldMap: Record<string, string> = {
  name: 'full_name',
  full_name: 'full_name',
  email: 'email',
  phone: 'phone',
  class_modality: 'class_modality',
  neighborhood: 'neighborhood',
  grade_interested: 'grade_interested',
  referral_source: 'referral_source',
  referral_code: 'referral_code',
  referred_by_code: 'referred_by_code',
};
