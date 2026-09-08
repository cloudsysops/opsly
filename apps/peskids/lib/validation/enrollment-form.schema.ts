import { z } from 'zod';
import { PESKIDS_CLASS_MODALITIES } from '@/lib/validation/lead.schema';

const personName = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/);

const phone = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[0-9+\-().\s]+$/);

/**
 * Canonical secure enrollment form.
 * Collects only required information. No extra child PII
 * (no document number, no medical/psychological fields).
 */
export const peskidsEnrollmentFormSchema = z
  .object({
    lead_id: z.string().trim().min(1),
    request_id: z.string().trim().min(1).optional(),
    source: z.string().trim().min(1).optional(),
    campaign: z.string().trim().max(80).optional(),
    guardian: z.object({
      name: personName,
      email: z.string().trim().email(),
      phone,
    }),
    student: z.object({
      first_name: personName,
      grade: z.string().trim().min(1).max(20),
    }),
    program: z.object({
      modality: z.enum(PESKIDS_CLASS_MODALITIES),
      unit: z.string().trim().min(1).max(80).optional(),
      interest: z.string().trim().min(2).max(80),
    }),
    operational: z.object({
      preferred_schedule: z.string().trim().max(80).optional(),
    }),
    consents: z.object({
      enrollment_confirmed: z.literal(true),
      privacy_accepted: z.literal(true),
    }),
  })
  .strict();

export type PeskidsEnrollmentForm = z.infer<typeof peskidsEnrollmentFormSchema>;
