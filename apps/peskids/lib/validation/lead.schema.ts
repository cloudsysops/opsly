import { z } from 'zod';

/** Sprint 01 + landing form — shared field rules (tenant_slug=peskids). */
const PERSON_NAME_PATTERN = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/;
const PHONE_PATTERN = /^[0-9+\-().\s]{0,20}$/;

export const PESKIDS_GRADE_LEVELS = ['K-5', '6-8', '9-12', 'Other'] as const;
export const PESKIDS_REFERRAL_SOURCES = [
  'Google',
  'Friend',
  'Instagram',
  'Facebook',
  'Other',
  'Not sure',
] as const;
export const PESKIDS_CLASS_MODALITIES = ['llanogrande', 'domicilio'] as const;
export const PESKIDS_LEAD_SOURCES = ['web', 'whatsapp', 'referral', 'event', 'manual'] as const;

export type PeskidsGradeLevel = (typeof PESKIDS_GRADE_LEVELS)[number];
export type PeskidsReferralSource = (typeof PESKIDS_REFERRAL_SOURCES)[number];
export type PeskidsClassModality = (typeof PESKIDS_CLASS_MODALITIES)[number];

const personNameField = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(50, 'El nombre no puede superar 50 caracteres')
  .regex(PERSON_NAME_PATTERN, 'Usa solo letras, espacios o guiones');

const emailField = z.string().trim().email('Correo electrónico inválido');

const phoneOptionalField = z
  .string()
  .trim()
  .max(20, 'Teléfono demasiado largo')
  .regex(PHONE_PATTERN, 'Teléfono inválido')
  .optional()
  .transform((value) => {
    if (value === undefined || value.length === 0) {
      return undefined;
    }
    return value;
  });

const optionalReferralSource = z
  .union([z.enum(PESKIDS_REFERRAL_SOURCES), z.literal('')])
  .optional()
  .transform((value) => (value === '' || value === undefined ? undefined : value));

const optionalReferralCode = z
  .string()
  .trim()
  .toUpperCase()
  .optional()
  .transform((value) => {
    if (!value || value.length === 0) {
      return undefined;
    }
    return value;
  })
  .refine((value) => value === undefined || /^[A-Z0-9-]{4,24}$/.test(value), {
    message: 'Código de referido inválido',
  });

/** Client + HTML spec (Form 1) — `name` maps to guardian full name. */
export const leadCaptureFormSchema = z.object({
  name: personNameField,
  email: emailField,
  phone: phoneOptionalField,
  class_modality: z.enum(PESKIDS_CLASS_MODALITIES, {
    message: 'Selecciona una modalidad de clase',
  }),
  neighborhood: z
    .string()
    .trim()
    .min(2, 'Indica el barrio o zona')
    .max(80, 'Barrio o zona demasiado largo'),
  grade_interested: z.enum(PESKIDS_GRADE_LEVELS, {
    message: 'Selecciona el rango de edad',
  }),
  referral_source: optionalReferralSource,
  referred_by_code: optionalReferralCode,
});

export type LeadCaptureFormInput = z.infer<typeof leadCaptureFormSchema>;

/** POST /api/leads — consent required (Ley 1581 / parental). */
export const leadApiPostSchema = leadCaptureFormSchema.extend({
  consent_treatment: z.literal(true, {
    message: 'Debes autorizar el tratamiento de datos',
  }),
  consent_marketing: z.boolean().optional().default(false),
  consent_policy_version: z.string().min(1).optional(),
  referral_code: z.string().trim().optional(),
  source: z.string().trim().optional(),
  campaign: z.string().trim().optional(),
});

export type LeadApiPostInput = z.infer<typeof leadApiPostSchema>;

/** Service layer / canonical API — uses `full_name`. */
export const createLeadSchema = leadCaptureFormSchema
  .omit({ name: true })
  .extend({
    full_name: personNameField,
    source: z.enum(PESKIDS_LEAD_SOURCES).default('web'),
    status: z
      .enum(['new', 'contacted', 'qualified', 'lost', 'converted'])
      .optional()
      .default('new'),
    referral_code: z.string().optional(),
    referred_by_code: optionalReferralCode,
  })
  .transform((data) => ({
    full_name: data.full_name,
    email: data.email,
    phone: data.phone,
    class_modality: data.class_modality,
    neighborhood: data.neighborhood,
    grade_interested: data.grade_interested,
    referral_source: data.referral_source,
    referred_by_code: data.referred_by_code,
    source: data.source,
    status: data.status,
    referral_code: data.referral_code,
  }));

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const gohighlevelLeadIntakeSchema = z.object({
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

export type GoHighLevelLeadIntakeInput = z.infer<typeof gohighlevelLeadIntakeSchema>;

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

/** Map validated form fields to canonical lead service payload. */
export function toCreateLeadInput(
  form: LeadCaptureFormInput,
  options?: { source?: (typeof PESKIDS_LEAD_SOURCES)[number] }
): CreateLeadInput {
  return createLeadSchema.parse({
    full_name: form.name,
    email: form.email,
    phone: form.phone,
    class_modality: form.class_modality,
    neighborhood: form.neighborhood,
    grade_interested: form.grade_interested,
    referral_source: form.referral_source,
    referred_by_code: form.referred_by_code,
    source: options?.source ?? 'web',
  });
}
