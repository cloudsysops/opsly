import { z } from 'zod';

const PERSON_NAME_PATTERN = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/;

const childNameField = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(50, 'El nombre no puede superar 50 caracteres')
  .regex(PERSON_NAME_PATTERN, 'Usa solo letras, espacios o guiones');

const satisfactionField = z.coerce
  .number()
  .int('La calificación debe ser un número entero')
  .min(1, 'Selecciona una calificación de 1 a 5')
  .max(5, 'Selecciona una calificación de 1 a 5');

const suggestionField = z
  .string()
  .trim()
  .max(500, 'La sugerencia no puede superar 500 caracteres')
  .optional()
  .transform((value) => (value === undefined || value.length === 0 ? undefined : value));

/** Sprint 01 Form 2 — parent/guardian feedback (rating + optional comment). */
export const parentFeedbackFormSchema = z.object({
  child_name: childNameField,
  satisfaction: satisfactionField,
  suggestion: suggestionField,
  contact_me_back: z.boolean().optional().default(false),
  parent_email: z.string().trim().email('Correo inválido').optional(),
});

export type ParentFeedbackFormInput = z.infer<typeof parentFeedbackFormSchema>;

/** Alert admin when satisfaction is below 3 (Sprint 01 rule). */
export function isLowSatisfactionRating(rating: number): boolean {
  return Number.isInteger(rating) && rating > 0 && rating < 3;
}

/** Extended schema for staff/teacher composer (maps to POST /api/feedback). */
export const feedbackSchema = z.object({
  child_name: childNameField.optional(),
  student_name: childNameField.optional(),
  name: childNameField.optional(),
  body: z.string().min(2).max(1200).optional(),
  suggestion: z.string().min(2).max(1200).optional(),
  feedback: z.string().min(2).max(1200).optional(),
  notes: z.string().min(2).max(1200).optional(),
  rating: satisfactionField.optional(),
  satisfaction: satisfactionField.optional(),
  author_type: z.enum(['parent', 'teacher', 'staff']).default('parent'),
  subject_type: z.enum(['general', 'class', 'student', 'operations']).default('student'),
  visibility: z.enum(['public', 'private']).optional(),
  audience: z.enum(['family', 'teacher', 'admin']).optional(),
  status: z.enum(['new', 'reviewed', 'action_required', 'closed']).default('new'),
  contact_wanted: z.boolean().default(false),
  parent_email: z.string().email().nullable().optional(),
  author_ref_id: z.string().uuid().nullable().optional(),
  subject_ref_id: z.string().uuid().nullable().optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

/** Normalize parent form to API payload fields. */
export function toFeedbackApiPayload(form: ParentFeedbackFormInput): {
  child_name: string;
  satisfaction: number;
  suggestion?: string;
  contact_wanted: boolean;
  parent_email?: string;
} {
  return {
    child_name: form.child_name,
    satisfaction: form.satisfaction,
    suggestion: form.suggestion,
    contact_wanted: form.contact_me_back,
    parent_email: form.parent_email,
  };
}
