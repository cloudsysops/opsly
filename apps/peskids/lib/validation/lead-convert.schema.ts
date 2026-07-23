import { z } from 'zod';
import { PESKIDS_CLASS_MODALITY_OPTIONS } from '@/lib/lead-modality';

const modalityValues = PESKIDS_CLASS_MODALITY_OPTIONS.map((option) => option.value) as [
  (typeof PESKIDS_CLASS_MODALITY_OPTIONS)[number]['value'],
  ...(typeof PESKIDS_CLASS_MODALITY_OPTIONS)[number]['value'][],
];

/**
 * Body for POST /api/admin/leads/[id]/convert (PR-PRO-9).
 * Empty body remains valid for the legacy one-click convert.
 */
export const leadConvertSchema = z.object({
  child_name: z.string().trim().min(2).max(120).optional(),
  grade: z.string().trim().min(1).max(40).optional(),
  parent_email: z.string().trim().email().optional(),
  parent_phone: z.string().trim().min(7).max(30).optional().nullable(),
  program: z.string().trim().min(1).max(80).optional(),
  class_modality: z.enum(modalityValues).optional().nullable(),
  class_id: z.string().uuid().optional().nullable(),
  teacher_name: z.string().trim().max(120).optional().nullable(),
  schedule_label: z.string().trim().max(160).optional().nullable(),
  enrollment_date: z.string().date().optional(),
  enrollment_status: z.enum(['active', 'inactive']).optional(),
  consent_confirmed: z.boolean().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
  /** When true, skip soft duplicate warnings and force create (still blocks source_lead_id dup). */
  force: z.boolean().optional(),
});

export type LeadConvertInput = z.infer<typeof leadConvertSchema>;
