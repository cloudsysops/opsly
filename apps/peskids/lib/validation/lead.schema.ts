import { z } from 'zod';

/** Sprint 01 + landing form — shared field rules (tenant_slug=peskids). */
const PERSON_NAME_PATTERN = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/;
const PHONE_PATTERN = /^[0-9+\-().\s]{0,20}$/;

export const PESKIDS_GRADE_LEVELS = ['K-5', '6-8', '9-12', 'Other'] as const;
export const PESKIDS_LEAD_TYPES = ['family', 'teacher_applicant', 'company'] as const;
export const PESKIDS_SERVICE_MODES = ['llanogrande', 'domicilio', 'institutional'] as const;
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
export type PeskidsLeadType = (typeof PESKIDS_LEAD_TYPES)[number];
export type PeskidsServiceMode = (typeof PESKIDS_SERVICE_MODES)[number];
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

const optionalTextField = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalDocumentField = optionalTextField(40).refine(
  (value) => value === undefined || /^[a-zA-Z0-9.\-\s]+$/.test(value),
  { message: 'Documento inválido' }
);

const optionalBirthDateField = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Fecha de nacimiento inválida',
  });

type LeadRuleInput = {
  lead_type?: PeskidsLeadType;
  class_modality: PeskidsClassModality;
  neighborhood?: string;
  company_nit?: string;
};

function validateLeadRules(data: LeadRuleInput, ctx: z.RefinementCtx): void {
  if (data.lead_type === 'family' && data.class_modality === 'domicilio' && !data.neighborhood) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['neighborhood'],
      message: 'Indica el barrio o zona para clases a domicilio',
    });
  }

  if (data.lead_type === 'company' && !data.company_nit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['company_nit'],
      message: 'Indica el NIT de la empresa o institución',
    });
  }
}

function normalizeLeadShape<T extends LeadRuleInput>(
  data: T
): T & {
  lead_type: PeskidsLeadType;
  service_mode: PeskidsServiceMode;
  neighborhood: string | undefined;
} {
  const leadType = data.lead_type ?? 'family';
  return {
    ...data,
    lead_type: leadType,
    service_mode:
      'service_mode' in data && typeof data.service_mode === 'string'
        ? (data.service_mode as PeskidsServiceMode)
        : leadType === 'company'
          ? 'institutional'
          : data.class_modality,
    neighborhood:
      data.class_modality === 'llanogrande'
        ? (data.neighborhood ?? 'Llanogrande')
        : data.neighborhood,
  };
}

const leadCaptureBaseSchema = z.object({
  name: personNameField,
  email: emailField,
  phone: phoneOptionalField,
  lead_type: z.enum(PESKIDS_LEAD_TYPES).optional().default('family'),
  service_mode: z.enum(PESKIDS_SERVICE_MODES).optional(),
  class_modality: z.enum(PESKIDS_CLASS_MODALITIES, {
    message: 'Selecciona una modalidad de clase',
  }),
  neighborhood: optionalTextField(80),
  grade_interested: z.enum(PESKIDS_GRADE_LEVELS).optional().default('Other'),
  child_name: optionalTextField(80),
  birth_date: optionalBirthDateField,
  document_type: optionalTextField(30),
  document_number: optionalDocumentField,
  company_name: optionalTextField(120),
  company_nit: optionalDocumentField,
  referral_source: optionalReferralSource,
  referred_by_code: optionalReferralCode,
});

/** Client + HTML spec (Form 1) — `name` maps to guardian/contact full name. */
export const leadCaptureFormSchema = leadCaptureBaseSchema
  .superRefine(validateLeadRules)
  .transform(normalizeLeadShape);

export type LeadCaptureFormInput = z.infer<typeof leadCaptureFormSchema>;

/** POST /api/leads — consent required (Ley 1581 / parental). */
export const leadApiPostSchema = leadCaptureBaseSchema
  .extend({
    consent_treatment: z.literal(true, {
      message: 'Debes autorizar el tratamiento de datos',
    }),
    consent_marketing: z.boolean().optional().default(false),
    consent_policy_version: z.string().min(1).optional(),
    referral_code: z.string().trim().optional(),
    source: z.string().trim().optional(),
    campaign: z.string().trim().optional(),
  })
  .superRefine(validateLeadRules)
  .transform(normalizeLeadShape);

export type LeadApiPostInput = z.infer<typeof leadApiPostSchema>;

/** Service layer / canonical API — uses `full_name`. */
export const createLeadSchema = leadCaptureBaseSchema
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
    lead_type: data.lead_type,
    service_mode: data.service_mode,
    class_modality: data.class_modality,
    neighborhood: data.neighborhood,
    grade_interested: data.grade_interested,
    child_name: data.child_name,
    birth_date: data.birth_date,
    document_type: data.document_type,
    document_number: data.document_number,
    company_name: data.company_name,
    company_nit: data.company_nit,
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
  lead_type: 'lead_type',
  service_mode: 'service_mode',
  child_name: 'child_name',
  birth_date: 'birth_date',
  document_type: 'document_type',
  document_number: 'document_number',
  company_name: 'company_name',
  company_nit: 'company_nit',
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
    lead_type: form.lead_type,
    service_mode: form.service_mode,
    class_modality: form.class_modality,
    neighborhood: form.neighborhood,
    grade_interested: form.grade_interested,
    child_name: form.child_name,
    birth_date: form.birth_date,
    document_type: form.document_type,
    document_number: form.document_number,
    company_name: form.company_name,
    company_nit: form.company_nit,
    referral_source: form.referral_source,
    referred_by_code: form.referred_by_code,
    source: options?.source ?? 'web',
  });
}
