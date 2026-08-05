import { z } from 'zod';
import { gradeFromAgeYears, ageYearsFromBirthDate } from '@/lib/lead-age';

/** Sprint 01 + dynamic intake — shared field rules (tenant_slug=peskids). */
const PERSON_NAME_PATTERN = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/;
const PHONE_PATTERN = /^[0-9+\-().\s]{0,20}$/;
const DOCUMENT_PATTERN = /^[a-zA-Z0-9.\-\s]+$/;

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
export const PESKIDS_COMPANY_KINDS = [
  'guarderia',
  'colegio',
  'empresa',
  'conjunto',
  'otro',
] as const;

export type PeskidsGradeLevel = (typeof PESKIDS_GRADE_LEVELS)[number];
export type PeskidsLeadType = (typeof PESKIDS_LEAD_TYPES)[number];
export type PeskidsServiceMode = (typeof PESKIDS_SERVICE_MODES)[number];
export type PeskidsReferralSource = (typeof PESKIDS_REFERRAL_SOURCES)[number];
export type PeskidsClassModality = (typeof PESKIDS_CLASS_MODALITIES)[number];
export type PeskidsCompanyKind = (typeof PESKIDS_COMPANY_KINDS)[number];

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
    if (value === undefined || value.length === 0) return undefined;
    return value;
  });

const phoneRequiredField = z
  .string()
  .trim()
  .min(7, 'Teléfono demasiado corto')
  .max(20, 'Teléfono demasiado largo')
  .regex(PHONE_PATTERN, 'Teléfono inválido');

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
    if (!value || value.length === 0) return undefined;
    return value;
  })
  .refine((value) => value === undefined || /^[A-Z0-9-]{4,24}$/.test(value), {
    message: 'Código de referido inválido',
  });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const documentNumberField = z
  .string()
  .trim()
  .min(4, 'Documento demasiado corto')
  .max(40, 'Documento demasiado largo')
  .regex(DOCUMENT_PATTERN, 'Documento inválido');

const birthDateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de nacimiento inválida')
  .refine((value) => ageYearsFromBirthDate(value) !== null, {
    message: 'Fecha de nacimiento inválida',
  });

const sharedContactFields = {
  email: emailField,
  referral_source: optionalReferralSource,
  referred_by_code: optionalReferralCode,
};

const familySchema = z
  .object({
    lead_type: z.literal('family'),
    name: personNameField, // acudiente
    phone: phoneRequiredField,
    child_name: personNameField,
    birth_date: birthDateField,
    document_type: z.string().trim().default('CC'),
    document_number: documentNumberField,
    city: optionalText(80),
    class_modality: z.enum(PESKIDS_CLASS_MODALITIES, {
      message: 'Selecciona sede Llanogrande o domicilio',
    }),
    neighborhood: optionalText(80),
    grade_interested: z.enum(PESKIDS_GRADE_LEVELS).optional(),
    ...sharedContactFields,
  })
  .superRefine((data, ctx) => {
    if (data.class_modality === 'domicilio' && !data.neighborhood) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['neighborhood'],
        message: 'Indica el barrio o zona para clases a domicilio',
      });
    }
  })
  .transform((data) => {
    const age = ageYearsFromBirthDate(data.birth_date);
    const grade = data.grade_interested ?? gradeFromAgeYears(age);
    return {
      ...data,
      lead_type: 'family' as const,
      service_mode: data.class_modality as PeskidsServiceMode,
      neighborhood:
        data.class_modality === 'llanogrande' ? 'Llanogrande' : data.neighborhood!,
      grade_interested: grade,
      child_age_years: age,
      metadata: {
        intake_version: 'dynamic-intake-v1',
        child_age_years: age,
        city: data.city ?? undefined,
      } as Record<string, unknown>,
    };
  });

