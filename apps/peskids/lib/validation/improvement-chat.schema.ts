import { z } from 'zod';

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(180),
  mime_type: z
    .string()
    .trim()
    .regex(/^(image\/(jpeg|png|webp|gif)|application\/pdf)$/i, 'Solo imágenes o PDF'),
  size_bytes: z.number().int().positive().max(2_500_000),
  content_base64: z.string().min(8).max(3_500_000),
});

export const createImprovementMessageSchema = z
  .object({
    body: z
      .string()
      .trim()
      .max(4000, 'El mensaje no puede superar 4000 caracteres')
      .optional()
      .default(''),
    attachments: z.array(attachmentSchema).max(4).optional().default([]),
  })
  .superRefine((value, ctx) => {
    const body = value.body.trim();
    const attachments = value.attachments ?? [];
    if (body.length < 3 && attachments.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Escribe un mensaje o adjunta al menos un archivo (foto, PDF o captura de chat)',
        path: ['body'],
      });
    }
  });

export type CreateImprovementMessageInput = z.infer<typeof createImprovementMessageSchema>;
export type ImprovementAttachmentInput = z.infer<typeof attachmentSchema>;

const changeRequestStatusSchema = z.enum([
  'new',
  'analyzed',
  'task_created',
  'triaged',
  'approved',
  'in_progress',
  'shipped',
  'rejected',
  'dismissed',
]);

const changeRequestCategorySchema = z.enum([
  'bug',
  'feature',
  'improvement',
  'security',
  'billing',
  'question',
  'other',
]);

const changeRequestPrioritySchema = z.enum(['alta', 'media', 'baja']);

/** Query filters for GET /api/admin/change-requests */
export const listChangeRequestsQuerySchema = z.object({
  status: changeRequestStatusSchema.optional(),
  priority: changeRequestPrioritySchema.optional(),
  category: changeRequestCategorySchema.optional(),
});

/**
 * PATCH body for operator triage. Status changes never auto-execute work —
 * they only update DB fields for human/agent handoff later.
 */
export const patchChangeRequestSchema = z
  .object({
    status: changeRequestStatusSchema.optional(),
    operator_notes: z.string().trim().max(4000).nullable().optional(),
    linked_pr: z.string().trim().max(500).nullable().optional(),
    linked_issue: z.string().trim().max(500).nullable().optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.operator_notes !== undefined ||
      value.linked_pr !== undefined ||
      value.linked_issue !== undefined,
    { message: 'Provide at least one field to update' }
  );

export type ListChangeRequestsQuery = z.infer<typeof listChangeRequestsQuerySchema>;
export type PatchChangeRequestInput = z.infer<typeof patchChangeRequestSchema>;

export const studentImportRowSchema = z.object({
  name: z.string().trim().min(2).max(120),
  grade: z.string().trim().min(1).max(40).default('Por confirmar'),
  parent_email: z.string().trim().email().optional(),
  parent_phone: z.string().trim().min(7).max(20).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const studentImportBodySchema = z.object({
  rows: z.array(studentImportRowSchema).min(1).max(500),
  dry_run: z.boolean().optional().default(false),
});

export const staffImportRowSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(120),
  role: z.enum(['admin', 'support', 'teacher']).default('teacher'),
});

export const staffImportBodySchema = z.object({
  rows: z.array(staffImportRowSchema).min(1).max(100),
  dry_run: z.boolean().optional().default(false),
});
