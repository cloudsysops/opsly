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