const teacherSchema = z
  .object({
    lead_type: z.literal('teacher_applicant'),
    name: personNameField,
    phone: phoneRequiredField,
    document_type: z.string().trim().default('CC'),
    document_number: documentNumberField,
    experience: z.string().trim().min(10, 'Cuéntanos un poco más de tu experiencia').max(1000),
    availability: z.string().trim().min(3, 'Indica tu disponibilidad').max(300),
    work_zones: z.string().trim().min(3, 'Indica zonas donde puedes trabajar').max(300),
    observations: optionalText(1000),
    class_modality: z.enum(PESKIDS_CLASS_MODALITIES).optional().default('llanogrande'),
    neighborhood: optionalText(80),
    grade_interested: z.enum(PESKIDS_GRADE_LEVELS).optional().default('Other'),
    ...sharedContactFields,
  })
  .transform((data) => ({
    ...data,
    lead_type: 'teacher_applicant' as const,
    service_mode: data.class_modality as PeskidsServiceMode,
    neighborhood: data.neighborhood ?? 'Por confirmar',
    grade_interested: data.grade_interested ?? 'Other',
    child_name: undefined,
    birth_date: undefined,
    company_name: undefined,
    company_nit: undefined,
    metadata: {
      intake_version: 'dynamic-intake-v1',
      experience: data.experience,
      availability: data.availability,
      work_zones: data.work_zones,
      observations: data.observations ?? null,
    } as Record<string, unknown>,
  }));

const companySchema = z
  .object({
    lead_type: z.literal('company'),
    name: personNameField, // contacto responsable
    phone: phoneRequiredField,
    company_name: z.string().trim().min(2).max(120),
    company_nit: documentNumberField,
    contact_role: z.string().trim().min(2).max(80),
    company_kind: z.enum(PESKIDS_COMPANY_KINDS, {
      message: 'Selecciona el tipo de institución',
    }),
    location: z.string().trim().min(2).max(120),
    approx_children: z.coerce.number().int().min(1).max(5000),
    need: z.string().trim().min(5).max(1000),
    class_modality: z.enum(PESKIDS_CLASS_MODALITIES).optional().default('llanogrande'),
    grade_interested: z.enum(PESKIDS_GRADE_LEVELS).optional().default('Other'),
    ...sharedContactFields,
  })
  .transform((data) => ({
    ...data,
    lead_type: 'company' as const,
    service_mode: 'institutional' as const,
    neighborhood: data.location,
    grade_interested: data.grade_interested ?? 'Other',
    child_name: undefined,
    birth_date: undefined,
    document_type: undefined,
    document_number: undefined,
    metadata: {
      intake_version: 'dynamic-intake-v1',
      contact_role: data.contact_role,
      company_kind: data.company_kind,
      approx_children: data.approx_children,
      need: data.need,
      location: data.location,
    } as Record<string, unknown>,
  }));

/**
 * Legacy family-only payload (no lead_type) — keeps current landing / tests working.
 */
const legacyFamilySchema = z
  .object({
    lead_type: z.undefined().optional(),
    name: personNameField,
    phone: phoneRequiredField,
    class_modality: z.enum(PESKIDS_CLASS_MODALITIES, {
      message: 'Selecciona una modalidad de clase',
    }),
    neighborhood: z.string().trim().min(2).max(80),
    grade_interested: z.enum(PESKIDS_GRADE_LEVELS, {
      message: 'Selecciona el rango de edad',
    }),
    child_name: optionalText(80),
    birth_date: optionalText(10),
    document_type: optionalText(30),
    document_number: optionalText(40),
    company_name: optionalText(120),
    company_nit: optionalText(40),
    ...sharedContactFields,
  })
  .transform((data) => ({
    ...data,
    lead_type: 'family' as const,
    service_mode: data.class_modality as PeskidsServiceMode,
    neighborhood:
      data.class_modality === 'llanogrande'
        ? data.neighborhood?.trim() || 'Llanogrande'
        : data.neighborhood,
    metadata: { intake_version: 'legacy-family-v1' } as Record<string, unknown>,
  }));

/** Client form — discriminated by lead_type (legacy without lead_type still works). */
export const leadCaptureFormSchema = z.union([
  familySchema,
  teacherSchema,
  companySchema,
  legacyFamilySchema,
]);

