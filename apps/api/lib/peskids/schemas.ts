import { z } from 'zod';
import { REQUEST_BODY_LIMITS } from '../constants';
import {
  PESKIDS_CLASS_MODALITY_VALUES,
  PESKIDS_GRADE_VALUES,
  PESKIDS_LEAD_TYPES,
  PESKIDS_REFERRAL_SOURCES,
  PESKIDS_SERVICE_MODES,
  PESKIDS_TENANT_SLUG,
} from './constants';

/** Metadata acotada: evita blobs arbitrarios en leads/consent. */
export const boundedStringMetadataSchema = z
  .record(
    z.string().trim().min(1).max(REQUEST_BODY_LIMITS.METADATA_KEY_MAX_LEN),
    z.union([
      z.string().max(REQUEST_BODY_LIMITS.METADATA_STRING_MAX_LEN),
      z.number(),
      z.boolean(),
      z.null(),
    ])
  )
  .refine((value) => Object.keys(value).length <= REQUEST_BODY_LIMITS.METADATA_MAX_KEYS, {
    message: `metadata must have at most ${REQUEST_BODY_LIMITS.METADATA_MAX_KEYS} keys`,
  });

const nameField = z
  .string()
  .trim()
  .min(2, 'name must be at least 2 characters')
  .max(50, 'name must be at most 50 characters')
  .regex(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/, 'name contains invalid characters');

const emailField = z.string().trim().email('invalid email');

const phoneField = z
  .string()
  .trim()
  .max(20)
  .regex(/^[0-9+\-().\s]*$/, 'invalid phone')
  .optional()
  .or(z.literal(''));

const optionalTextField = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalDocumentField = optionalTextField(40).refine(
  (value) => value === undefined || /^[a-zA-Z0-9.\-\s]+$/.test(value),
  { message: 'document contains invalid characters' }
);

export const peskidsLeadBodySchema = z
  .object({
    tenant_slug: z.literal(PESKIDS_TENANT_SLUG).optional().default(PESKIDS_TENANT_SLUG),
    name: nameField,
    email: emailField,
    phone: phoneField,
    lead_type: z.enum(PESKIDS_LEAD_TYPES).optional().default('family'),
    service_mode: z.enum(PESKIDS_SERVICE_MODES).optional(),
    class_modality: z.enum(PESKIDS_CLASS_MODALITY_VALUES),
    neighborhood: optionalTextField(80),
    grade_interested: z.enum(PESKIDS_GRADE_VALUES),
    child_name: optionalTextField(80),
    birth_date: optionalTextField(10).refine(
      (value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value),
      { message: 'birth_date must use YYYY-MM-DD' }
    ),
    document_type: optionalTextField(30),
    document_number: optionalDocumentField,
    company_name: optionalTextField(120),
    company_nit: optionalDocumentField,
    metadata: boundedStringMetadataSchema.optional(),
    referral_source: z.enum(PESKIDS_REFERRAL_SOURCES).optional(),
    ghl_contact_id: z.string().trim().min(1).max(120).optional(),
    twenty_person_id: z.string().trim().min(1).max(120).optional(),
    twenty_opportunity_id: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.lead_type === 'family' && data.class_modality === 'domicilio' && !data.neighborhood) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['neighborhood'],
        message: 'neighborhood is required for domicilio family leads',
      });
    }
    if (data.lead_type === 'company' && !data.company_nit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['company_nit'],
        message: 'company_nit is required for company leads',
      });
    }
  })
  .transform((data) => ({
    ...data,
    neighborhood:
      data.class_modality === 'llanogrande' && data.lead_type === 'family'
        ? (data.neighborhood ?? 'Llanogrande')
        : (data.neighborhood ?? 'Por confirmar'),
    service_mode:
      data.service_mode ?? (data.lead_type === 'company' ? 'institutional' : data.class_modality),
  }));

export const peskidsFeedbackBodySchema = z.object({
  tenant_slug: z.literal(PESKIDS_TENANT_SLUG).optional().default(PESKIDS_TENANT_SLUG),
  child_name: nameField,
  satisfaction: z.coerce.number().int().min(1).max(5),
  suggestion: z.string().trim().max(500).optional(),
  contact_me_back: z.boolean().optional().default(false),
});

export const peskidsMessageApprovalSchema = z.object({
  approved: z.boolean(),
  modified_response: z.string().trim().max(2000).optional(),
  rejection_reason: z.string().trim().max(500).optional(),
});

/** POST público de form submissions — no confiar en userId del cliente. */
export const peskidsFormSubmissionBodySchema = z
  .object({
    submissionData: z
      .record(
        z.string().trim().min(1).max(REQUEST_BODY_LIMITS.FORM_FIELD_KEY_MAX_LEN),
        z.union([
          z.string().max(REQUEST_BODY_LIMITS.FORM_FIELD_VALUE_MAX_LEN),
          z.number(),
          z.boolean(),
          z.null(),
        ])
      )
      .refine(
        (value) => Object.keys(value).length <= REQUEST_BODY_LIMITS.FORM_SUBMISSION_MAX_FIELDS,
        {
          message: `submissionData must have at most ${REQUEST_BODY_LIMITS.FORM_SUBMISSION_MAX_FIELDS} fields`,
        }
      ),
    email: z.string().trim().email().max(254).optional(),
    /** Ignorado a propósito (no es identidad confiable). */
    userId: z.unknown().optional(),
  })
  .transform((data) => ({
    submissionData: data.submissionData,
    email: data.email,
  }));

export type PeskidsMessageApprovalBody = z.infer<typeof peskidsMessageApprovalSchema>;

export type PeskidsLeadBody = z.infer<typeof peskidsLeadBodySchema>;
export type PeskidsFeedbackBody = z.infer<typeof peskidsFeedbackBodySchema>;
export type PeskidsFormSubmissionBody = z.infer<typeof peskidsFormSubmissionBodySchema>;
