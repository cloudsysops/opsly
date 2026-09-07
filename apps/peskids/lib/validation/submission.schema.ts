import { z } from 'zod';

export const createSubmissionSchema = z.object({
  formId: z.string().trim().min(1, 'formId es requerido'),
  data: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0, {
    message: 'data no puede estar vacío',
  }),
}).strict();

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

export const gradeSubmissionSchema = z.object({
  score: z.coerce
    .number()
    .min(0, 'La calificación no puede ser negativa')
    .max(100, 'La calificación máxima es 100'),
  feedback: z.string().trim().min(1).max(2000).optional(),
}).strict();

export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