export type LeadCaptureFormInput = z.infer<typeof leadCaptureFormSchema>;

const consentSchema = z.object({
  consent_treatment: z.literal(true, {
    message: 'Debes autorizar el tratamiento de datos',
  }),
  consent_marketing: z.boolean().optional().default(false),
  consent_policy_version: z.string().min(1).optional(),
  referral_code: z.string().trim().optional(),
  source: z.string().trim().optional(),
  campaign: z.string().trim().optional(),
});

export type LeadApiPostInput = LeadCaptureFormInput & z.infer<typeof consentSchema>;

/** POST /api/leads — form intake + consent (Ley 1581). */
export const leadApiPostSchema = {
  safeParse(raw: unknown):
    | { success: true; data: LeadApiPostInput }
    | { success: false; error: z.ZodError } {
    const consent = consentSchema.safeParse(raw);
    if (!consent.success) return consent;
    const form = leadCaptureFormSchema.safeParse(raw);
    if (!form.success) return form;
    return { success: true, data: { ...form.data, ...consent.data } };
  },
  parse(raw: unknown): LeadApiPostInput {
    const result = this.safeParse(raw);
    if (!result.success) throw result.error;
    return result.data;
  },
};

/** Service layer / canonical API — uses `full_name`. */
export const createLeadSchema = z
  .object({
    full_name: personNameField,
    email: emailField,
    phone: phoneOptionalField,
    lead_type: z.enum(PESKIDS_LEAD_TYPES).optional().default('family'),
    service_mode: z.enum(PESKIDS_SERVICE_MODES).optional(),
    class_modality: z.enum(PESKIDS_CLASS_MODALITIES),
    neighborhood: z.string().trim().min(2).max(80),
    grade_interested: z.enum(PESKIDS_GRADE_LEVELS),
    child_name: optionalText(80),
    birth_date: optionalText(10),
    document_type: optionalText(30),
    document_number: optionalText(40),
    company_name: optionalText(120),
    company_nit: optionalText(40),
    metadata: z.record(z.string(), z.unknown()).optional(),
    referral_source: optionalReferralSource,
    referred_by_code: optionalReferralCode,
    source: z.enum(PESKIDS_LEAD_SOURCES).default('web'),
    status: z
      .enum(['new', 'contacted', 'qualified', 'lost', 'converted'])
      .optional()
      .default('new'),
    referral_code: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    service_mode:
      data.service_mode ??
      (data.lead_type === 'company' ? 'institutional' : data.class_modality),
  }));

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const gohighlevelLeadIntakeSchema = z.object({
  parent_name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[0-9+\-().\s]*$/, 'Invalid phone'),
  email: z.string().trim().email('Valid email required'),
  child_name: z.string().trim().min(2).max(100),
  age: z.coerce.number().int().min(3).max(18),
  interest: z.string().trim().min(2).max(80),
});

export type GoHighLevelLeadIntakeInput = z.infer<typeof gohighlevelLeadIntakeSchema>;

export const leadFieldMap: Record<string, string> = {
  name: 'full_name',
  full_name: 'full_name',
  email: 'email',
  phone: 'phone',
  lead_type: 'lead_type',
  service_mode: 'service_mode',
  class_modality: 'class_modality',
  neighborhood: 'neighborhood',
  grade_interested: 'grade_interested',
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
    child_name: 'child_name' in form ? form.child_name : undefined,
    birth_date: 'birth_date' in form ? form.birth_date : undefined,
    document_type: 'document_type' in form ? form.document_type : undefined,
    document_number: 'document_number' in form ? form.document_number : undefined,
    company_name: 'company_name' in form ? form.company_name : undefined,
    company_nit: 'company_nit' in form ? form.company_nit : undefined,
    metadata: form.metadata,
    referral_source: form.referral_source,
    referred_by_code: form.referred_by_code,
    source: options?.source ?? 'web',
  });
}
