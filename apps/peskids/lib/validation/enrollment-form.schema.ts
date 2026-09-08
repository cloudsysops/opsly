import { z } from 'zod';
import { PESKIDS_CLASS_MODALITIES, PESKIDS_GRADE_LEVELS } from '@/lib/validation/lead.schema';

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
 * Public secure enrollment form. Lead identity comes from the opaque token,
 * never from `lead_id` / `student_id` / `family_id` in the body or URL.
 */
export const peskidsEnrollmentFormSchema = z
  .object({
    request_id: z.string().trim().min(1).max(80).optional(),
    guardian: z.object({
      first_name: personName,
      last_name: personName,
      email: z.string().trim().email(),
      phone,
    }),
    student: z.object({
      first_name: personName,
      age_range: z.enum(PESKIDS_GRADE_LEVELS),
    }),
    program: z.object({
      modality: z.enum(PESKIDS_CLASS_MODALITIES),
      unit: z.string().trim().min(1).max(80).optional(),
      interest: z.string().trim().min(2).max(80).optional(),
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
