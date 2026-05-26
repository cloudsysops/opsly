import { z } from 'zod';
import {
  PESKIDS_CLASS_MODALITY_VALUES,
  PESKIDS_GRADE_VALUES,
  PESKIDS_REFERRAL_SOURCES,
  PESKIDS_TENANT_SLUG,
} from './constants';

const nameField = z
  .string()
  .trim()
  .min(2, 'name must be at least 2 characters')
  .max(50, 'name must be at most 50 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'name contains invalid characters');

const emailField = z.string().trim().email('invalid email');

const phoneField = z
  .string()
  .trim()
  .max(20)
  .regex(/^[0-9+\-().\s]*$/, 'invalid phone')
  .optional()
  .or(z.literal(''));

const neighborhoodField = z
  .string()
  .trim()
  .min(2, 'neighborhood must be at least 2 characters')
  .max(80, 'neighborhood must be at most 80 characters')
  .regex(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,#-]+$/, 'neighborhood contains invalid characters');

export const peskidsLeadBodySchema = z.object({
  tenant_slug: z.literal(PESKIDS_TENANT_SLUG).optional().default(PESKIDS_TENANT_SLUG),
  name: nameField,
  email: emailField,
  phone: phoneField,
  class_modality: z.enum(PESKIDS_CLASS_MODALITY_VALUES),
  neighborhood: neighborhoodField,
  grade_interested: z.enum(PESKIDS_GRADE_VALUES),
  referral_source: z.enum(PESKIDS_REFERRAL_SOURCES).optional(),
});

export const peskidsFeedbackBodySchema = z.object({
  tenant_slug: z.literal(PESKIDS_TENANT_SLUG).optional().default(PESKIDS_TENANT_SLUG),
  child_name: nameField,
  satisfaction: z.coerce.number().int().min(1).max(5),
  suggestion: z.string().trim().max(500).optional(),
  contact_me_back: z.boolean().optional().default(false),
});

export type PeskidsLeadBody = z.infer<typeof peskidsLeadBodySchema>;
export type PeskidsFeedbackBody = z.infer<typeof peskidsFeedbackBodySchema>;
